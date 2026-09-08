const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const originalGet = express.application.get;
const originalListen = express.application.listen;

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

async function downloadToCache(url) {
  const file = cachePath(url);
  if (fs.existsSync(file)) return file;
  if (inflight.has(url)) return inflight.get(url);

  const promise = (async () => {
    const tmp = file + '.part';
    try { fs.unlinkSync(tmp); } catch (_) {}

    let lastError;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        console.log('[AUDIO CACHE] download', attempt, url);
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

        await new Promise((resolve, reject) => {
          const output = fs.createWriteStream(tmp);
          let settled = false;
          const fail = (error) => {
            if (settled) return;
            settled = true;
            try { output.destroy(); } catch (_) {}
            try { response.data.destroy(); } catch (_) {}
            reject(error);
          };
          response.data.on('error', fail);
          output.on('error', fail);
          output.on('finish', () => {
            if (settled) return;
            settled = true;
            resolve();
          });
          response.data.pipe(output);
        });

        fs.renameSync(tmp, file);
        console.log('[AUDIO CACHE] ready', file);
        return file;
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
  promise.finally(() => {
    if (inflight.get(url) === promise) inflight.delete(url);
  }).catch(() => {});
  return promise;
}

async function sendCached(req, res, url, attachment) {
  const file = await downloadToCache(url);
  const stat = await fs.promises.stat(file);
  const size = stat.size;
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

function wrapOrdersHandler(handler) {
  return function wrappedOrders(req, res, next) {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      try {
        const orders = Array.isArray(body?.orders) ? body.orders : [];
        for (const order of orders) {
          if (order?.status === 'preview') {
            for (const url of [order.audio_url, order.audio_url_2]) {
              if (url) {
                try { downloadToCache(allowedUrl(url)).catch(() => {}); } catch (_) {}
              }
            }
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
    originalGet.call(this, '/api/audio', async (req, res) => {
      try {
        const url = allowedUrl(req.query.url);
        await sendCached(req, res, url, false);
      } catch (error) {
        console.error('[GET /api/audio FINAL]', error.code || error.message);
        if (!res.headersSent) res.status(502).send('Не удалось загрузить аудиофайл');
        else res.end();
      }
    });
    return this;
  }

  if (route === '/api/download') {
    originalGet.call(this, '/api/download', async (req, res) => {
      try {
        const url = allowedUrl(req.query.url);
        await sendCached(req, res, url, true);
      } catch (error) {
        console.error('[GET /api/download FINAL]', error.code || error.message);
        if (!res.headersSent) res.status(500).send('Не удалось скачать файл');
        else res.end();
      }
    });
    return this;
  }

  if (route === '/api/orders' && handlers.length) {
    return originalGet.call(this, route, ...handlers.map((handler) => wrapOrdersHandler(handler)));
  }

  return originalGet.call(this, route, ...handlers);
};

express.application.listen = function finalListen(...args) {
  try {
    if (this._router?.stack) {
      this._router.stack = this._router.stack.filter((layer) => {
        if (!layer.route) return true;
        const pathValue = layer.route.path;
        return pathValue !== '/api/audio' && pathValue !== '/api/download';
      });
    }
  } catch (error) {
    console.error('[AUDIO FINAL] route cleanup:', error.message);
  }
  return originalListen.apply(this, args);
};
