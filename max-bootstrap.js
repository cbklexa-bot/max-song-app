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
