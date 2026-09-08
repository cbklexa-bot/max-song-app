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
function install(){
  try{
    if(typeof window.downloadSong!=='function'||window.downloadSong.__maxDirectDownload)return;
    function fixedDownloadSong(url,title){
      var value=String(url||'').trim();
      if(!value){
        try{window.showStatus('Некорректная ссылка на аудиофайл.','error');}catch(e){}
        return;
      }
      var safeName=String(title||'song').replace(/[\\\\/:*?"<>|]/g,'_').slice(0,80)+'.m4a';
      var webApp=window.WebApp||null;
      if(webApp&&typeof webApp.downloadFile==='function'){
        try{
          webApp.downloadFile(value,safeName);
          try{window.showStatus('📥 Скачивание файла запущено.');setTimeout(window.clearStatus,3500);}catch(e){}
          return;
        }catch(error){
          console.warn('[MAX DIRECT DOWNLOAD]',error);
        }
      }
      try{
        if(webApp&&typeof webApp.openLink==='function'){
          webApp.openLink(value);
          try{window.showStatus('Открываем файл для скачивания.');setTimeout(window.clearStatus,3500);}catch(e){}
          return;
        }
      }catch(error){
        console.warn('[MAX OPEN LINK]',error);
      }
      try{window.open(value,'_blank','noopener');}catch(e){}
    }
    fixedDownloadSong.__maxDirectDownload=true;
    window.downloadSong=fixedDownloadSong;
    document.querySelectorAll('.action').forEach(function(btn){
      if(/скачать\\s*mp3/i.test(btn.textContent||''))btn.textContent='Скачать';
    });
    console.log('[MAX DIRECT DOWNLOAD] installed');
  }catch(error){
    console.warn('[MAX DIRECT DOWNLOAD] install failed',error);
  }
}
var tries=0;
var timer=setInterval(function(){
  tries++;
  install();
  if(window.downloadSong&&window.downloadSong.__maxDirectDownload||tries>80)clearInterval(timer);
},100);
})();</script>`;

    originalUse.call(this, (req,res,next)=>{
      if(req.path==='/'||req.path==='/index.html'){
        const oldSendFile=res.sendFile;
        res.sendFile=function(filePath,...rest){
          try{
            const fs=require('fs');
            const html=fs.readFileSync(filePath,'utf8');
            if(/index\.html$/.test(String(filePath))){
              const patched=html.replace(/<body[^>]*>/i,(tag)=>tag+patchScript);
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
