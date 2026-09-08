const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Compatibility and media transport layer.
// Loaded before the main server with node -r ./max-bootstrap.js server.js

const originalUse = express.application.use;
const originalGet = express.application.get;
const AUDIO_CACHE_DIR = path.join('/tmp', 'max-song-audio-cache');
const audioInflight = new Map();

try { fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true }); } catch (_) {}

function audioCachePath(url) {
  const key = crypto.createHash('sha256').update(url).digest('hex');
  return path.join(AUDIO_CACHE_DIR, key + '.m4a');
}

async function serveCachedAudio(req, res, url) {
  const file = audioCachePath(url);
  if (!fs.existsSync(file)) return false;

  const stat = await fs.promises.stat(file);
  const size = stat.size;
  const range = String(req.headers.range || '').trim();
  let start = 0;
  let end = size - 1;

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/i.exec(range);
    if (!match) {
      res.status(416).setHeader('Content-Range', `bytes */${size}`).end();
      return true;
    }

    if (match[1] === '') {
      const suffix = Number(match[2]);
      if (!Number.isFinite(suffix) || suffix <= 0) {
        res.status(416).setHeader('Content-Range', `bytes */${size}`).end();
        return true;
      }
      start = Math.max(0, size - suffix);
    } else {
      start = Number(match[1]);
      end = match[2] === '' ? size - 1 : Number(match[2]);
    }

    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= size || end < start) {
      res.status(416).setHeader('Content-Range', `bytes */${size}`).end();
      return true;
    }

    end = Math.min(end, size - 1);
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
  } else {
    res.status(200);
  }

  res.setHeader('Content-Type', 'audio/mp4');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Length', String(end - start + 1));
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  const stream = fs.createReadStream(file, { start, end });
  stream.on('error', (error) => {
    if (!res.headersSent) res.status(500).end();
  });
  stream.pipe(res);
  return true;
}

function startUpstream(url) {
  if (audioInflight.has(url)) return audioInflight.get(url);

  const file = audioCachePath(url);
  const tmp = file + '.part';
  const state = {
    ready: false,
    response: null,
    headers: null,
    error: null,
    waiters: []
  };

  const promise = (async () => {
    try {
      if (fs.existsSync(file)) {
        state.ready = true;
        return state;
      }

      try { fs.unlinkSync(tmp); } catch (_) {}

      const response = await axios.get(url, {
        responseType: 'stream',
        timeout: 0,
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

      // Pause before exposing the stream so the first request can attach.
      response.data.pause();

      const output = fs.createWriteStream(tmp);
      const cachePromise = new Promise((resolve, reject) => {
        const fail = (error) => {
          try { output.destroy(); } catch (_) {}
          try { response.data.destroy(); } catch (_) {}
          try { fs.unlinkSync(tmp); } catch (_) {}
          state.error = error;
          reject(error);
        };

        response.data.on('error', fail);
        output.on('error', fail);
        output.on('finish', () => {
          try {
            fs.renameSync(tmp, file);
            state.ready = true;
            console.log('[AUDIO CACHE] ready');
            resolve(file);
          } catch (error) {
            fail(error);
          }
        });
      });

      state.cachePromise = cachePromise;
      return state;
    } catch (error) {
      state.error = error;
      throw error;
    }
  })();

  audioInflight.set(url, promise);
  promise.finally(() => {
    // Keep the inflight entry while the cache write is in progress.
    // It is removed only when the cache is ready or the request fails.
  }).catch(() => {});
  return promise;
}

async function streamAndCache(url, req, res) {
  const file = audioCachePath(url);
  if (fs.existsSync(file)) return serveCachedAudio(req, res, url);

  let state;
  try {
    state = await startUpstream(url);
  } catch (error) {
    console.error('[GET /api/audio] upstream error:', error.code || error.message);
    if (!res.headersSent) res.status(502).send('Не удалось получить аудиофайл');
    audioInflight.delete(url);
    return true;
  }

  if (state.ready && fs.existsSync(file)) {
    audioInflight.delete(url);
    return serveCachedAudio(req, res, url);
  }

  const upstream = state.response;
  const headers = state.headers || {};
  if (!upstream?.data) {
    if (!res.headersSent) res.status(502).send('Аудиопоток недоступен');
    return true;
  }

  res.status(200);
  res.setHeader('Content-Type', 'audio/mp4');
  if (headers['content-length']) res.setHeader('Content-Length', headers['content-length']);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  // Only the first request pipes the live upstream stream to MAX.
  // Later requests wait for the completed cache, so they never share a moving stream.
  if (!state.liveStreamAttached) {
    state.liveStreamAttached = true;
    req.on('aborted', () => {});
    res.on('close', () => {});
    upstream.data.pipe(res);
    upstream.data.resume();

    state.cachePromise.finally(() => {
      if (audioInflight.get(url)?.then) audioInflight.delete(url);
    }).catch(() => {});
    return true;
  }

  try {
    await state.cachePromise;
    audioInflight.delete(url);
    if (fs.existsSync(file)) return serveCachedAudio(req, res, url);
    if (!res.headersSent) res.status(502).send('Аудиофайл не закэширован');
  } catch (error) {
    audioInflight.delete(url);
    if (!res.headersSent) res.status(502).send('Не удалось сохранить аудиофайл');
  }
  return true;
}

function installAudioProxy(app) {
  if (app.__audioProxyInstalled) return;
  app.__audioProxyInstalled = true;

  originalGet.call(app, '/api/audio', async (req, res) => {
    const rawUrl = String(req.query.url || '').trim();
    let target;

    try {
      target = new URL(rawUrl);
      if (target.protocol !== 'https:' || target.hostname.toLowerCase() !== 's.bmnmny.cn') {
        return res.status(400).send('Audio host is not allowed');
      }
    } catch (_) {
      return res.status(400).send('Invalid audio URL');
    }

    await streamAndCache(target.toString(), req, res);
  });
}

express.application.get = function patchedGet(route, ...handlers) {
  if (typeof route === 'string' && route === '/api/audio') {
    installAudioProxy(this);
    return this;
  }
  if (typeof route === 'string' && route === '/api/health') {
    installAudioProxy(this);
  }
  return originalGet.call(this, route, ...handlers);
};

express.application.use = function patchedUse(...args) {
  if (!this.__maxTransportInstalled) {
    this.__maxTransportInstalled = true;

    originalUse.call(this, (req, res, next) => {
      try {
        const rawUrl = String(req.url || '');
        const question = rawUrl.indexOf('?');

        if (question >= 0) {
          const params = new URLSearchParams(rawUrl.slice(question + 1));
          const initData = params.get('initData') || '';
          if (initData) req.headers['x-max-init-data'] = initData;
          req.originalUrl = rawUrl.slice(0, question) || '/';
        }
      } catch (_) {}
      next();
    });

    originalUse.call(this, (req, res, next) => {
      const q = req.query || {};
      if (req.method !== 'GET' && Object.keys(q).length) {
        req.body = {
          ...(req.body && typeof req.body === 'object' ? req.body : {}),
          ...q
        };
        delete req.body.initData;
      }
      next();
    });
  }

  return originalUse.apply(this, args);
};

const originalCreateHmac = crypto.createHmac.bind(crypto);
crypto.createHmac = function patchedCreateHmac(algorithm, key, ...rest) {
  const hmac = originalCreateHmac(algorithm, key, ...rest);
  if (!Buffer.isBuffer(key)) return hmac;

  const originalUpdate = hmac.update.bind(hmac);
  hmac.update = function patchedUpdate(data, inputEncoding) {
    if (typeof data === 'string' && data.includes('=') && data.includes('\n')) {
      data = data
        .split('\n')
        .map((line) => {
          const separator = line.indexOf('=');
          if (separator < 0) return line;
          const name = line.slice(0, separator);
          const value = line.slice(separator + 1);
          try { return name + '=' + decodeURIComponent(value); }
          catch (_) { return line; }
        })
        .join('\n');
    }
    return originalUpdate(data, inputEncoding);
  };

  return hmac;
};

const originalSendFile = express.response.sendFile;
express.response.sendFile = function patchedSendFile(filePath, ...args) {
  try {
    const html = fs.readFileSync(filePath, 'utf8');
    const isIndex = String(filePath || '').endsWith('/index.html') || String(filePath || '').endsWith('index.html');

    if (isIndex) {
      const lazyAudioScript = `<script>(function(){function init(){var a=[].slice.call(document.querySelectorAll('audio[data-demo="true"]'));if(!a.length)return;var first=a[0],rest=a.slice(1);rest.forEach(function(x){x.dataset.lazySrc=x.getAttribute('src')||'';x.removeAttribute('src');x.preload='none';});first.preload='metadata';rest.forEach(function(x){x.addEventListener('play',function(){if(!x.src&&x.dataset.lazySrc){x.src=x.dataset.lazySrc;x.preload='auto';try{x.play();}catch(e){}}},{once:true});});first.addEventListener('loadedmetadata',function(){rest.forEach(function(x,i){if(i===0&&x.dataset.lazySrc&&!x.src){x.src=x.dataset.lazySrc;x.preload='metadata';}});},{once:true});}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();})();</script>`;
      const patchedHtml = html
        .replace(/const\s+API_BASE\s*=\s*['"][^'"]*['"];?/g, "const API_BASE = '';")
        .replace(/<\/body>/i, lazyAudioScript + '</body>');

      this.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      this.set('Pragma', 'no-cache');
      this.set('Expires', '0');
      this.set('X-Max-Backend', 'primary');
      this.type('html').send(patchedHtml);
      return this;
    }
  } catch (error) {
    console.error('[INDEX PATCH]', error.message);
  }

  return originalSendFile.call(this, filePath, ...args);
};
