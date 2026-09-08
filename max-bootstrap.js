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
const audioCachePromises = new Map();
const audioQueue = [];
let audioQueueRunning = false;

try { fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true }); } catch (_) {}

function audioCachePath(url) {
  const key = crypto.createHash('sha256').update(url).digest('hex');
  return path.join(AUDIO_CACHE_DIR, key + '.m4a');
}

function enqueueAudioCache(url) {
  if (!url || audioCachePromises.has(url)) return audioCachePromises.get(url) || null;

  const promise = new Promise((resolve, reject) => {
    audioQueue.push({ url, resolve, reject });
    runAudioQueue();
  });
  audioCachePromises.set(url, promise);
  return promise;
}

async function runAudioQueue() {
  if (audioQueueRunning) return;
  audioQueueRunning = true;

  while (audioQueue.length) {
    const job = audioQueue.shift();
    try {
      const file = audioCachePath(job.url);
      if (!fs.existsSync(file)) {
        const tmp = file + '.part';
        try { fs.unlinkSync(tmp); } catch (_) {}

        const response = await axios.get(job.url, {
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

        await new Promise((resolve, reject) => {
          const output = fs.createWriteStream(tmp);
          response.data.on('error', reject);
          output.on('error', reject);
          output.on('finish', resolve);
          response.data.pipe(output);
        });

        fs.renameSync(tmp, file);
      }
      job.resolve(file);
      console.log('[AUDIO CACHE] ready');
    } catch (error) {
      console.error('[AUDIO CACHE] error:', error.code || error.message);
      job.reject(error);
    }
  }

  audioQueueRunning = false;
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
  fs.createReadStream(file, { start, end }).pipe(res);
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

    try {
      if (await serveCachedAudio(req, res, target.toString())) return;
    } catch (error) {
      console.error('[AUDIO CACHE SERVE]', error.message);
    }

    // Start a background full-file cache. It is queued so two songs do not
    // simultaneously overload the external audio host.
    enqueueAudioCache(target.toString()).catch(() => {});

    const range = String(req.headers.range || '').trim();
    const headers = {
      Accept: '*/*',
      'User-Agent': 'Mozilla/5.0',
      'Accept-Encoding': 'identity'
    };
    if (range) headers.Range = range;

    let upstream;
    try {
      upstream = await axios.get(target.toString(), {
        responseType: 'stream',
        headers,
        timeout: 0,
        maxRedirects: 5,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        validateStatus: (status) => status >= 200 && status < 400
      });
    } catch (error) {
      console.error('[GET /api/audio] upstream error:', error.code || error.message);
      if (!res.headersSent) res.status(502).send('Не удалось получить аудиофайл');
      return;
    }

    const upstreamHeaders = upstream.headers || {};
    const status = upstream.status === 206 ? 206 : 200;
    res.status(status);
    res.setHeader('Content-Type', 'audio/mp4');
    if (upstreamHeaders['content-length']) res.setHeader('Content-Length', upstreamHeaders['content-length']);
    if (upstreamHeaders['content-range']) res.setHeader('Content-Range', upstreamHeaders['content-range']);
    res.setHeader('Accept-Ranges', upstreamHeaders['accept-ranges'] || 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    const cleanup = () => {
      // The background cache intentionally continues independently.
      try { upstream.data?.destroy(); } catch (_) {}
    };
    req.on('aborted', cleanup);
    res.on('close', cleanup);
    upstream.data.on('error', (error) => {
      if (error?.code !== 'ECONNRESET' && !res.destroyed) {
        console.error('[AUDIO PROXY STREAM]', error.message);
      }
    });

    upstream.data.pipe(res);
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
      const patchedHtml = html
        .replace(/const\s+API_BASE\s*=\s*['"][^'"]*['"];?/g, "const API_BASE = '';")
        .replace(/preload=\"none\"/g, 'preload="metadata"');

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
