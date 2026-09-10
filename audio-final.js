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

        response.data.pause();

        const state = {
          file,
          tmp,
          response,
          headers: response.headers || {},
          started: false,
          liveResponse: null,
          output: null,
          cachePromise: null,
          resolveCache: null,
          rejectCache: null,
          cacheSettled: false
        };

        state.start = (liveResponse) => {
          if (state.started) return;
          state.started = true;
          state.liveResponse = liveResponse || null;

          state.output = fs.createWriteStream(state.tmp);
          state.cachePromise = new Promise((resolve, reject) => {
            state.resolveCache = resolve;
            state.rejectCache = reject;
          });

          const fail = (error) => {
            if (state.cacheSettled) return;
            state.cacheSettled = true;
            console.error('[AUDIO STREAM] failed', error.code || error.message);
            try { state.output.destroy(); } catch (_) {}
            try { response.data.destroy(); } catch (_) {}
            try { fs.unlinkSync(state.tmp); } catch (_) {}
            if (state.liveResponse && !state.liveResponse.writableEnded && !state.liveResponse.destroyed) {
              state.liveResponse.end();
            }
            state.rejectCache(error);
          };

          response.data.on('data', (chunk) => {
            if (state.cacheSettled) return;

            if (!state.output.write(chunk)) {
              response.data.pause();
              state.output.once('drain', () => response.data.resume());
            }

            if (state.liveResponse && !state.liveResponse.destroyed && !state.liveResponse.writableEnded) {
              state.liveResponse.write(chunk);
            }
          });

          response.data.once('error', fail);
          state.output.once('error', fail);

          response.data.once('end', () => {
            if (state.cacheSettled) return;
            state.output.end();
            if (state.liveResponse && !state.liveResponse.destroyed && !state.liveResponse.writableEnded) {
              state.liveResponse.end();
            }
          });

          state.output.once('finish', () => {
            if (state.cacheSettled) return;
            try {
              fs.renameSync(state.tmp, state.file);
              state.cacheSettled = true;
              console.log('[AUDIO CACHE] ready', url);
              state.resolveCache(state.file);
              if (inflight.get(url) === promise) inflight.delete(url);
            } catch (error) {
              fail(error);
            }
          });

          response.data.resume();
        };

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
    else if (!res.destroyed) res.destroy();
  });
  stream.pipe(res);
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

  if (req.headers.range) {
    state.start(null);
    await state.cachePromise;
    return serveFile(req, res, file, false);
  }

  const headers = state.headers || {};
  res.status(200);
  res.setHeader('Content-Type', 'audio/mp4');
  if (headers['content-length']) {
    res.setHeader('Content-Length', headers['content-length']);
  }
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  state.start(res);
  return state.cachePromise.catch((error) => {
    if (!res.headersSent) res.status(502).end();
    throw error;
  });
}

async function downloadToCache(url) {
  const file = cachePath(url);
  if (fs.existsSync(file)) return file;

  const state = await createDownloadState(url);
  if (state.ready && fs.existsSync(file)) return file;

  state.start(null);
  await state.cachePromise;
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
    console.log('[AUDIO FINAL] removed old audio routes:', removed);
  }

  app.route('/api/audio').get(async (req, res) => {
    try {
      const url = allowedUrl(req.query.url);
      await serveAudio(req, res, url);
    } catch (error) {
      console.error('[GET /api/audio FINAL]', error.code || error.message);
      if (!res.headersSent) res.status(502).send('Не удалось загрузить аудиофайл');
      else if (!res.writableEnded && !res.destroyed) res.end();
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
      else if (!res.writableEnded && !res.destroyed) res.end();
    }
  });

  app[FINAL_ROUTES_INSTALLED] = true;
  console.log('[AUDIO FINAL] routes installed');
}

express.application.listen = function finalAudioListen(...args) {
  installFinalRoutes(this);
  return originalListen.apply(this, args);
};
