const express = require('express');

const originalSendFile = express.response.sendFile;

const navigationCss = `
<style id="ai-navigation-visual-style">
  @keyframes aiNavCoreIn{0%{transform:translate(-50%,-50%) scale(0);opacity:.7}55%{opacity:1}100%{transform:translate(-50%,-50%) scale(1);opacity:1}}
  @keyframes aiNavLabelIn{0%{opacity:0;transform:translate(-50%,-50%) translateY(18px) scale(.94)}100%{opacity:1;transform:translate(-50%,-50%) translateY(0) scale(1)}}
  @keyframes aiNavParticles{0%{transform:translate(-50%,-50%) scale(.25);opacity:0}35%{opacity:1}100%{transform:translate(-50%,-50%) scale(1.12);opacity:0}}
  @keyframes aiNavCoreOut{0%{transform:translate(-50%,-50%) scale(1);opacity:1}100%{transform:translate(-50%,-50%) scale(1.18);opacity:0}}
  #ai-nav-transition{position:fixed;inset:0;z-index:1000000;pointer-events:none;display:none;overflow:hidden;background:rgba(4,2,10,.96)}
  #ai-nav-transition.active{display:block}
  #ai-nav-transition .nav-core{position:absolute;left:50%;top:50%;width:180vmax;height:180vmax;border-radius:50%;transform:translate(-50%,-50%) scale(0);background:radial-gradient(circle at 50% 48%,rgba(255,255,255,.20) 0%,transparent 10%),radial-gradient(circle,rgba(199,118,255,.98) 0%,rgba(145,72,255,.94) 34%,rgba(68,31,120,.95) 64%,rgba(7,3,14,1) 100%);box-shadow:0 0 130px rgba(174,90,255,.52);animation:aiNavCoreIn 1.02s cubic-bezier(.16,.82,.18,1) both}
  #ai-nav-transition .nav-ring{position:absolute;left:50%;top:50%;width:70vmin;height:70vmin;border-radius:50%;border:1px solid rgba(255,255,255,.24);box-shadow:0 0 45px rgba(255,255,255,.10),inset 0 0 50px rgba(255,255,255,.05);transform:translate(-50%,-50%) scale(.25);opacity:0;animation:aiNavParticles 1.55s ease-out .10s both}
  #ai-nav-transition .nav-label{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) translateY(18px) scale(.94);opacity:0;color:#fff;text-align:center;white-space:nowrap;font-size:22px;line-height:1.05;font-weight:950;letter-spacing:-.025em;text-shadow:0 10px 36px rgba(0,0,0,.32);animation:aiNavLabelIn .65s cubic-bezier(.2,.9,.2,1) .48s both}
  #ai-nav-transition .nav-sub{position:absolute;left:50%;top:calc(50% + 27px);transform:translateX(-50%) translateY(10px);opacity:0;color:rgba(255,255,255,.60);white-space:nowrap;font-size:9px;font-weight:850;letter-spacing:.14em;text-transform:uppercase;animation:aiNavLabelIn .55s ease .68s both}
  #ai-nav-transition.out .nav-core{animation:aiNavCoreOut .62s cubic-bezier(.4,0,.7,1) both}
  #ai-nav-transition.out .nav-ring{animation:aiNavCoreOut .52s ease both}
  #ai-nav-transition.out .nav-label,#ai-nav-transition.out .nav-sub{animation:aiNavCoreOut .36s ease both}

  #ai-video-gift-page{display:none;min-height:100vh;padding:10px 11px 22px;background:radial-gradient(560px 310px at 50% -70px,rgba(83,176,255,.18),transparent 70%),radial-gradient(430px 300px at 100% 34%,rgba(181,93,255,.13),transparent 72%),linear-gradient(180deg,#070610 0%,#0c0915 58%,#08060e 100%);color:#fff;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow-x:hidden}
  #ai-video-gift-page .video-wrap{width:100%;max-width:560px;margin:0 auto}
  #ai-video-gift-page .video-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:11px;padding:12px 13px;border:1px solid rgba(255,255,255,.09);border-radius:22px;background:linear-gradient(145deg,rgba(28,40,62,.96),rgba(13,12,23,.98));box-shadow:0 18px 48px rgba(0,0,0,.30)}
  #ai-video-gift-page .video-title{margin:0;font-size:24px;font-weight:950;letter-spacing:-.035em;background:linear-gradient(90deg,#9fe1ff,#c596ff);-webkit-background-clip:text;background-clip:text;color:transparent}
  #ai-video-gift-page .video-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border-radius:999px;background:rgba(99,219,255,.08);border:1px solid rgba(99,219,255,.14);color:#9de5ff;font-size:7px;font-weight:900}
  #ai-video-gift-page .video-dot{width:6px;height:6px;border-radius:50%;background:#7df1c7;box-shadow:0 0 12px rgba(125,241,199,.65)}
  #ai-video-gift-page .video-hero{position:relative;overflow:hidden;margin-bottom:12px;padding:17px;border-radius:25px;border:1px solid rgba(255,255,255,.09);background:linear-gradient(145deg,rgba(21,38,64,.95),rgba(13,11,22,.98));box-shadow:0 20px 52px rgba(0,0,0,.30)}
  #ai-video-gift-page .video-hero:before{content:"";position:absolute;width:230px;height:230px;right:-110px;top:-120px;border-radius:50%;background:radial-gradient(circle,rgba(86,201,255,.24),transparent 68%)}
  #ai-video-gift-page .video-hero:after{content:"";position:absolute;width:150px;height:150px;left:-90px;bottom:-115px;border-radius:50%;background:radial-gradient(circle,rgba(181,93,255,.13),transparent 70%)}
  #ai-video-gift-page .video-hero-inner{position:relative;z-index:1}
  #ai-video-gift-page .video-kicker{display:inline-flex;padding:5px 8px;border-radius:999px;background:rgba(90,196,255,.08);border:1px solid rgba(90,196,255,.16);color:#a7e4ff;font-size:7px;font-weight:950;letter-spacing:.09em;text-transform:uppercase}
  #ai-video-gift-page .video-hero h2{margin:9px 0 5px;font-size:22px;line-height:1.08;letter-spacing:-.03em}
  #ai-video-gift-page .video-hero p{margin:0;color:rgba(255,255,255,.50);font-size:9px;line-height:1.5}
  #ai-video-gift-page .video-tools{display:grid;gap:10px;margin-bottom:14px}
  #ai-video-gift-page .video-tool{position:relative;overflow:hidden;width:100%;min-height:148px;padding:0;border-radius:24px;border:1px solid rgba(255,255,255,.09);background:linear-gradient(145deg,rgba(22,17,37,.96),rgba(11,9,18,.98));color:#fff;text-align:left;box-shadow:0 18px 48px rgba(0,0,0,.26);cursor:pointer;transition:transform .16s ease,border-color .18s ease,box-shadow .18s ease}
  #ai-video-gift-page .video-tool:active{transform:scale(.988)}
  #ai-video-gift-page .video-tool:hover{border-color:rgba(138,206,255,.30);box-shadow:0 22px 54px rgba(0,0,0,.31)}
  #ai-video-gift-page .tool-art{position:absolute;inset:0 auto 0 0;width:42%;overflow:hidden;display:grid;place-items:center}
  #ai-video-gift-page .tool-art:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 52% 42%,rgba(255,255,255,.11),transparent 35%)}
  #ai-video-gift-page .tool-art.photo{background:radial-gradient(circle at 50% 45%,rgba(89,198,255,.36),transparent 32%),linear-gradient(145deg,#173659,#111827)}
  #ai-video-gift-page .tool-art.sing{background:radial-gradient(circle at 50% 45%,rgba(214,121,255,.35),transparent 32%),linear-gradient(145deg,#39205b,#171221)}
  #ai-video-gift-page .tool-art.character{background:radial-gradient(circle at 50% 45%,rgba(255,150,179,.32),transparent 32%),linear-gradient(145deg,#54243d,#1c101c)}
  #ai-video-gift-page .tool-orb{position:relative;z-index:1;width:70px;height:70px;display:grid;place-items:center;border-radius:22px;border:1px solid rgba(255,255,255,.20);background:rgba(255,255,255,.09);font-size:32px;box-shadow:0 15px 34px rgba(0,0,0,.23);animation:aiVideoFloat 3.4s ease-in-out infinite}
  #ai-video-gift-page .tool-chip{position:absolute;left:10px;bottom:10px;z-index:2;padding:5px 7px;border-radius:999px;background:rgba(4,3,10,.45);border:1px solid rgba(255,255,255,.10);color:rgba(255,255,255,.68);font-size:6px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}
  #ai-video-gift-page .tool-body{margin-left:42%;min-height:148px;padding:17px 16px;display:flex;flex-direction:column;justify-content:center}
  #ai-video-gift-page .tool-status{align-self:flex-start;padding:5px 7px;border-radius:999px;font-size:6px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;background:rgba(255,196,93,.09);border:1px solid rgba(255,196,93,.14);color:#ffd993}
  #ai-video-gift-page .tool-title{margin-top:9px;font-size:15px;font-weight:950;letter-spacing:-.015em}
  #ai-video-gift-page .tool-desc{margin-top:5px;color:rgba(255,255,255,.45);font-size:8.5px;line-height:1.42}
  #ai-video-gift-page .tool-link{display:flex;align-items:center;justify-content:space-between;margin-top:10px;color:#a9e2ff;font-size:8px;font-weight:950}
  #ai-video-gift-page .tool-arrow{width:25px;height:25px;border-radius:9px;display:grid;place-items:center;background:rgba(91,197,255,.12);border:1px solid rgba(91,197,255,.17);color:#c5efff}
  #ai-video-gift-page .video-how{margin-top:3px;padding:14px;border-radius:20px;border:1px solid rgba(255,255,255,.07);background:rgba(17,13,27,.72)}
  #ai-video-gift-page .video-how-title{margin:0 0 10px;font-size:11px;font-weight:900}
  #ai-video-gift-page .video-how-row{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
  #ai-video-gift-page .video-step{padding:9px;border-radius:13px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);text-align:center}
  #ai-video-gift-page .video-step b{display:block;font-size:9px}
  #ai-video-gift-page .video-step span{display:block;margin-top:4px;color:rgba(255,255,255,.31);font-size:6.5px;line-height:1.35}
  #ai-video-gift-page .video-footer{padding:14px 5px 2px;text-align:center;color:rgba(255,255,255,.23);font-size:7px}
  @keyframes aiVideoFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
  @media(max-width:390px){
    #ai-video-gift-page .video-title{font-size:22px}
    #ai-video-gift-page .video-hero{padding:15px}
    #ai-video-gift-page .video-hero h2{font-size:19px}
    #ai-video-gift-page .video-tool{min-height:132px}
    #ai-video-gift-page .tool-art{width:37%}
    #ai-video-gift-page .tool-body{margin-left:37%;min-height:132px;padding:13px}
    #ai-video-gift-page .tool-orb{width:60px;height:60px;font-size:28px}
    #ai-video-gift-page .tool-title{font-size:13px}
    #ai-video-gift-page .video-how-row{gap:5px}
  }
  @media(prefers-reduced-motion:reduce){#ai-video-gift-page .tool-orb{animation:none}}
</style>
`;

const navigationScript = `
<script id="ai-navigation-visual-script">
(function(){
  if(window.__AI_NAVIGATION_VISUAL_PATCH__)return;
  window.__AI_NAVIGATION_VISUAL_PATCH__=true;

  function getBB(){try{return window.WebApp&&window.WebApp.BackButton||null}catch(e){return null}}
  function hideBB(){try{var bb=getBB();if(bb&&typeof bb.hide==='function')bb.hide()}catch(e){}}
  function showBB(handler){try{var bb=getBB();if(bb&&typeof bb.show==='function')bb.show();if(bb&&typeof bb.onClick==='function'){bb.__aiNavHandler=handler;bb.onClick(handler)}}catch(e){}}
  function ensureTransition(){
    var el=document.getElementById('ai-nav-transition');
    if(el)return el;
    el=document.createElement('div');el.id='ai-nav-transition';
    el.innerHTML='<div class="nav-core"></div><div class="nav-ring"></div><div class="nav-label"></div><div class="nav-sub">AI-подарки</div>';
    document.body.appendChild(el);
    return el;
  }
  function runTransition(title,sub,done){
    var el=ensureTransition();
    var label=el.querySelector('.nav-label');
    if(label)label.textContent=title;
    var x=window.innerWidth/2,y=window.innerHeight/2;
    el.style.setProperty('--nav-x',x+'px');el.style.setProperty('--nav-y',y+'px');
    var core=el.querySelector('.nav-core');if(core){core.style.left=x+'px';core.style.top=y+'px'}
    el.classList.remove('out','active');void el.offsetWidth;el.classList.add('active');
    window.setTimeout(function(){if(typeof done==='function')done()},920);
    window.setTimeout(function(){el.classList.add('out')},1510);
    window.setTimeout(function(){el.classList.remove('active','out')},2200);
  }
  function showSong(){
    var home=document.getElementById('ai-gifts-home'),app=document.querySelector('.app'),video=document.getElementById('ai-video-gift-page');
    if(video)video.style.display='none';
    if(home)home.style.display='none';
    if(app)app.style.display='block';
    window.__AI_SONG_SCREEN__=true;
    try{var bb=getBB();if(bb&&typeof bb.show==='function')bb.show();if(bb&&typeof bb.onClick==='function')bb.onClick(showHome)}catch(e){}
    window.scrollTo(0,0);
  }
  function showHome(){
    var home=document.getElementById('ai-gifts-home'),app=document.querySelector('.app'),video=document.getElementById('ai-video-gift-page');
    if(video)video.style.display='none';
    if(app)app.style.display='none';
    if(home)home.style.display='block';
    window.__AI_SONG_SCREEN__=false;
    hideBB();window.scrollTo(0,0);
  }
  function videoMarkup(){
    if(document.getElementById('ai-video-gift-page'))return;
    var el=document.createElement('section');el.id='ai-video-gift-page';el.innerHTML=`<div class="video-wrap">
      <div class="video-top"><h1 class="video-title">Видео в подарок</h1><div class="video-badge"><span class="video-dot"></span> AI Video</div></div>
      <section class="video-hero"><div class="video-hero-inner"><div class="video-kicker">🎬 Персональное видео с AI</div><h2>Сохраните эмоцию в движении</h2><p>Из фотографий, одного портрета или вашей идеи можно создать необычный подарок — красиво, тепло и персонально.</p></div></section>
      <div class="video-tools">
        <button class="video-tool" data-video-type="photos" type="button"><div class="tool-art photo"><div class="tool-orb">📸</div><span class="tool-chip">AI Slideshow</span></div><div class="tool-body"><span class="tool-status">Скоро</span><div class="tool-title">Видео из фотографий</div><div class="tool-desc">Соберите историю из любимых фото с музыкой, титрами и мягкими переходами.</div><div class="tool-link"><span>Собрать историю</span><span class="tool-arrow">→</span></div></div></button>
        <button class="video-tool" data-video-type="singing" type="button"><div class="tool-art sing"><div class="tool-orb">🎤</div><span class="tool-chip">Talking / Singing Photo</span></div><div class="tool-body"><span class="tool-status">Скоро</span><div class="tool-title">Поющие фото</div><div class="tool-desc">Оживите фотографию: человек на снимке сможет улыбнуться, говорить или петь.</div><div class="tool-link"><span>Оживить фото</span><span class="tool-arrow">→</span></div></div></button>
        <button class="video-tool" data-video-type="character" type="button"><div class="tool-art character"><div class="tool-orb">🎭</div><span class="tool-chip">AI Character</span></div><div class="tool-body"><span class="tool-status">Скоро</span><div class="tool-title">Поздравление от персонажа</div><div class="tool-desc">Персональное поздравление от выбранного AI-персонажа — для ребёнка, семьи или друга.</div><div class="tool-link"><span>Выбрать персонажа</span><span class="tool-arrow">→</span></div></div></button>
      </div>
      <section class="video-how"><h3 class="video-how-title">Как это будет работать</h3><div class="video-how-row"><div class="video-step"><b>1. Материалы</b><span>Фото, текст или идея</span></div><div class="video-step"><b>2. AI</b><span>Создаём сцену и анимацию</span></div><div class="video-step"><b>3. Подарок</b><span>Готовое видео можно отправить</span></div></div></section>
      <div class="video-footer">Новые форматы видео появятся в этом разделе постепенно.</div>
    </div>`;
    document.body.appendChild(el);
    el.querySelectorAll('.video-tool').forEach(function(btn){btn.addEventListener('click',function(){try{if(window.showStatus)window.showStatus('🎬 Этот формат видео будет доступен следующим этапом.')}catch(e){}})})
  }
  function showVideo(){
    var home=document.getElementById('ai-gifts-home'),app=document.querySelector('.app');videoMarkup();var video=document.getElementById('ai-video-gift-page');
    if(home)home.style.display='none';if(app)app.style.display='none';if(video)video.style.display='block';
    window.__AI_SONG_SCREEN__=false;
    try{var bb=getBB();if(bb&&typeof bb.show==='function')bb.show();if(bb&&typeof bb.onClick==='function')bb.onClick(showHome)}catch(e){}
    window.scrollTo(0,0);
  }
  function interceptHome(event){
    var card=event.target&&event.target.closest?event.target.closest('#ai-home-song,#ai-home-video'):null;
    if(!card)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(card.id==='ai-home-song'){runTransition('Песня в подарок','AI Music',showSong)}else{runTransition('Видео в подарок','AI Video',showVideo)}
  }
  function start(){window.addEventListener('click',interceptHome,true);videoMarkup()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
</script>
`;

function inject(body){
  if(typeof body!=='string'||!body.includes('<body'))return body;
  if(body.includes('ai-navigation-visual-style'))return body;
  var marker='</body>',index=body.toLowerCase().lastIndexOf(marker);
  if(index<0)return body;
  return body.slice(0,index)+navigationCss+'\n'+navigationScript+'\n'+body.slice(index);
}

express.response.sendFile=function patchedSendFile(filePath,...args){
  var normalized=typeof filePath==='string'?filePath.replace(/\\/g,'/').toLowerCase():'';
  var isIndex=normalized.endsWith('/index.html')||normalized==='index.html';
  if(!isIndex)return originalSendFile.call(this,filePath,...args);
  var response=this,originalSend=response.send;
  response.send=function aiNavigationVisualSend(body){
    try{return originalSend.call(this,inject(body));}catch(error){console.error('[AI NAVIGATION VISUAL]',error.message);return originalSend.call(this,body)}};
  try{return originalSendFile.call(this,filePath,...args)}finally{response.send=originalSend}
};

console.log('[AI NAVIGATION VISUAL] module loaded');
