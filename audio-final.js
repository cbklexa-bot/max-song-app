const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const originalListen = express.application.listen;

const CACHE_ROOT = fs.existsSync('/data') ? '/data' : '/tmp';
const CACHE_DIR = path.join(CACHE_ROOT, 'max-song-audio-cache');
const AUDIO_HOST = 's.bmnmny.cn';
const inflight = new Map();
const FINAL_ROUTES_INSTALLED = Symbol('maxAudioFinalRoutesInstalled');

try {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
} catch (error) {
  console.error('[AUDIO FINAL] cache init:', error.message);
}

console.log('[AUDIO FINAL] loaded; cache:', CACHE_DIR);

function allowedUrl(raw) {
  const url = new URL(String(raw || '').trim());
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== AUDIO_HOST) {
    throw new Error('Audio host is not allowed');
  }
  return url.toString();
}

function cachePath(url) {
  return path.join(
    CACHE_DIR,
    crypto.createHash('sha256').update(url).digest('hex') + '.m4a'
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createDownloadState(url) {
  const file = cachePath(url);
  if (fs.existsSync(file)) return Promise.resolve({ ready: true, file });
  if (inflight.has(url)) return inflight.get(url);

  const promise = (async () => {
    const tmp = file + '.part';
    let lastError;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        try { fs.unlinkSync(tmp); } catch (_) {}

        console.log('[AUDIO UPSTREAM] start', attempt, url);
        const response = await axios.get(url, {
          responseType: 'stream',
          timeout: 180000,
          maxRedirects: 5,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          headers: {
            Accept: '*/*',
            'User-Agent': 'Mozilla/5.0',
            'Accept-Encoding': 'identity',
            Connection: 'keep-alive'
          },
          validateStatus: (status) => status >= 200 && status < 400
        });

        const state = {
          file,
          tmp,
          response,
          headers: response.headers || {},
          started: false,
          liveResponse: null,
          cachePromise: null
        };

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

          response.data.once('error', fail);
          output.once('error', fail);
          output.once('finish', () => {
            if (settled) return;
            try {
              fs.renameSync(tmp, file);
              settled = true;
              console.log('[AUDIO CACHE] ready', url);
              resolve(file);
            } catch (error) {
              fail(error);
            }
          });
        });

        return state;
      } catch (error) {
        lastError = error;
        console.error('[AUDIO UPSTREAM] failed', attempt, error.code || error.message);
        try { fs.unlinkSync(tmp); } catch (_) {}
        if (attempt < 3) await sleep(attempt * 1500);
      }
    }

    throw lastError || new Error('Audio download failed');
  })();

  inflight.set(url, promise);
  promise.catch(() => {
    if (inflight.get(url) === promise) inflight.delete(url);
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
    if (!match) {
      return res.status(416).setHeader('Content-Range', `bytes */${size}`).end();
    }

    if (match[1] === '') {
      const suffix = Number(match[2]);
      if (!Number.isFinite(suffix) || suffix <= 0) {
        return res.status(416).setHeader('Content-Range', `bytes */${size}`).end();
      }
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
  if (attachment) {
    res.setHeader('Content-Disposition', 'attachment; filename="song.m4a"');
  }

  const stream = fs.createReadStream(file, { start, end });
  stream.once('error', (error) => {
    console.error('[AUDIO FILE STREAM]', error.message);
    if (!res.headersSent) res.status(500).end();
    else res.destroy();
  });
  stream.pipe(res);
}

async function serveLivePreview(req, res, state, url) {
  const upstream = state.response;
  if (!upstream?.data) throw new Error('Audio upstream unavailable');

  if (state.started) {
    await state.cachePromise;
    if (inflight.get(url)) inflight.delete(url);
    return serveFile(req, res, state.file, false);
  }

  state.started = true;
  state.liveResponse = res;

  const headers = state.headers || {};
  res.status(200);
  res.setHeader('Content-Type', 'audio/mp4');
  if (headers['content-length']) {
    res.setHeader('Content-Length', headers['content-length']);
  }
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  const output = fs.createWriteStream(state.tmp, { flags: 'w' });
  const tee = upstream.data;

  tee.once('end', () => {
    if (!res.writableEnded && !res.destroyed) res.end();
    if (inflight.get(url)) inflight.delete(url);
  });

  // Start both destinations only after the first MAX client is attached.
  tee.pipe(output);
  tee.pipe(res);
  tee.resume();

  res.once('close', () => {
    // Never destroy the upstream stream here: the cache must finish even if MAX
    // closes or replaces its media request while loading.
  });
}

async function serveAudio(req, res, url) {
  const file = cachePath(url);
  if (fs.existsSync(file)) {
    console.log('[AUDIO CACHE] hit', url);
    return serveFile(req, res, file, false);
  }

  const state = await createDownloadState(url);

  if (state.ready && fs.existsSync(file)) {
    console.log('[AUDIO CACHE] hit-after-start', url);
    return serveFile(req, res, file, false);
  }

  // Range requests are served from the completed cache. The first request from
  // MAX is normally non-range; this avoids trying to synthesize random access
  // against a still-growing remote file.
  if (req.headers.range) {
    await state.cachePromise;
    if (inflight.get(url)) inflight.delete(url);
    return serveFile(req, res, file, false);
  }

  return serveLivePreview(req, res, state, url);
}

async function downloadToCache(url) {
  const file = cachePath(url);
  if (fs.existsSync(file)) return file;
  const state = await createDownloadState(url);
  if (state.ready && fs.existsSync(file)) return file;
  await state.cachePromise;
  if (inflight.get(url)) inflight.delete(url);
  return file;
}

function installFinalRoutes(app) {
  if (app[FINAL_ROUTES_INSTALLED]) return;

  if (app._router?.stack) {
    const before = app._router.stack.length;
    app._router.stack = app._router.stack.filter((layer) => {
      const routePath = layer?.route?.path;
      return routePath !== '/api/audio' && routePath !== '/api/download';
    });
    const removed = before - app._router.stack.length;
    if (removed) console.log('[AUDIO FINAL] removed old audio routes:', removed);
  }

  app.route('/api/audio').get(async (req, res) => {
    try {
      const url = allowedUrl(req.query.url);
      await serveAudio(req, res, url);
    } catch (error) {
      console.error('[GET /api/audio FINAL]', error.code || error.message);
      if (!res.headersSent) res.status(502).send('Не удалось загрузить аудиофайл');
      else res.end();
    }
  });

  app.route('/api/download').get(async (req, res) => {
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

  app[FINAL_ROUTES_INSTALLED] = true;
  console.log('[AUDIO FINAL] routes installed');
}

express.application.listen = function finalAudioListen(...args) {
  installFinalRoutes(this);
  return originalListen.apply(this, args);
};
