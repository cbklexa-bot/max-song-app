const express = require('express');

const originalSendFile = express.response.sendFile;

const style = `<style id="ai-video-wan-ui-style">
#ai-video-flow-sheet .wan-video-price{margin-top:10px;color:#6ce5bc;font-size:9px;font-weight:900;text-align:center}
#ai-video-flow-sheet .wan-video-meta{margin-top:4px;color:rgba(255,255,255,.30);font-size:7.5px;text-align:center}
</style>`;

const script = `<script id="ai-video-wan-ui-script">
(function(){
  if(window.__AI_VIDEO_WAN_UI__)return;
  window.__AI_VIDEO_WAN_UI__=true;
  var PRICE=327;
  function patch(){
    var sheet=document.getElementById('ai-video-flow-sheet');
    if(!sheet||!sheet.classList.contains('open'))return;
    var type=sheet.dataset.type||'';
    if(type==='photos'){
      var input=sheet.querySelector('#vf-files');
      if(input)input.removeAttribute('multiple');
      var strong=sheet.querySelector('.upload strong');
      var span=sheet.querySelector('.upload span');
      if(strong)strong.textContent='Выбрать фотографию';
      if(span)span.textContent='Одно исходное фото для 15-секундной анимации';
    }
    var summary=sheet.querySelector('.summary');
    if(summary&&!summary.dataset.wanPatched){
      summary.dataset.wanPatched='1';
      summary.textContent='Wan 2.6 · 15 секунд · 720p · '+PRICE+' ₽';
    }
    var submit=sheet.querySelector('.submit');
    if(submit&&!submit.dataset.wanPricePatched){
      submit.dataset.wanPricePatched='1';
      submit.textContent='Создать видео · '+PRICE+' ₽';
    }
    if(!sheet.querySelector('.wan-video-meta')){
      var meta=document.createElement('div');
      meta.className='wan-video-meta';
      meta.textContent='Генерация через PiAPI · Wan 2.6';
      var box=sheet.querySelector('.box');
      if(box)box.insertBefore(meta,submit||null);
    }
  }

  function start(){
    patch();
    document.addEventListener('click',function(event){
      var target=event.target && event.target.closest ? event.target.closest('#ai-video-flow-sheet') : null;
      if(!target)return;
      requestAnimationFrame(patch);
    },true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
</script>`;

function inject(body){
  if(typeof body!=='string'||!body.includes('<body'))return body;
  if(body.includes('ai-video-wan-ui-script'))return body;
  return body.replace(/<\/body>/i,style+'\n'+script+'\n</body>');
}

express.response.sendFile=function patchedSendFile(filePath,...args){
  var isIndex=typeof filePath==='string'&&/(?:^|[\\/])index\.html$/i.test(filePath);
  if(!isIndex)return originalSendFile.call(this,filePath,...args);
  var response=this,originalSend=response.send;
  response.send=function aiVideoWanUiSend(body){return originalSend.call(this,inject(body))};
  try{return originalSendFile.call(this,filePath,...args)}finally{response.send=originalSend}
};

console.log('[AI VIDEO WAN UI] loaded');
