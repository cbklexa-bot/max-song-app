const express = require('express');
const crypto = require('crypto');
const fs = require('fs');

// MAX compatibility layer. Audio delivery is handled by the audio gateway.
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
      // MAX WebView may leave an <audio> element at the 30s demo limit.
      // Force a reset to 0:00 so the next Play starts immediately.
      const replayFix = `<script>(function(){
function resetIfDemo(a){
  try{
    if(!a||a.dataset.maxReplayFix)return;
    a.dataset.maxReplayFix='1';
    var reached=false;
    function reset(){
      try{a.pause();}catch(e){}
      try{a.currentTime=0;}catch(e){}
    }
    function check(){
      try{
        if(Number.isFinite(a.currentTime)&&a.currentTime>=29.5){
          reached=true;
          reset();
        }
      }catch(e){}
    }
    a.addEventListener('timeupdate',check);
    a.addEventListener('ended',reset);
    a.addEventListener('play',function(){
      try{
        if(reached||a.currentTime>=29.5){
          reached=false;
          a.currentTime=0;
        }
      }catch(e){}
    });
    setInterval(check,100);
  }catch(e){}
}
function scan(){document.querySelectorAll('audio').forEach(resetIfDemo);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);else scan();
new MutationObserver(scan).observe(document.documentElement,{subtree:true,childList:true});
})();</script>`;

      // Route all supported MAX audio sources through our same-origin gateway.
      // The database keeps the real generated URL; MAX receives /api/audio?url=...
      const audioProxyFix = `<script>(function(){
function toProxy(url){
  try{
    var value=String(url||'').trim();
    if(!value)return value;
    if(value.indexOf('/api/audio?')===0)return value;
    var parsed=new URL(value,location.href);
    if(parsed.protocol==='https:'&&parsed.hostname.toLowerCase()==='s.bmnmny.cn'){
      return '/api/audio?url='+encodeURIComponent(parsed.toString());
    }
    return value;
  }catch(e){return url;}
}
function patchAudio(a){
  try{
    if(!a||a.dataset.maxAudioProxy==='1')return;
    var raw=a.getAttribute('src')||'';
    var proxied=toProxy(raw);
    if(proxied&&proxied!==raw)a.setAttribute('src',proxied);
    a.dataset.maxAudioProxy='1';
    a.addEventListener('error',function(){
      try{
        var current=a.getAttribute('src')||'';
        if(current.indexOf('/api/audio?')===0)return;
        var fallback=toProxy(current);
        if(fallback&&fallback!==current){a.setAttribute('src',fallback);a.load();}
      }catch(e){}
    });
  }catch(e){}
}
function scan(){document.querySelectorAll('audio').forEach(patchAudio);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);else scan();
new MutationObserver(scan).observe(document.documentElement,{subtree:true,childList:true});
})();</script>`;

      // Use MAX's native downloadFile() with the real attachment endpoint.
      // MAX requires a fully qualified HTTPS URL, not a relative path.
      const downloadFix = `<script>(function(){
function installDownloadFix(){
  try{
    if(typeof window.downloadSong!=='function'||window.downloadSong.__maxDownloadFix)return;
    var original=window.downloadSong;
    function buildDownloadUrl(url,title){
      var safeName=String(title||'song').replace(/[\\\\/:*?"<>|]/g,'_').slice(0,80);
      var relative='/api/download?url='+encodeURIComponent(String(url||''))+'&name='+encodeURIComponent(safeName);
      return new URL(relative,location.href).toString();
    }
    function fixedDownloadSong(url,title){
      var value=String(url||'').trim();
      if(!value){
        try{window.showStatus('Некорректная ссылка на аудиофайл.','error');}catch(e){}
        return;
      }
      var safeName=String(title||'song').replace(/[\\\\/:*?"<>|]/g,'_').slice(0,80);
      var downloadUrl=buildDownloadUrl(value,title);
      var webApp=window.WebApp||null;
      if(webApp&&typeof webApp.downloadFile==='function'){
        try{
          webApp.downloadFile(downloadUrl,safeName+'.m4a');
          try{window.showStatus('📥 Загрузка файла запущена.');setTimeout(window.clearStatus,3500);}catch(e){}
          return;
        }catch(error){
          console.warn('[MAX DOWNLOAD FIX]',error);
        }
      }
      try{
        var link=document.createElement('a');
        link.href=downloadUrl;
        link.download=safeName+'.m4a';
        link.rel='noopener';
        document.body.appendChild(link);
        link.click();
        link.remove();
      }catch(error){
        console.warn('[MAX DOWNLOAD FALLBACK]',error);
        try{original(value,title);}catch(e){}
      }
    }
    fixedDownloadSong.__maxDownloadFix=true;
    window.downloadSong=fixedDownloadSong;
    console.log('[MAX DOWNLOAD FIX] installed');
  }catch(error){
    console.warn('[MAX DOWNLOAD FIX] install failed',error);
  }
}
var tries=0;
var timer=setInterval(function(){
  tries++;
  installDownloadFix();
  if(window.downloadSong&&window.downloadSong.__maxDownloadFix||tries>80)clearInterval(timer);
},100);
})();</script>`;

      // Inject into <body> directly so the fixes cannot be skipped by HTML formatting.
      const patchedHtml = html
        .replace(/const\s+API_BASE\s*=\s*['\"][^'\"]*['\"];?/g, "const API_BASE = '';")
        .replace(/<body[^>]*>/i, (tag) => tag + replayFix + audioProxyFix + downloadFix);

      this.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      this.set('Pragma', 'no-cache');
      this.set('Expires', '0');
      this.set('X-Max-Backend', 'primary');
      this.set('X-Max-Replay-Fix', 'v5');
      this.set('X-Max-Audio-Proxy-Fix', 'v1');
      this.set('X-Max-Download-Fix', 'v2');
      this.type('html').send(patchedHtml);
      return this;
    }
  } catch (error) {
    console.error('[INDEX PATCH]', error.message);
  }

  return originalSendFile.call(this, filePath, ...args);
};