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
      const replayFix = `<script>(function(){
function resetIfDemo(a){
  try{
    if(!a||a.dataset.maxReplayFix||a.getAttribute('data-demo')!=='true')return;
    a.dataset.maxReplayFix='1';
    var reached=false;
    function reset(){try{a.pause();}catch(e){}try{a.currentTime=0;}catch(e){}}
    function check(){try{if(Number.isFinite(a.currentTime)&&a.currentTime>=29.5){reached=true;reset();}}catch(e){}}
    a.addEventListener('timeupdate',check);a.addEventListener('ended',reset);
    a.addEventListener('play',function(){try{if(reached||a.currentTime>=29.5){reached=false;a.currentTime=0;}}catch(e){}});
    setInterval(check,100);
  }catch(e){}}
function scan(){document.querySelectorAll('audio[data-demo="true"]').forEach(resetIfDemo);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);else scan();
new MutationObserver(scan).observe(document.documentElement,{subtree:true,childList:true});
})();</script>`;

      const downloadFix = `<script>(function(){
function installDownloadFix(){
  try{
    if(typeof window.downloadSong!=='function'||window.downloadSong.__maxDownloadFix)return;
    var original=window.downloadSong;
    function buildDownloadUrl(url,title){
      var safeName=String(title||'song').replace(/[\\\\/:*?"<>|]/g,'_').slice(0,80);
      return new URL('/api/download?url='+encodeURIComponent(String(url||''))+'&name='+encodeURIComponent(safeName),location.href).toString();
    }
    function fixedDownloadSong(url,title){
      var value=String(url||'').trim();
      if(!value){try{window.showStatus('Некорректная ссылка на аудиофайл.','error');}catch(e){}return;}
      var safeName=String(title||'song').replace(/[\\\\/:*?"<>|]/g,'_').slice(0,80);
      var downloadUrl=buildDownloadUrl(value,title);
      var webApp=window.WebApp||null;
      if(webApp&&typeof webApp.downloadFile==='function'){
        try{webApp.downloadFile(downloadUrl,safeName+'.m4a');try{window.showStatus('📥 Загрузка файла запущена.');setTimeout(window.clearStatus,3500);}catch(e){}return;}catch(error){console.warn('[MAX DOWNLOAD FIX]',error);}
      }
      try{var link=document.createElement('a');link.href=downloadUrl;link.download=safeName+'.m4a';link.rel='noopener';document.body.appendChild(link);link.click();link.remove();}
      catch(error){console.warn('[MAX DOWNLOAD FALLBACK]',error);try{original(value,title);}catch(e){}}
    }
    fixedDownloadSong.__maxDownloadFix=true;window.downloadSong=fixedDownloadSong;
  }catch(error){console.warn('[MAX DOWNLOAD FIX] install failed',error);}
}
var tries=0;var timer=setInterval(function(){tries++;installDownloadFix();if(window.downloadSong&&window.downloadSong.__maxDownloadFix||tries>80)clearInterval(timer);},100);
})();</script>`;

      const maxIdentityFix = `<script>(function(){
var AI_GIFTS_URL='https://ai-podarki-tehnopark.amvera.io/';
var ready=false;
function installMaxIdentity(){
  try{
    if(ready||!window.WebApp)return false;
    var webApp=window.WebApp;
    var initData=String(webApp.initData||'').trim();
    if(!initData)return false;

    if(!window.__maxOriginalFetch&&typeof window.fetch==='function'){
      window.__maxOriginalFetch=window.fetch.bind(window);
      window.fetch=function(input,init){
        try{init=init||{};var headers=new Headers(init.headers||{});if(!headers.has('X-MAX-Init-Data'))headers.set('X-MAX-Init-Data',initData);init.headers=headers;}catch(e){}
        return window.__maxOriginalFetch(input,init);
      };
    }

    if(!window.__maxOriginalXHR&&window.XMLHttpRequest){
      window.__maxOriginalXHR=window.XMLHttpRequest;
      var NativeXHR=window.XMLHttpRequest;
      function MaxXHR(){
        var xhr=new NativeXHR();var originalSend=xhr.send;var originalSetRequestHeader=xhr.setRequestHeader;
        xhr.setRequestHeader=function(name,value){return originalSetRequestHeader.call(xhr,name,value);};
        xhr.send=function(body){try{originalSetRequestHeader.call(xhr,'X-MAX-Init-Data',initData);}catch(e){}return originalSend.call(xhr,body);};
        return xhr;
      }
      MaxXHR.prototype=NativeXHR.prototype;window.XMLHttpRequest=MaxXHR;
    }

    if(webApp.BackButton&&typeof webApp.BackButton.show==='function'){
      webApp.BackButton.show();
      if(typeof webApp.BackButton.onClick==='function'){
        webApp.BackButton.onClick(function(){
          try{
            if(window.history.length>1){window.history.back();return;}
          }catch(e){}
          try{window.WebApp.openMaxLink(AI_GIFTS_URL);}catch(e){try{window.location.assign(AI_GIFTS_URL);}catch(_){}}
        });
      }
    }

    window.__MAX_INIT_DATA_READY=true;ready=true;console.log('[MAX IDENTITY FIX] initData connected');return true;
  }catch(error){console.warn('[MAX IDENTITY FIX] install failed',error);return false;}
}
var tries=0;var timer=setInterval(function(){tries++;if(installMaxIdentity()||tries>100)clearInterval(timer);},50);installMaxIdentity();
})();</script>`;

      const topupNotesFix = (value) => value
        .replace(/<p class="topup-description">[\s\S]*?<\/p>/i, '')
        .replace(/<p class="test-note">[\s\S]*?<\/p>/i, '');

      const bridgeReadyHtml = html.replace(
        /<script\s+defer\s+src="https:\/\/st\.max\.ru\/js\/max-web-app\.js"><\/script>/i,
        '<script src="https://st.max.ru/js/max-web-app.js"></script>'
      );

      const patchedHtml = topupNotesFix(bridgeReadyHtml
        .replace(/const\s+API_BASE\s*=\s*['\"][^'\"]*['\"];?/g, "const API_BASE = '';")
      ).replace(/<body[^>]*>/i,(tag)=>tag+replayFix+downloadFix+maxIdentityFix);

      this.set('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
      this.set('Pragma','no-cache');this.set('Expires','0');this.set('X-Max-Backend','primary');
      this.set('X-Max-Replay-Fix','v6-demo-only');this.set('X-Max-Audio-Proxy-Fix','disabled');
      this.set('X-Max-Download-Fix','v2');this.set('X-Max-Identity-Fix','v3');
      this.type('html').send(patchedHtml);return this;
    }
  } catch (error) {console.error('[INDEX PATCH]',error.message);}
  return originalSendFile.call(this,filePath,...args);
};
