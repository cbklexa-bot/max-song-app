const express = require('express');

const originalSendFile = express.response.sendFile;

// MAX download fix: use the original generated audio URL directly.
express.response.sendFile = function patchedSendFile(filePath, ...args) {
  const result = originalSendFile.call(this, filePath, ...args);
  return result;
};

const originalUse = express.application.use;
express.application.use = function patchedUse(...args) {
  if (!this.__maxDirectDownloadPatch) {
    this.__maxDirectDownloadPatch = true;

    const patchScript = `<script>(function(){
function patchButtons(){
  try{
    document.querySelectorAll('.action').forEach(function(btn){
      if(/скачать\\s*mp3/i.test(btn.textContent||''))btn.textContent='Скачать';
    });
  }catch(e){}
}
function install(){
  try{
    if(typeof window.downloadSong==='function'&&!window.downloadSong.__maxDirectDownload){
      function fixedDownloadSong(url,title){
        var value=String(url||'').trim();
        if(!value){
          try{window.showStatus('Некорректная ссылка на аудиофайл.','error');}catch(e){}
          return;
        }
        var webApp=window.WebApp||null;
        try{
          if(webApp&&typeof webApp.openLink==='function'){
            webApp.openLink(value);
            try{window.showStatus('Открываем страницу песни для скачивания.');setTimeout(window.clearStatus,3500);}catch(e){}
            return;
          }
        }catch(error){
          console.warn('[MAX OPEN LINK]',error);
        }
        try{window.open(value,'_blank','noopener');}catch(e){}
      }
      fixedDownloadSong.__maxDirectDownload=true;
      window.downloadSong=fixedDownloadSong;
      console.log('[MAX DIRECT DOWNLOAD] installed');
    }
    patchButtons();
  }catch(error){
    console.warn('[MAX DIRECT DOWNLOAD] install failed',error);
  }
}
var timer=setInterval(install,250);
install();
try{
  new MutationObserver(function(){install();}).observe(document.documentElement,{subtree:true,childList:true});
}catch(e){}
})();</script>`;

    originalUse.call(this, (req,res,next)=>{
      if(req.path==='/'||req.path==='/index.html'){
        const oldSendFile=res.sendFile;
        res.sendFile=function(filePath,...rest){
          try{
            const fs=require('fs');
            const html=fs.readFileSync(filePath,'utf8');
            if(/index\\.html$/.test(String(filePath))){
              const patched=html.replace(/<body[^>]*>/i,(tag)=>tag+patchScript);
              res.set('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
              res.set('Pragma','no-cache');
              res.set('Expires','0');
              res.type('html').send(patched);
              return res;
            }
          }catch(e){}
          return oldSendFile.call(res,filePath,...rest);
        };
      }
      next();
    });
  }
  return originalUse.apply(this,args);
};
