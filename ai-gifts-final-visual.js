const express = require('express');

const originalSendFile = express.response.sendFile;

const patchScript = `<script id="ai-gifts-final-visual">
(function(){
  if(window.__AI_GIFTS_FINAL_VISUAL__)return;
  window.__AI_GIFTS_FINAL_VISUAL__=true;

  var root='/assets/video-gifts/';
  var exts=['.png','.jpg','.jpeg','.webp'];

  function encoded(name){return root+encodeURIComponent(name)}
  function setImageWithFallback(img,base){
    var i=0;
    function next(){
      if(i>=exts.length){img.classList.add('missing');return}
      img.src=encoded(base)+exts[i++];
    }
    img.addEventListener('error',next);
    next();
  }

  function makeVisual(base,alt){
    var visual=document.createElement('div');
    visual.className='ai-gift-full-visual';
    var img=document.createElement('img');
    img.alt=alt||'';
    img.loading='eager';
    img.decoding='async';
    setImageWithFallback(img,base);
    visual.appendChild(img);
    return visual;
  }

  function patchHomeCard(card,base,title,subtitle,cta){
    if(!card||card.dataset.aiFinalVisual==='1')return;
    card.dataset.aiFinalVisual='1';
    card.classList.add('ai-gift-home-card-final');
    card.innerHTML='';
    card.appendChild(makeVisual(base,title));
    var overlay=document.createElement('div');
    overlay.className='ai-gift-home-overlay';
    overlay.innerHTML='<div class="ai-gift-home-copy"><div class="ai-gift-home-title"></div><div class="ai-gift-home-sub"></div></div><div class="ai-gift-home-cta"><span></span><b>→</b></div>';
    overlay.querySelector('.ai-gift-home-title').textContent=title;
    overlay.querySelector('.ai-gift-home-sub').textContent=subtitle;
    overlay.querySelector('.ai-gift-home-cta span').textContent=cta;
    card.appendChild(overlay);
  }

  function patchHome(){
    var song=document.getElementById('ai-home-song');
    var video=document.getElementById('ai-home-video');
    patchHomeCard(song,'Песня в подарок','Песня в подарок','Персональная песня о человеке, ваших чувствах и вашей истории.','Создать песню');
    patchHomeCard(video,'Видео в подарок','Видео в подарок','Видео из фото, поющее фото и персональное приветствие персонажа.','Создать видео');
  }

  function patchVideoPage(){
    var page=document.getElementById('ai-video-gift-page');
    if(!page)return;
    var tools=page.querySelector('.tools');
    if(!tools||tools.dataset.aiFinalVisual==='1')return;
    var buttons=[].slice.call(tools.querySelectorAll('.tool'));
    if(buttons.length!==3)return;
    tools.dataset.aiFinalVisual='1';
    var defs=[
      ['Видео из фото','Видео из фото'],
      ['Поющее фото','Поющее фото'],
      ['Поздравление персонажа','Поздравление персонажа']
    ];
    buttons.forEach(function(button,index){
      var d=defs[index];
      button.classList.add('ai-video-square-card');
      button.innerHTML='';
      button.appendChild(makeVisual(d[0],d[1]));
      var overlay=document.createElement('div');
      overlay.className='ai-video-square-overlay';
      overlay.innerHTML='<div class="ai-video-square-title"></div><div class="ai-video-square-arrow">→</div>';
      overlay.querySelector('.ai-video-square-title').textContent=d[1];
      button.appendChild(overlay);
    });

    var hero=page.querySelector('.hero');
    var how=page.querySelector('.how');
    if(hero)hero.style.display='none';
    if(how)how.style.display='none';
  }

  function patch(){
    try{patchHome();patchVideoPage()}catch(error){console.warn('[AI GIFTS FINAL VISUAL]',error)}
  }

  function start(){
    patch();
    new MutationObserver(patch).observe(document.body,{subtree:true,childList:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
</script>`;

const style=`<style id="ai-gifts-final-visual-style">
.ai-gift-home-card-final{position:relative!important;display:block!important;overflow:hidden!important;aspect-ratio:.78!important;min-height:0!important;padding:0!important;border-radius:24px!important;background:#0b0711!important;border:1px solid rgba(255,255,255,.10)!important;box-shadow:0 18px 42px rgba(0,0,0,.28)!important}
.ai-gift-home-card-final .ai-gift-full-visual,.ai-video-square-card .ai-gift-full-visual{position:absolute;inset:0;overflow:hidden;background:linear-gradient(145deg,#1d1230,#08060d)}
.ai-gift-full-visual img{display:block;width:100%;height:100%;object-fit:cover;object-position:center}
.ai-gift-full-visual img.missing{opacity:0}
.ai-gift-home-card-final .ai-gift-home-overlay{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:15px;background:linear-gradient(180deg,transparent 35%,rgba(5,2,10,.08) 48%,rgba(5,2,10,.86) 100%)}
.ai-gift-home-copy{max-width:95%;text-shadow:0 3px 18px rgba(0,0,0,.42)}
.ai-gift-home-title{font-size:16px;line-height:1.1;font-weight:950;letter-spacing:-.02em}
.ai-gift-home-sub{margin-top:5px;color:rgba(255,255,255,.78);font-size:8.5px;line-height:1.38}
.ai-gift-home-cta{display:flex;align-items:center;justify-content:space-between;margin-top:11px;color:#fff;font-size:8px;font-weight:950}
.ai-gift-home-cta b{width:29px;height:29px;border-radius:10px;display:grid;place-items:center;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(8px);font-size:13px}
.ai-gift-home-card-final:active,.ai-video-square-card:active{transform:scale(.985)!important}
#ai-video-gift-page .tools{display:grid!important;grid-template-columns:1fr!important;gap:14px!important}
#ai-video-gift-page .ai-video-square-card{position:relative!important;overflow:hidden!important;width:100%!important;aspect-ratio:1/1!important;min-height:0!important;padding:0!important;border-radius:24px!important;color:#fff!important;text-align:left!important;background:#0b0711!important;border:1px solid rgba(255,255,255,.10)!important;box-shadow:0 18px 44px rgba(0,0,0,.30)!important}
#ai-video-gift-page .ai-video-square-overlay{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding:18px;background:linear-gradient(180deg,transparent 28%,rgba(4,2,9,.78) 100%)}
#ai-video-gift-page .ai-video-square-title{font-size:19px;font-weight:950;line-height:1.08;text-shadow:0 3px 16px rgba(0,0,0,.45)}
#ai-video-gift-page .ai-video-square-arrow{width:38px;height:38px;flex:0 0 38px;display:grid;place-items:center;border-radius:12px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(9px);font-size:17px;font-weight:900}
#ai-video-gift-page .top{margin-bottom:14px}
#ai-video-gift-page .badge{display:none}
@media(max-width:390px){
  .ai-gift-home-card-final{aspect-ratio:.74!important}
  .ai-gift-home-title{font-size:15px}
  .ai-gift-home-sub{font-size:8px}
  #ai-video-gift-page .ai-video-square-title{font-size:18px}
}
</style>`;

express.response.sendFile=function patchedSendFile(filePath,...args){
  const isIndex=typeof filePath==='string' && /(?:^|[\\/])index\.html$/i.test(filePath);
  if(!isIndex)return originalSendFile.call(this,filePath,...args);
  const response=this;
  const originalSend=response.send;
  response.send=function aiGiftsFinalVisualSend(body){
    try{
      if(typeof body==='string'&&body.includes('<body')&&!body.includes('ai-gifts-final-visual')){
        const marker='</body>';
        const index=body.toLowerCase().lastIndexOf(marker);
        if(index>=0)body=body.slice(0,index)+style+'\n'+patchScript+'\n'+body.slice(index);
      }
    }catch(error){console.error('[AI GIFTS FINAL VISUAL]',error.message)}
    return originalSend.call(this,body);
  };
  try{return originalSendFile.call(this,filePath,...args)}
  finally{response.send=originalSend}
};

console.log('[AI GIFTS FINAL VISUAL] module loaded');
