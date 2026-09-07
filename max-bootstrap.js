const express = require('express');
const crypto = require('crypto');
const fs = require('fs');

// MAX transport compatibility layer.
// It is loaded with NODE_OPTIONS=--require=./max-bootstrap.js
// before server.js, so the existing application logic stays untouched.

const originalUse = express.application.use;

express.application.use = function patchedUse(...args) {
  if (!this.__maxTransportInstalled) {
    this.__maxTransportInstalled = true;

    // Runs before the existing logger and routes.
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

          // Keep initData out of application request logs.
          req.originalUrl = rawUrl.slice(0, question) || '/';
        }
      } catch (_) {}

      next();
    });

    // Convert simple POST query parameters into the req.body shape
    // expected by the existing routes. No request body is required
    // from the browser, so the browser never needs a CORS preflight.
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

// Current MAX initData uses URL-encoded parameter values in the string,
// while the signature is calculated over decoded values. The original
// server signs the second-stage data with a Buffer secret key, so decode
// values only for that HMAC stage.
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

// On Amvera, serve the existing frontend with a same-origin API base.
// This keeps GitHub Pages/Render behavior unchanged while the Amvera
// deployment talks to its own backend instead of Render.
const originalSendFile = express.response.sendFile;
express.response.sendFile = function patchedSendFile(filePath, ...args) {
  try {
    const req = this.req;
    const isAmvera = String(req && req.headers && req.headers.host || '')
      .toLowerCase()
      .includes('amvera');
    const isIndex = String(filePath || '').endsWith('/index.html') ||
      String(filePath || '').endsWith('index.html');

    if (isAmvera && isIndex) {
      const html = fs.readFileSync(filePath, 'utf8');
      const patchedHtml = html.replace(
        /const\s+API_BASE\s*=\s*['"]https:\/\/max-song-app\.onrender\.com['"];?/g,
        "const API_BASE = '';"
      );

      this.type('html').send(patchedHtml);
      return this;
    }
  } catch (error) {
    console.error('[AMVERA INDEX PATCH]', error.message);
  }

  return originalSendFile.call(this, filePath, ...args);
};
