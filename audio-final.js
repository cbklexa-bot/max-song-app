const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const originalGet = express.application.get;

const CACHE_ROOT = fs.existsSync('/data') ? '/data' : '/tmp';
const CACHE_DIR = path.join(CACHE_ROOT, 'max-song-audio-cache');
const AUDIO_HOST = 's.bmnmny.cn';
const inflight = new Map();

try { fs.mkdirSync(CACHE_DIR, { recursive: true }); } catch (error) {
  console.error('[AUDIO FINAL] cache init:', error.message);
}
console.log('[AUDIO FINAL] cache:', CACHE_DIR);

function allowedUrl(raw) {
  const url = new URL(String(raw || '').trim());
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== AUDIO_HOST) {
    throw new Error('Audio host is not allowed');
  }
  return url.toString();
}

function cachePath(url) {
  return path.join(CACHE_DIR, crypto.createHash('sha256').update(url).digest('hex') + '.m4a');
}

function startSharedDownload(url) {
  const file = cachePath(url);
  if (fs.existsSync(file)) return Promise.resolve({ ready: true, file });
  if (inflight.has(url)) return inflight.get(url);

  const state = {
    url,
    file,
    response: null,
    headers: null,
    liveAttached: false,
    cachePromise: null
  };

  const promise = (async () => {
    const tmp = file + '.part';
    let lastError;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        try { fs.unlinkSync(tmp); } catch (_) {}
        console.log('[AUDIO CACHE] upstream', attempt, url);

        const response = await axios.get(url, {
          responseType: 'stream',
          timeout: 120000,
          maxRedirects: 5,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          headers: {
            Accept: '*/*',
            'User-Agent': 'Mozilla/5.0',
            'Accept-Encoding': 'identity'
          },
          validateStatus: (status) => status >= 200 && status < 400
        });

        state.response = response;
        state.headers = response.headers || {};
        response.data.pause();

        const output = fs.createWriteStream(tmp);
        state.cachePromise = new Promise((resolve, reject) => {
          let settled = false;
          const fail = (error) => {
            if (settled) return;
            settled = true;
            try { output.destroy(); } catch (_) {}
            try { response.data.destroy(); } catch (_) {}
            try { fs.unlinkSync(tmp); } catch (_) {}
            reject(error);
          };

          response.data.on('error', fail);
          output.on('error', fail);
          output.on('finish', () => {
            if (settled) return;
            try {
              fs.renameSync(tmp, file);
              settled = true;
              console.log('[AUDIO CACHE] ready', file);
              resolve(file);
            } catch (error) {
              fail(error);
            }
          });
        });

        // Start writing the permanent copy immediately. The first MAX request
        // can consume the same upstream stream without starting another CDN fetch.
        response.data.pipe(output);
        response.data.resume();
        return state;
      } catch (error) {
        lastError = error;
        console.error('[AUDIO CACHE] attempt failed:', error.code || error.message);
        try { fs.unlinkSync(tmp); } catch (_) {}
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
      }
    }

    throw lastError || new Error('Audio download failed');
  })();

  inflight.set(url, promise);
  promise.catch(() => {}).finally(() => {
    if (inflight.get(url) === promise && !state.cachePromise) inflight.delete(url);
  });
  return promise;
}

async function serveFile(req, res, file, attachment) {
  const stat = await fs.promises.stat(file);
  const size = stat.size;
  if (!size) return res.status(502).send('Аудиофайл пуст');

  const range = String(req.headers.range || '').trim();
  let start = 0;
  let end = size - 1;

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/i.exec(range);
    if (!match) return res.status(416).setHeader('Content-Range', `bytes */${size}`).end();

    if (match[1] === '') {
      const suffix = Number(match[2]);
      if (!Number.isFinite(suffix) || suffix <= 0) return res.status(416).setHeader('Content-Range', `bytes */${size}`).end();
      start = Math.max(0, size - suffix);
    } else {
      start = Number(match[1]);
      end = match[2] === '' ? size - 1 : Number(match[2]);
    }

    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= size || end < start) {
      return res.status(416).setHeader('Content-Range', `bytes */${size}`).end();
    }

    end = Math.min(end, size - 1);
    res.status(206).setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
  } else {
    res.status(200);
  }

  res.setHeader('Content-Type', 'audio/mp4');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Length', String(end - start + 1));
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  if (attachment) res.setHeader('Content-Disposition', 'attachment; filename="song.m4a"');

  const stream = fs.createReadStream(file, { start, end });
  stream.on('error', (error) => {
    console.error('[AUDIO FILE STREAM]', error.message);
    if (!res.headersSent) res.status(500).end();
  });
  stream.pipe(res);
}

async function serveAudio(req, res, url) {
  const file = cachePath(url);
  if (fs.existsSync(file)) {
    console.log('[AUDIO CACHE] hit', url);
    return serveFile(req, res, file, false);
  }

  const state = await startSharedDownload(url);

  if (state.ready && fs.existsSync(file)) {
    console.log('[AUDIO CACHE] hit-after-start', url);
    return serveFile(req, res, file, false);
  }

  const upstream = state.response;
  if (!upstream?.data) throw new Error('Audio upstream unavailable');

  // First request streams live from the CDN while the identical stream is
  // simultaneously written to the persistent cache. Later requests wait for
  // cache completion instead of attaching to the moving upstream stream.
  if (!state.liveAttached) {
    state.liveAttached = true;
    const headers = state.headers || {};
    res.status(200);
    res.setHeader('Content-Type', 'audio/mp4');
    if (headers['content-length']) res.setHeader('Content-Length', headers['content-length']);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    upstream.data.pipe(res);
    upstream.data.resume();
    return;
  }

  await state.cachePromise;
  inflight.delete(url);
  return serveFile(req, res, file, false);
}

async function warmUrl(rawUrl) {
  try {
    await startSharedDownload(allowedUrl(rawUrl));
  } catch (error) {
    console.error('[AUDIO WARM]', error.code || error.message);
  }
}

function warmOrdersHandler(handler) {
  return function wrappedOrders(req, res, next) {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      try {
        const orders = Array.isArray(body?.orders) ? body.orders : [];
        for (const order of orders) {
          if (order?.status === 'preview') {
            warmUrl(order.audio_url);
            warmUrl(order.audio_url_2);
          }
        }
      } catch (_) {}
      return originalJson(body);
    };
    return handler(req, res, next);
  };
}

express.application.get = function finalGet(route, ...handlers) {
  if (route === '/api/audio') {
    this.route('/api/audio').get(async (req, res) => {
      try {
        const url = allowedUrl(req.query.url);
        await serveAudio(req, res, url);
      } catch (error) {
        console.error('[GET /api/audio FINAL]', error.code || error.message);
        if (!res.headersSent) res.status(502).send('Не удалось загрузить аудиофайл');
        else res.end();
      }
    });
    return this;
  }

  if (route === '/api/download') {
    this.route('/api/download').get(async (req, res) => {
      try {
        const url = allowedUrl(req.query.url);
        const file = await downloadToCache(url);
        await serveFile(req, res, file, true);
      } catch (error) {
        console.error('[GET /api/download FINAL]', error.code || error.message);
        if (!res.headersSent) res.status(500).send('Не удалось скачать файл');
        else res.end();
      }
    });
    return this;
  }

  if (route === '/api/orders' && handlers.length) {
    return originalGet.call(this, route, ...handlers.map((handler) => warmOrdersHandler(handler)));
  }

  return originalGet.call(this, route, ...handlers);
};

async function downloadToCache(url) {
  const file = cachePath(url);
  if (fs.existsSync(file)) return file;
  const state = await startSharedDownload(url);
  if (state.ready && fs.existsSync(file)) return file;
  await state.cachePromise;
  inflight.delete(url);
  return file;
}
