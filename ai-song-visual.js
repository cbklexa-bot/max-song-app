const express = require('express');

const originalSendFile = express.response.sendFile;

const visualCss = `
<style id="ai-song-visual-style">
  :root{--song-purple:#9b5cff;--song-purple-2:#c987ff;--song-pink:#ef4aa5;--song-blue:#56c9ff;--song-green:#64e7bd}
  body.ai-song-visual-screen{background:radial-gradient(560px 300px at 50% -90px,rgba(149,83,255,.27),transparent 70%),radial-gradient(420px 300px at 100% 32%,rgba(239,65,164,.09),transparent 72%),linear-gradient(180deg,#080611 0%,#0d0816 58%,#08060f 100%)}
  body.ai-song-visual-screen .app{position:relative;animation:aiSongPageIn .58s cubic-bezier(.2,.8,.2,1) both}
  body.ai-song-visual-screen .app:before{content:"";position:fixed;pointer-events:none;width:340px;height:340px;left:-180px;top:110px;border-radius:50%;background:radial-gradient(circle,rgba(151,91,255,.12),transparent 67%);filter:blur(10px);animation:aiSongAmbient 6s ease-in-out infinite alternate}
  body.ai-song-visual-screen .header{position:relative;overflow:hidden;margin-bottom:10px;padding:10px 11px;border:1px solid rgba(255,255,255,.10);border-radius:22px;background:linear-gradient(145deg,rgba(42,23,67,.97),rgba(15,9,25,.97));box-shadow:0 18px 48px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.045)}
  body.ai-song-visual-screen .header:after{content:"";position:absolute;width:150px;height:150px;right:-90px;top:-95px;border-radius:50%;background:radial-gradient(circle,rgba(192,116,255,.20),transparent 68%);pointer-events:none}
  body.ai-song-visual-screen .profile,body.ai-song-visual-screen .balance{position:relative;z-index:1}
  body.ai-song-visual-screen .avatar{width:42px;height:42px;flex-basis:42px;border-radius:14px;background:linear-gradient(135deg,#974cff,#ef3d9e);box-shadow:0 10px 28px rgba(145,72,255,.28)}
  body.ai-song-visual-screen .profile-name{font-size:13px;font-weight:950}
  body.ai-song-visual-screen .profile-subtitle{font-size:8px;color:rgba(255,255,255,.36)}
  body.ai-song-visual-screen .balance{min-height:38px;border-radius:14px;border-color:rgba(156,91,255,.30);background:rgba(6,3,12,.58);box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}
  body.ai-song-visual-screen .balance-value{font-size:11px;color:#72e9c1}
  body.ai-song-visual-screen .balance-plus{background:linear-gradient(135deg,#9850ff,#c25cff);box-shadow:0 5px 14px rgba(145,72,255,.30)}
  body.ai-song-visual-screen .hero{position:relative;overflow:hidden;padding:18px 17px 17px;margin-bottom:11px;border-radius:25px;border:1px solid rgba(255,255,255,.10);background:linear-gradient(145deg,rgba(49,27,77,.96),rgba(16,9,27,.98));box-shadow:0 20px 54px rgba(0,0,0,.30),inset 0 1px 0 rgba(255,255,255,.045)}
  body.ai-song-visual-screen .hero:before{content:"";position:absolute;width:210px;height:210px;right:-100px;top:-115px;border-radius:50%;background:radial-gradient(circle,rgba(198,117,255,.24),transparent 68%);pointer-events:none}
  body.ai-song-visual-screen .hero:after{content:"";position:absolute;width:150px;height:150px;left:-90px;bottom:-110px;border-radius:50%;background:radial-gradient(circle,rgba(86,201,255,.10),transparent 70%);pointer-events:none}
  body.ai-song-visual-screen .badge{font-size:7px;padding:5px 8px;color:#dfc4ff;border-color:rgba(192,120,255,.22);background:rgba(165,89,255,.10)}
  body.ai-song-visual-screen .hero-title{font-size:23px;margin:9px 0 5px;letter-spacing:-.04em}
  body.ai-song-visual-screen .hero-text{font-size:9px;line-height:1.5;color:rgba(255,255,255,.47)}
  body.ai-song-visual-screen .card{position:relative;overflow:hidden;margin-bottom:11px;padding:14px;border-radius:24px;border:1px solid rgba(255,255,255,.085);background:linear-gradient(145deg,rgba(29,17,45,.94),rgba(13,8,22,.96));box-shadow:0 18px 48px rgba(0,0,0,.26),inset 0 1px 0 rgba(255,255,255,.035)}
  body.ai-song-visual-screen .section{margin-bottom:15px}
  body.ai-song-visual-screen .section-label{margin-bottom:9px;font-size:11px;color:#f6effa;letter-spacing:.01em}
  body.ai-song-visual-screen .section-number{width:22px;height:22px;border-radius:8px;color:#e0c4ff;background:linear-gradient(135deg,rgba(145,72,255,.18),rgba(239,61,154,.09));border-color:rgba(174,100,255,.22)}
  body.ai-song-visual-screen .choices{gap:7px}
  body.ai-song-visual-screen .genres{grid-template-columns:repeat(3,minmax(0,1fr))}
  body.ai-song-visual-screen .vocals{grid-template-columns:repeat(2,minmax(0,1fr))}
  body.ai-song-visual-screen .choice{position:relative;min-height:47px;padding:9px 7px;border-radius:14px;border:1px solid rgba(255,255,255,.065);background:linear-gradient(145deg,rgba(255,255,255,.035),rgba(255,255,255,.012));color:rgba(255,255,255,.59);font-size:9px;font-weight:900;transition:transform .18s ease,border-color .18s ease,background .18s ease,box-shadow .18s ease,color .18s ease}
  body.ai-song-visual-screen .choice:before{content:"";display:block;width:7px;height:7px;margin:0 auto 4px;border-radius:50%;background:rgba(255,255,255,.14);box-shadow:0 0 0 4px rgba(255,255,255,.015)}
  body.ai-song-visual-screen .choice[data-song-kind="pop"]:before{background:#d28aff}
  body.ai-song-visual-screen .choice[data-song-kind="dance"]:before{background:#6bc9ff}
  body.ai-song-visual-screen .choice[data-song-kind="folk"]:before{background:#f2b36a}
  body.ai-song-visual-screen .choice[data-song-kind="chanson"]:before{background:#ff8cae}
  body.ai-song-visual-screen .choice[data-song-kind="rock"]:before{background:#ff657b}
  body.ai-song-visual-screen .choice[data-song-kind="rap"]:before{background:#9c8bff}
  body.ai-song-visual-screen .choice[data-song-kind="acoustic"]:before{background:#7ed9b0}
  body.ai-song-visual-screen .choice[data-song-kind="jazz"]:before{background:#f1d36e}
  body.ai-song-visual-screen .choice[data-song-kind="electronics"]:before{background:#61d5ff}
  body.ai-song-visual-screen .choice[data-song-kind="female"]:before{background:#f58fc7}
  body.ai-song-visual-screen .choice[data-song-kind="male"]:before{background:#7db8ff}
  body.ai-song-visual-screen .choice[data-song-kind="duet"]:before{background:#bf91ff}
  body.ai-song-visual-screen .choice[data-song-kind="choir"]:before{background:#72dfc1}
  body.ai-song-visual-screen .choice[data-song-kind="child"]:before{background:#ffd36a}
  body.ai-song-visual-screen .choice.selected{color:#fff;border-color:rgba(192,117,255,.58);background:linear-gradient(145deg,rgba(145,72,255,.30),rgba(239,61,154,.13));box-shadow:0 10px 26px rgba(129,65,233,.14),inset 0 0 0 1px rgba(255,255,255,.035)}
  body.ai-song-visual-screen .prompt-wrap{margin-top:2px}
  body.ai-song-visual-screen .prompt{min-height:128px;padding:14px 13px 27px;border-radius:17px;border-color:rgba(255,255,255,.075);background:linear-gradient(160deg,rgba(5,3,11,.64),rgba(17,9,26,.62));color:#f3edf7;font-size:10px;box-shadow:inset 0 1px 0 rgba(255,255,255,.02)}
  body.ai-song-visual-screen .prompt:focus{border-color:rgba(183,94,255,.52);box-shadow:0 0 0 3px rgba(145,72,255,.08),0 12px 34px rgba(102,46,173,.10)}
  body.ai-song-visual-screen .counter{font-size:7px;color:rgba(255,255,255,.25)}
  body.ai-song-visual-screen .price-line{margin-top:11px;margin-bottom:10px;padding:10px 12px;border-radius:14px;background:linear-gradient(145deg,rgba(255,255,255,.035),rgba(255,255,255,.012));border-color:rgba(255,255,255,.06)}
  body.ai-song-visual-screen .price-label{font-size:8px;color:rgba(255,255,255,.34)}
  body.ai-song-visual-screen .price-value{font-size:12px;color:#6ce6bc}
  body.ai-song-visual-screen .generate{position:relative;overflow:hidden;min-height:55px;border-radius:17px;background:linear-gradient(100deg,#8241ff 0%,#b958ff 45%,#ef409e 100%);box-shadow:0 15px 34px rgba(145,72,255,.24),inset 0 1px 0 rgba(255,255,255,.13);font-size:12px;font-weight:950}
  body.ai-song-visual-screen .generate:before{content:"";position:absolute;top:0;bottom:0;width:80px;left:-100px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.24),transparent);transform:skewX(-18deg);animation:aiSongButtonShine 3.6s ease-in-out infinite}
  body.ai-song-visual-screen .generate-hint{font-size:7px;color:rgba(255,255,255,.26)}
  body.ai-song-visual-screen .orders-head{margin-bottom:10px}
  body.ai-song-visual-screen .orders-title{font-size:14px;letter-spacing:-.01em}
  body.ai-song-visual-screen .orders-count{padding:5px 8px;border-radius:999px;font-size:8px;background:rgba(145,72,255,.11);border-color:rgba(174,100,255,.17)}
  body.ai-song-visual-screen .empty{padding:22px 8px;color:rgba(255,255,255,.26);font-size:9px}
  body.ai-song-visual-screen .order{position:relative;overflow:hidden;padding:12px;margin-bottom:9px;border-radius:18px;background:linear-gradient(145deg,rgba(255,255,255,.035),rgba(255,255,255,.012));border-color:rgba(255,255,255,.065);box-shadow:inset 0 1px 0 rgba(255,255,255,.025)}
  body.ai-song-visual-screen .order:after{content:"";position:absolute;left:-30%;top:0;width:30%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.03),transparent);transform:skewX(-14deg);pointer-events:none}
  body.ai-song-visual-screen .order.completed:after{animation:aiOrderShimmer 5s linear infinite}
  body.ai-song-visual-screen .order-icon{width:42px;height:42px;flex-basis:42px;border-radius:14px;font-size:17px;box-shadow:0 8px 20px rgba(0,0,0,.18)}
  body.ai-song-visual-screen .processing-icon{background:rgba(145,72,255,.12);border-color:rgba(173,96,255,.20)}
  body.ai-song-visual-screen .preview-icon{background:rgba(255,193,77,.08);border-color:rgba(255,193,77,.16)}
  body.ai-song-visual-screen .completed-icon{background:rgba(24,201,150,.08);border-color:rgba(24,201,150,.15)}
  body.ai-song-visual-screen .order-name{font-size:11px;font-weight:950}
  body.ai-song-visual-screen .order-meta{font-size:7px;color:rgba(255,255,255,.27)}
  body.ai-song-visual-screen .pill{font-size:7px;margin-top:8px;padding:5px 7px}
  body.ai-song-visual-screen .variant{margin-top:8px;padding:10px;border-radius:15px;background:rgba(0,0,0,.16);border-color:rgba(255,255,255,.055)}
  body.ai-song-visual-screen .variant-name{font-size:9px;font-weight:950}
  body.ai-song-visual-screen audio{height:40px;border-radius:10px}
  body.ai-song-visual-screen .unlock{min-height:42px;border-radius:12px;background:linear-gradient(100deg,#0e9c78,#28cfa4);box-shadow:0 8px 22px rgba(24,201,150,.11)}
  body.ai-song-visual-screen .actions{gap:7px}
  body.ai-song-visual-screen .action{min-height:40px;border-radius:12px;font-size:8px}
  body.ai-song-visual-screen .action.primary{background:rgba(145,72,255,.12);border-color:rgba(174,100,255,.18);color:#ddc0ff}
  body.ai-song-visual-screen .generation-line{font-size:8px;color:#d2b3ff}
  body.ai-song-visual-screen .generation-dot{width:8px;height:8px;flex-basis:8px;box-shadow:0 0 14px rgba(185,91,255,.75)}

  #ai-song-page-transition{position:fixed;inset:0;z-index:999999;pointer-events:none;opacity:0;background:rgba(7,3,14,.92);transition:opacity .24s ease}
  #ai-song-page-transition.active{opacity:1}
  #ai-song-page-transition .core{position:absolute;width:180vmax;height:180vmax;left:50%;top:50%;transform:translate(-50%,-50%) scale(0);border-radius:50%;background:radial-gradient(circle at 50% 48%,rgba(255,255,255,.18),transparent 14%),radial-gradient(circle,rgba(194,105,255,.97) 0%,rgba(143,67,255,.88) 35%,rgba(66,28,116,.88) 63%,rgba(8,4,15,.98) 100%);box-shadow:0 0 100px rgba(171,91,255,.48);transition:transform .58s cubic-bezier(.16,.8,.18,1)}
  #ai-song-page-transition.active .core{transform:translate(-50%,-50%) scale(1)}
  #ai-song-page-transition .label{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) translateY(15px);opacity:0;color:#fff;text-align:center;white-space:nowrap;font-size:16px;font-weight:950;letter-spacing:-.02em;text-shadow:0 7px 30px rgba(0,0,0,.28);transition:opacity .22s ease .20s,transform .45s ease .18s}
  #ai-song-page-transition.active .label{opacity:1;transform:translate(-50%,-50%) translateY(0)}
  #ai-song-page-transition.exit{opacity:0;transition:opacity .42s ease .05s}
  #ai-song-page-transition.exit .core{transform:translate(-50%,-50%) scale(1.18)}

  @keyframes aiSongPageIn{from{opacity:0;transform:translateY(12px) scale(.985);filter:blur(3px)}to{opacity:1;transform:none;filter:none}}
  @keyframes aiSongAmbient{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(15px,8px,0) scale(1.08)}}
  @keyframes aiSongButtonShine{0%,48%{left:-100px}62%{left:110%}100%{left:110%}}
  @keyframes aiOrderShimmer{0%{left:-35%}30%,100%{left:140%}}
  @media(max-width:390px){body.ai-song-visual-screen .header{padding:9px 10px}body.ai-song-visual-screen .avatar{width:38px;height:38px;flex-basis:38px}body.ai-song-visual-screen .hero{padding:15px 14px 14px}body.ai-song-visual-screen .hero-title{font-size:21px}body.ai-song-visual-screen .card{padding:12px;border-radius:21px}body.ai-song-visual-screen .choice{min-height:44px;font-size:8px}body.ai-song-visual-screen .prompt{min-height:118px}}
  @media(prefers-reduced-motion:reduce){body.ai-song-visual-screen .app,body.ai-song-visual-screen .app:before,body.ai-song-visual-screen .generate:before,body.ai-song-visual-screen .order.completed:after{animation:none!important}#ai-song-page-transition .core,#ai-song-page-transition .label{transition:none!important}}
</style>
`;

const visualScript = `
<script id="ai-song-visual-script">
(function(){
  if(window.__AI_SONG_VISUAL_PATCH__)return;
  window.__AI_SONG_VISUAL_PATCH__=true;
  function kindFor(text){const value=(text||'').trim().toLowerCase();if(value.includes('elect'))return 'electronics';if(value.includes('acoustic'))return 'acoustic';if(value.includes('chanson'))return 'chanson';if(value.includes('dance'))return 'dance';if(value.includes('folk'))return 'folk';if(value.includes('rock'))return 'rock';if(value.includes('rap'))return 'rap';if(value.includes('jazz'))return 'jazz';if(value.includes('pop'))return 'pop';if(value.includes('жен'))return 'female';if(value.includes('муж'))return 'male';if(value.includes('дуэт')||value.includes('duet'))return 'duet';if(value.includes('хор')||value.includes('choir'))return 'choir';if(value.includes('реб')||value.includes('child'))return 'child';return ''}
  function decorateChoices(){document.querySelectorAll('.genres .choice,.vocals .choice').forEach(function(button){const kind=kindFor(button.textContent);if(kind)button.dataset.songKind=kind})}
  function markScreen(){const app=document.querySelector('.app');if(!app)return;const home=document.getElementById('ai-gifts-home');const homeHidden=!home||getComputedStyle(home).display==='none'||home.hidden;const appShown=getComputedStyle(app).display!=='none';if(appShown&&homeHidden){document.body.classList.add('ai-song-visual-screen');decorateChoices()}else if(!appShown){document.body.classList.remove('ai-song-visual-screen')}}
  function ensureTransition(){let overlay=document.getElementById('ai-song-page-transition');if(overlay)return overlay;overlay=document.createElement('div');overlay.id='ai-song-page-transition';overlay.innerHTML='<div class="core"></div><div class="label">Песня в подарок</div>';document.body.appendChild(overlay);return overlay}
  function playTransition(event){const card=event.target&&event.target.closest?event.target.closest('.home-card.ai-home-song-card'):null;if(!card)return;const overlay=ensureTransition();const x=Math.max(0,Math.min(window.innerWidth,event.clientX||window.innerWidth/2));const y=Math.max(0,Math.min(window.innerHeight,event.clientY||window.innerHeight/2));const core=overlay.querySelector('.core');if(core){core.style.left=x+'px';core.style.top=y+'px'}overlay.classList.remove('exit','active');void overlay.offsetWidth;overlay.classList.add('active');window.setTimeout(markScreen,120);window.setTimeout(function(){overlay.classList.add('exit');window.setTimeout(function(){overlay.classList.remove('active','exit')},520)},560)}
  function patchHome(){if(typeof window.showHome!=='function'||window.__AI_SONG_HOME_WRAPPED__)return;const original=window.showHome;window.showHome=function(){document.body.classList.remove('ai-song-visual-screen');return original.apply(this,arguments)};window.__AI_SONG_HOME_WRAPPED__=true}
  function start(){document.addEventListener('click',playTransition,true);decorateChoices();markScreen();patchHome();window.setTimeout(patchHome,200);window.setTimeout(patchHome,700);window.setTimeout(markScreen,250);window.setTimeout(markScreen,900)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
</script>
`;

function inject(body){
  if(typeof body!=='string'||!body.includes('<body'))return body;
  if(body.includes('ai-song-visual-style'))return body;
  const marker='</body>';
  const index=body.toLowerCase().lastIndexOf(marker);
  if(index<0)return body;
  return body.slice(0,index)+visualCss+'\n'+visualScript+'\n'+body.slice(index);
}

express.response.sendFile=function patchedSendFile(filePath,...args){
  const normalized=typeof filePath==='string'?filePath.replace(/\\/g,'/').toLowerCase():'';
  const isIndex=normalized.endsWith('/index.html')||normalized==='index.html';
  if(!isIndex)return originalSendFile.call(this,filePath,...args);
  const response=this;
  const originalSend=response.send;
  response.send=function aiSongVisualSend(body){
    try{return originalSend.call(this,inject(body));}
    catch(error){console.error('[AI SONG VISUAL]',error.message);return originalSend.call(this,body)}};
  try{return originalSendFile.call(this,filePath,...args)}
  finally{response.send=originalSend}
};

console.log('[AI SONG VISUAL] module loaded');
