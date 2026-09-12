const express = require('express');

const originalSendFile = express.response.sendFile;

const patchScript = `<script id="ai-home-video-copy-fix">
(function(){
  if(window.__AI_HOME_VIDEO_COPY_FIX__)return;
  window.__AI_HOME_VIDEO_COPY_FIX__=true;

  function patch(){
    try{
      document.querySelectorAll('#ai-home-video .home-soon').forEach(function(el){
        el.textContent='Создать видео';
        el.className='home-ready';
        el.removeAttribute('aria-label');
      });

      document.querySelectorAll('#ai-home-video .home-link span:first-child').forEach(function(el){
        if(el.textContent.trim()==='Посмотреть возможности') el.textContent='Создать видео';
      });
    }catch(error){
      console.warn('[AI HOME VIDEO COPY]',error);
    }
  }

  function start(){
    patch();
    new MutationObserver(patch).observe(document.body,{subtree:true,childList:true});
    window.addEventListener('resize',patch,{passive:true});
    setInterval(patch,1000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
</script>`;

express.response.sendFile=function patchedSendFile(filePath,...args){
  const isIndex=typeof filePath==='string' && /(?:^|[\\/])index\.html$/i.test(filePath);
  if(!isIndex)return originalSendFile.call(this,filePath,...args);

  const response=this;
  const originalSend=response.send;
  response.send=function aiHomeVideoCopySend(body){
    try{
      if(typeof body==='string' && body.includes('<body')){
        const marker='</body>';
        const index=body.toLowerCase().lastIndexOf(marker);
        if(index>=0 && !body.includes('ai-home-video-copy-fix')){
          body=body.slice(0,index)+patchScript+'\n'+body.slice(index);
        }
      }
      return originalSend.call(this,body);
    }catch(error){
      console.error('[AI HOME VIDEO COPY]',error.message);
      return originalSend.call(this,body);
    }
  };

  try{return originalSendFile.call(this,filePath,...args)}
  finally{response.send=originalSend}
};

console.log('[AI HOME VIDEO COPY] module loaded');
