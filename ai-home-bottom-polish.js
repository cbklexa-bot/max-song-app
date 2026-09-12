const express = require('express');

const originalSend = express.response.send;

const injection = `
<style id="ai-home-bottom-polish-style">
#ai-gifts-home .ai-home-bottom-how{margin:14px 0 12px;padding:12px;border-radius:22px;border:1px solid rgba(255,255,255,.10);background:linear-gradient(145deg,rgba(29,18,43,.86),rgba(12,8,20,.88));box-shadow:0 16px 38px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.05)}
#ai-gifts-home .ai-home-bottom-how-head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin:0 2px 10px}
#ai-gifts-home .ai-home-bottom-how-title{margin:0;font-size:12px;font-weight:950;letter-spacing:-.02em;color:#fff}
#ai-gifts-home .ai-home-bottom-how-sub{margin:3px 0 0;color:rgba(255,255,255,.36);font-size:7.5px}
#ai-gifts-home .ai-home-bottom-how-badge{padding:5px 8px;border-radius:999px;background:rgba(180,123,255,.08);border:1px solid rgba(180,123,255,.13);color:#cfb2ff;font-size:6.5px;font-weight:900;white-space:nowrap}
#ai-gifts-home .ai-home-bottom-how-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
#ai-gifts-home .ai-home-bottom-step{min-width:0;padding:10px 8px;border-radius:15px;background:rgba(255,255,255,.032);border:1px solid rgba(255,255,255,.065);text-align:left}
#ai-gifts-home .ai-home-bottom-step-num{display:grid;place-items:center;width:24px;height:24px;border-radius:8px;background:rgba(180,123,255,.12);border:1px solid rgba(180,123,255,.18);color:#e0caff;font-size:9px;font-weight:950}
#ai-gifts-home .ai-home-bottom-step:nth-child(2) .ai-home-bottom-step-num{background:rgba(82,188,255,.11);border-color:rgba(82,188,255,.17);color:#bfeeff}
#ai-gifts-home .ai-home-bottom-step:nth-child(3) .ai-home-bottom-step-num{background:rgba(125,241,199,.10);border-color:rgba(125,241,199,.16);color:#c9ffe9}
#ai-gifts-home .ai-home-bottom-step strong{display:block;margin-top:8px;font-size:8px;line-height:1.2;color:rgba(255,255,255,.88)}
#ai-gifts-home .ai-home-bottom-step span{display:block;margin-top:4px;font-size:6.6px;line-height:1.4;color:rgba(255,255,255,.34)}
#ai-gifts-home .home-footer{margin-top:8px!important;padding-top:16px!important}
@media(max-width:390px){
  #ai-gifts-home .ai-home-bottom-how{padding:10px}
  #ai-gifts-home .ai-home-bottom-how-grid{gap:6px}
  #ai-gifts-home .ai-home-bottom-step{padding:8px 7px}
  #ai-gifts-home .ai-home-bottom-step strong{font-size:7.5px}
  #ai-gifts-home .ai-home-bottom-step span{font-size:6.2px}
}
</style>
<script id="ai-home-bottom-polish-script">
(function(){
  if(window.__AI_HOME_BOTTOM_POLISH__)return;
  window.__AI_HOME_BOTTOM_POLISH__=true;

  function mount(){
    var home=document.getElementById('ai-gifts-home');
    if(!home)return false;
    if(home.querySelector('.ai-home-bottom-how'))return true;
    var showcase=home.querySelector('.home-showcase');
    var footer=home.querySelector('.home-footer');
    if(!showcase||!footer)return false;

    var block=document.createElement('section');
    block.className='ai-home-bottom-how';
    block.innerHTML='<div class="ai-home-bottom-how-head">'
      +'<div><h3 class="ai-home-bottom-how-title">Как создать подарок</h3><p class="ai-home-bottom-how-sub">Всего несколько шагов — и подарок готов</p></div>'
      +'<div class="ai-home-bottom-how-badge">Быстро и просто</div>'
      +'</div>'
      +'<div class="ai-home-bottom-how-grid">'
      +'<div class="ai-home-bottom-step"><div class="ai-home-bottom-step-num">1</div><strong>Выберите формат</strong><span>Песня или персональное видео</span></div>'
      +'<div class="ai-home-bottom-step"><div class="ai-home-bottom-step-num">2</div><strong>Заполните детали</strong><span>Получатель, настроение и пожелания</span></div>'
      +'<div class="ai-home-bottom-step"><div class="ai-home-bottom-step-num">3</div><strong>Получите подарок</strong><span>Готовый результат можно подарить сразу</span></div>'
      +'</div>';

    footer.parentNode.insertBefore(block,footer);
    return true;
  }

  function start(){
    if(mount())return;
    var observer=new MutationObserver(function(){if(mount())observer.disconnect()});
    observer.observe(document.body,{subtree:true,childList:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
</script>`;

function inject(body){
  if(typeof body!=='string'||body.indexOf('ai-home-bottom-polish-script')!==-1||body.indexOf('<html')===-1)return body;
  var at=body.toLowerCase().lastIndexOf('</body>');
  if(at<0)return body;
  return body.slice(0,at)+injection+'\n'+body.slice(at);
}

express.response.send=function patchedSend(body){
  try{body=inject(body)}catch(error){console.error('[AI HOME BOTTOM POLISH]',error.message)}
  return originalSend.call(this,body);
};

console.log('[AI HOME BOTTOM POLISH] module loaded');
