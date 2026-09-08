const express = require('express');
const crypto = require('crypto');
const fs = require('fs');

// MAX compatibility layer. Audio delivery is handled by audio-final.js.
const originalUse = express.application.use;
const originalSendFile = express.response.sendFile;

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
    if (typeof data === 'string' && data.includes('=') && data.includes('\\n')) {
      data = data
        .split('\\n')
        .map((line) => {
          const separator = line.indexOf('=');
          if (separator < 0) return line;
          const name = line.slice(0, separator);
          const value = line.slice(separator + 1);
          try { return name + '=' + decodeURIComponent(value); }
          catch (_) { return line; }
        })
        .join('\\n');
    }
    return originalUpdate(data, inputEncoding);
  };

  return hmac;
};

express.response.sendFile = function patchedSendFile(filePath, ...args) {
  try {
    const html = fs.readFileSync(filePath, 'utf8');
    const isIndex = String(filePath || '').endsWith('/index.html') || String(filePath || '').endsWith('index.html');

    if (isIndex) {
      // MAX WebView can leave the demo <audio> element parked at ~30s after
      // our client-side demo limiter pauses playback. Reset to the beginning
      // on the next Play so the same 30-second preview can be replayed.
      const replayFix = `<script>(function(){function fix(){document.querySelectorAll('audio').forEach(function(a){if(a.dataset.maxReplayFix)return;a.dataset.maxReplayFix='1';a.addEventListener('play',function(){try{if(Number.isFinite(a.currentTime)&&a.currentTime>=29.5){a.currentTime=0;}}catch(e){}});a.addEventListener('ended',function(){try{a.currentTime=0;}catch(e){}});});}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fix);else fix();})();</script>`;
      const patchedHtml = html
        .replace(/const\s+API_BASE\s*=\s*['\"][^'\"]*['\"];?/g, "const API_BASE = '';")
        .replace(/<\\/body>/i, replayFix + '</body>');

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
