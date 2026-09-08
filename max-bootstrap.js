const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const axios = require('axios');

// Compatibility and media transport layer.
// Loaded before the main server with node -r ./max-bootstrap.js server.js

const originalUse = express.application.use;
const originalGet = express.application.get;

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

    const range = String(req.headers.range || '').trim();
    const headers = {
      'Accept': '*/*',
      'User-Agent': 'Mozilla/5.0',
      ...(range ? { Range: range } : {})
    };

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
    const status = upstream.status === 206 || range ? upstream.status : 200;
    res.status(status);
    res.setHeader('Content-Type', upstreamHeaders['content-type'] || 'audio/mp4');
    if (upstreamHeaders['content-length']) res.setHeader('Content-Length', upstreamHeaders['content-length']);
    if (upstreamHeaders['content-range']) res.setHeader('Content-Range', upstreamHeaders['content-range']);
    res.setHeader('Accept-Ranges', upstreamHeaders['accept-ranges'] || 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    const cleanup = () => {
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

express.application.get = function patchedGet(path, ...handlers) {
  if (typeof path === 'string' && path === '/api/health') {
    installAudioProxy(this);
  }
  return originalGet.call(this, path, ...handlers);
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
