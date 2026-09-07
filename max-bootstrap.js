const express = require('express');
const crypto = require('crypto');
const fs = require('fs');

// MAX transport compatibility layer.
// Loaded by package.json with: node -r ./max-bootstrap.js server.js

const originalUse = express.application.use;

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

          if (initData) {
            req.headers['x-max-init-data'] = initData;
          }

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

// MAX initData compatibility for the existing signature implementation.
const originalCreateHmac = crypto.createHmac.bind(crypto);
crypto.createHmac = function patchedCreateHmac(algorithm, key, ...rest) {
  const hmac = originalCreateHmac(algorithm, key, ...rest);

  if (!Buffer.isBuffer(key)) {
    return hmac;
  }

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

          try {
            return name + '=' + decodeURIComponent(value);
          } catch (_) {
            return line;
          }
        })
        .join('\n');
    }

    return originalUpdate(data, inputEncoding);
  };

  return hmac;
};

// On Amvera, force the existing HTML to use same-origin API requests.
// Also disable caching so MAX WebView cannot keep an older Render-based page.
const originalSendFile = express.response.sendFile;
express.response.sendFile = function patchedSendFile(filePath, ...args) {
  try {
    const req = this.req;
    const host = String(req?.headers?.host || '').toLowerCase();
    const isAmvera = host.includes('amvera');
    const isIndex = String(filePath || '').endsWith('/index.html') ||
      String(filePath || '').endsWith('index.html');

    if (isAmvera && isIndex) {
      const html = fs.readFileSync(filePath, 'utf8');

      const patchedHtml = html
        .replace(
          /const\s+API_BASE\s*=\s*['"]https:\/\/max-song-app\.onrender\.com['"];?/g,
          "const API_BASE = '';"
        )
        .replace(
          /https:\/\/max-song-app\.onrender\.com/g,
          ''
        );

      this.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      this.set('Pragma', 'no-cache');
      this.set('Expires', '0');
      this.set('X-Max-Backend', 'amvera');
      this.type('html').send(patchedHtml);
      return this;
    }
  } catch (error) {
    console.error('[AMVERA INDEX PATCH]', error.message);
  }

  return originalSendFile.call(this, filePath, ...args);
};
