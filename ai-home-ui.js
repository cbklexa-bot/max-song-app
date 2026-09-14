const express = require('express');

const originalSendFile = express.response.sendFile;

const homeMarkup = `
<style id="ai-music-home-style">
#ai-gifts-home{min-height:100vh;padding:16px 12px 24px;background:radial-gradient(620px 300px at 50% -90px,rgba(104,194,255,.12),transparent 62%),radial-gradient(520px 360px at 85% 52%,rgba(143,74,255,.11),transparent 70%),linear-gradient(180deg,#070910 0%,#090c14 48%,#070a11 100%);color:#fff;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow-x:hidden}
#ai-gifts-home *{box-sizing:border-box}
#ai-gifts-home .wrap{width:100%;max-width:560px;margin:0 auto}
.ai-home-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin:0 1px 14px}
.home-title{position:relative;margin:0;font-size:29px;line-height:1;letter-spacing:-.055em;font-weight:950;background:linear-gradient(100deg,#fff 0%,#e7f8ff 28%,#c8dbff 58%,#a9e9ff 100%);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 0 30px rgba(112,210,255,.16),0 0 58px rgba(142,86,255,.12)}
.home-title:after{content:"";position:absolute;left:0;right:18%;bottom:-8px;height:2px;border-radius:999px;background:linear-gradient(90deg,rgba(103,214,255,.85),rgba(173,101,255,.55),transparent);box-shadow:0 0 18px rgba(100,203,255,.45);opacity:.9}
.ai-home-title-sub{margin:10px 0 0;color:rgba(224,241,255,.44);font-size:8px;font-weight:800}
.ai-home-status{display:flex;align-items:center;gap:6px;flex:0 0 auto;margin-top:2px;padding:7px 9px;border-radius:999px;background:rgba(255,255,255,.045);border:1px solid rgba(144,213,255,.13);box-shadow:0 0 22px rgba(93,193,255,.08);color:rgba(232,247,255,.61);font-size:7px;font-weight:850}
.ai-home-status-dot{width:6px;height:6px;border-radius:50%;background:#79e7bd;box-shadow:0 0 12px rgba(121,231,189,.85),0 0 24px rgba(121,231,189,.3)}
#ai-home-account{margin:0 0 14px}
.home-hero-card{position:relative;overflow:hidden;width:100%;border:1px solid rgba(165,221,255,.23);border-radius:29px;background:#0b0f18;box-shadow:0 24px 70px rgba(0,0,0,.44),0 0 0 1px rgba(113,188,255,.05),0 0 48px rgba(86,177,255,.11),0 0 90px rgba(143,74,255,.08);cursor:pointer;text-align:left;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
.home-hero-card:before{content:"";position:absolute;z-index:3;left:10%;right:10%;top:0;height:2px;background:linear-gradient(90deg,transparent,rgba(145,231,255,.96),rgba(184,117,255,.90),transparent);box-shadow:0 0 22px rgba(121,210,255,.75)}
.home-hero-card:after{content:"";position:absolute;z-index:3;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px rgba(255,255,255,.03),inset 0 0 70px rgba(97,186,255,.045);pointer-events:none}
.home-hero-card:active{transform:scale(.992);box-shadow:0 17px 48px rgba(0,0,0,.46),0 0 54px rgba(86,177,255,.16),0 0 100px rgba(143,74,255,.11)}
.home-hero-card:focus-visible{outline:2px solid rgba(150,224,255,.82);outline-offset:3px}
.home-hero-media{position:relative;height:clamp(320px,84vw,470px);overflow:hidden;background:#121926}
.home-hero-media img{width:100%;height:100%;display:block;object-fit:cover;object-position:center;transform:scale(1.015);transition:transform .65s cubic-bezier(.2,.7,.2,1),filter .35s ease}
.home-hero-card:hover .home-hero-media img{transform:scale(1.035);filter:saturate(1.06) contrast(1.02)}
.home-hero-media:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(2,7,14,.03) 0%,rgba(2,7,14,.02) 36%,rgba(3,7,14,.56) 70%,rgba(3,6,13,.95) 100%);pointer-events:none}
.home-hero-glow{position:absolute;left:7%;right:7%;bottom:-48px;height:120px;background:radial-gradient(ellipse at center,rgba(115,210,255,.25),rgba(159,89,255,.15) 38%,transparent 70%);filter:blur(18px);pointer-events:none}
.home-hero-content{position:absolute;left:17px;right:17px;bottom:16px;z-index:4}
.home-hero-kicker{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border-radius:999px;background:rgba(5,10,18,.55);border:1px solid rgba(178,227,255,.16);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:rgba(236,249,255,.78);font-size:7px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;box-shadow:0 0 20px rgba(100,203,255,.07)}
.home-hero-title{margin:10px 0 5px;font-size:25px;line-height:1.03;letter-spacing:-.04em;font-weight:950;text-shadow:0 8px 30px rgba(0,0,0,.50),0 0 18px rgba(149,207,255,.11)}
.home-hero-text{margin:0;max-width:390px;color:rgba(239,248,255,.72);font-size:9px;line-height:1.45}
.home-hero-action{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px}
.home-hero-action-label{font-size:10px;font-weight:950;color:#fff;text-shadow:0 0 15px rgba(160,226,255,.18)}
.home-hero-arrow{width:36px;height:36px;display:grid;place-items:center;flex:0 0 36px;border-radius:13px;background:linear-gradient(135deg,#54c8ff,#8460ff 62%,#ad5bff);box-shadow:0 10px 26px rgba(73,186,255,.20),0 0 22px rgba(133,91,255,.24);font-size:15px;font-weight:900}
.home-section{margin-top:18px}
.home-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin:0 2px 8px}
.home-section-title{margin:0;font-size:13px;font-weight:950;letter-spacing:-.025em;text-shadow:0 0 16px rgba(150,218,255,.11)}
.home-section-subtitle{margin:3px 0 0;color:rgba(218,238,255,.38);font-size:7px}
.home-section-badge{padding:4px 7px;border-radius:999px;background:rgba(100,195,255,.05);border:1px solid rgba(120,210,255,.11);color:rgba(203,237,255,.48);font-size:6.5px;font-weight:900;box-shadow:0 0 18px rgba(93,193,255,.06)}
.home-carousel{position:relative;display:flex;gap:5px;align-items:center;height:258px;padding:4px 2px 10px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:none;perspective:1000px}
.home-carousel::-webkit-scrollbar{display:none}
.home-sample{--orb:#63d6ff;--orb2:#755dff;position:relative;flex:0 0 68%;min-width:0;height:224px;scroll-snap-align:center;padding:0;border-radius:50%;overflow:hidden;background:radial-gradient(circle at 34% 27%,rgba(255,255,255,.33) 0%,rgba(255,255,255,.08) 8%,transparent 22%),radial-gradient(circle at 42% 42%,rgba(255,255,255,.055),transparent 46%),radial-gradient(circle at 50% 62%,color-mix(in srgb,var(--orb) 28%,transparent),transparent 62%),linear-gradient(145deg,rgba(255,255,255,.075),rgba(255,255,255,.02));border:1px solid color-mix(in srgb,var(--orb) 46%,rgba(255,255,255,.12));box-shadow:0 18px 48px rgba(0,0,0,.38),0 0 35px color-mix(in srgb,var(--orb) 23%,transparent),inset 0 0 32px rgba(255,255,255,.045);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);transition:transform .55s ease,opacity .55s ease,filter .55s ease;isolation:isolate}
.home-sample:before{content:"";position:absolute;inset:7px;border-radius:50%;border:1px solid rgba(255,255,255,.08);box-shadow:inset 0 0 20px rgba(255,255,255,.03);pointer-events:none}
.home-sample:after{content:"";position:absolute;left:16%;right:16%;top:11%;height:19%;border-radius:999px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.20),rgba(156,228,255,.22),transparent);filter:blur(5px);transform:rotate(-18deg);pointer-events:none}
.home-sample:nth-child(2){--orb:#77b7ff;--orb2:#5fd6ff}
.home-sample:nth-child(3){--orb:#c16dff;--orb2:#6f6dff}
.home-sample.is-active{transform:translateY(-7px) scale(1.05);filter:saturate(1.12);z-index:2}
.home-sample:not(.is-active){opacity:.58;transform:scale(.88);z-index:1}
.home-sample-top{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;z-index:2;padding:36px 20px 28px}
.home-sample-art{width:58px;height:58px;border-radius:50%;display:grid;place-items:center;margin:0 auto 12px;background:radial-gradient(circle at 34% 24%,rgba(255,255,255,.34),color-mix(in srgb,var(--orb) 45%,transparent) 44%,rgba(7,14,24,.66) 76%);border:1px solid rgba(255,255,255,.15);box-shadow:0 0 26px color-mix(in srgb,var(--orb) 26%,transparent),inset 0 0 18px rgba(255,255,255,.07);font-size:21px}
.home-sample-text{min-width:0;width:100%}
.home-sample-text span{display:block;color:rgba(225,243,255,.44);font-size:6.5px;font-weight:850;letter-spacing:.10em;text-transform:uppercase}
.home-sample-text strong{display:block;margin-top:6px;font-size:14px;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 0 20px color-mix(in srgb,var(--orb) 20%,transparent)}
.home-sample-text small{display:block;margin-top:5px;color:rgba(225,241,255,.36);font-size:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.home-sample-player{position:absolute;left:24px;right:24px;bottom:24px;display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:999px;background:rgba(3,9,17,.42);border:1px solid rgba(178,230,255,.10);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.home-sample-play{width:27px;height:27px;flex:0 0 27px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,color-mix(in srgb,var(--orb) 54%,#1b2440),color-mix(in srgb,var(--orb2) 64%,#1b1738));border:1px solid rgba(216,243,255,.16);color:#f2fbff;font-size:9px;box-shadow:0 0 18px color-mix(in srgb,var(--orb) 24%,transparent)}
.home-sample-track{flex:1;min-width:0}
.home-sample-track-line{height:3px;border-radius:999px;background:rgba(255,255,255,.09);overflow:hidden}
.home-sample-track-line:after{content:"";display:block;width:34%;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--orb),var(--orb2));box-shadow:0 0 12px color-mix(in srgb,var(--orb) 30%,transparent)}
.home-sample-time{display:flex;justify-content:space-between;margin-top:3px;color:rgba(226,242,255,.25);font-size:5.8px}
.home-sample-note{display:none}
.home-carousel-hint{margin:0;text-align:center;color:rgba(199,230,248,.27);font-size:6.5px;letter-spacing:.03em}
.home-footer{padding:17px 7px 4px;text-align:center;color:rgba(211,232,246,.27);font-size:7px;line-height:1.6}
.home-footer strong{color:rgba(231,246,255,.56)}
.home-footer a{color:rgba(181,225,255,.70);text-decoration:none}
.home-footer .mail{color:rgba(140,221,255,.62)}
@media(max-width:390px){.home-title{font-size:26px}.home-hero-media{height:330px}.home-hero-title{font-size:22px}.home-hero-content{left:14px;right:14px;bottom:13px}.home-carousel{height:236px}.home-sample{flex-basis:72%;height:205px}.home-sample-player{left:20px;right:20px;bottom:20px}.home-sample-art{width:52px;height:52px;font-size:18px}}
@media(min-width:520px){.home-sample{flex-basis:58%}}
@media(prefers-reduced-motion:reduce){.home-hero-media img,.home-sample{transition:none}}
</style>
<div id="ai-gifts-home">
  <div class="wrap">
    <div class="ai-home-top">
      <div>
        <h1 class="home-title">Песня в подарок</h1>
        <p class="ai-home-title-sub">Персональная музыка с AI</p>
      </div>
      <div class="ai-home-status"><span class="ai-home-status-dot"></span> онлайн</div>
    </div>

    <div id="ai-home-account"></div>

    <button class="home-hero-card" id="ai-home-song" type="button" aria-label="Создать песню">
      <div class="home-hero-media">
        <img src="/assets/песня%20в%20подарок.jpg" alt="Певица с микрофоном" loading="eager" decoding="async">
        <div class="home-hero-glow"></div>
      </div>
      <div class="home-hero-content">
        <div class="home-hero-kicker">AI music · персональный подарок</div>
        <h2 class="home-hero-title">Создайте свою песню</h2>
        <p class="home-hero-text">Опишите человека, повод и настроение — получите песню, созданную именно для него.</p>
        <div class="home-hero-action"><span class="home-hero-action-label">Создать песню</span><span class="home-hero-arrow">→</span></div>
      </div>
    </button>

    <section class="home-section">
      <div class="home-section-head">
        <div>
          <h3 class="home-section-title">Готовые работы</h3>
          <p class="home-section-subtitle">Песни, созданные в приложении</p>
        </div>
        <div class="home-section-badge">AI MUSIC</div>
      </div>
      <div class="home-carousel" id="home-orb-carousel" aria-label="Готовые работы">
        <article class="home-sample is-active" data-index="0"><div class="home-sample-top"><div><div class="home-sample-art">♪</div><div class="home-sample-text"><span>Персональная песня</span><strong>Спасибо, мама</strong><small>Тёплое семейное поздравление</small></div></div></div><div class="home-sample-player"><button class="home-sample-play" type="button" aria-label="Воспроизвести">▶</button><div class="home-sample-track"><div class="home-sample-track-line"></div><div class="home-sample-time"><span>0:00</span><span>0:30</span></div></div></div></article>
        <article class="home-sample" data-index="1"><div class="home-sample-top"><div><div class="home-sample-art">♫</div><div class="home-sample-text"><span>Праздничная</span><strong>С днём рождения</strong><small>Яркое музыкальное поздравление</small></div></div></div><div class="home-sample-player"><button class="home-sample-play" type="button" aria-label="Воспроизвести">▶</button><div class="home-sample-track"><div class="home-sample-track-line"></div><div class="home-sample-time"><span>0:00</span><span>0:30</span></div></div></div></article>
        <article class="home-sample" data-index="2"><div class="home-sample-top"><div><div class="home-sample-art">♬</div><div class="home-sample-text"><span>История пары</span><strong>Наша история</strong><small>Романтичный персональный трек</small></div></div></div><div class="home-sample-player"><button class="home-sample-play" type="button" aria-label="Воспроизвести">▶</button><div class="home-sample-track"><div class="home-sample-track-line"></div><div class="home-sample-time"><span>0:00</span><span>0:30</span></div></div></div></article>
      </div>
      <p class="home-carousel-hint">Витрина будет пополняться реальными песнями</p>
    </section>

    <footer class="home-footer">
      <strong>ИП Титаренко Алексей Викторович</strong><br>
      ИНН 384908759582 · <a href="/oferta.html" target="_blank" rel="noopener">Публичная оферта</a><br>
      <a class="mail" href="mailto:cbklexa@gmail.com">cbklexa@gmail.com</a>
    </footer>
  </div>
</div>

<script>(function(){
  function backButton(){try{return window.WebApp&&window.WebApp.BackButton||null}catch(e){return null}}
  function hideBack(){try{var bb=backButton();if(bb&&typeof bb.hide==='function')bb.hide()}catch(e){}}
  function showHome(){var app=document.querySelector('.app'),home=document.getElementById('ai-gifts-home');if(!app||!home)return;window.__AI_SONG_SCREEN__=false;home.style.display='block';app.style.display='none';hideBack();window.scrollTo(0,0)}
  function prepareSong(){var app=document.querySelector('.app'),home=document.getElementById('ai-gifts-home');if(!app||!home)return;window.__AI_SONG_SCREEN__=true;home.style.display='none';app.style.display='block';try{var bb=backButton();if(bb&&typeof bb.show==='function')bb.show();if(bb&&typeof bb.onClick==='function'&&!bb.__aiMusicHomeBound){bb.__aiMusicHomeBound=true;bb.onClick(showHome)}}catch(e){}window.scrollTo(0,0)}
  function initCarousel(){var carousel=document.getElementById('home-orb-carousel');if(!carousel||carousel.dataset.orbBound==='1')return;carousel.dataset.orbBound='1';var items=Array.from(carousel.querySelectorAll('.home-sample'));if(items.length<2)return;var index=0,timer=null,paused=false;function activate(next){index=(next+items.length)%items.length;items.forEach(function(item,i){item.classList.toggle('is-active',i===index)});var item=items[index];var left=item.offsetLeft-(carousel.clientWidth-item.offsetWidth)/2;carousel.scrollTo({left:Math.max(0,left),behavior:'smooth'})}function schedule(){clearTimeout(timer);if(document.hidden)return;timer=setTimeout(function(){if(!paused)activate(index+1);schedule()},4200)}function stop(){paused=true;clearTimeout(timer)}function resume(){paused=false;schedule()}carousel.addEventListener('pointerdown',stop,{passive:true});carousel.addEventListener('touchstart',stop,{passive:true});carousel.addEventListener('wheel',stop,{passive:true});carousel.addEventListener('pointerup',function(){setTimeout(resume,1800)},{passive:true});carousel.addEventListener('touchend',function(){setTimeout(resume,1800)},{passive:true});document.addEventListener('visibilitychange',function(){if(document.hidden)clearTimeout(timer);else schedule()});items.forEach(function(item,i){item.addEventListener('click',function(){activate(i);setTimeout(resume,1200)})});activate(0);schedule()}
  function init(){var app=document.querySelector('.app'),home=document.getElementById('ai-gifts-home');if(!app||!home)return;showHome();initCarousel()}
  window.__AI_HOME_SHOW_HOME__=showHome;
  window.__AI_HOME_PREPARE_SONG__=prepareSong;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();</script>
`;

function inject(body){
  if(typeof body!=='string' || !body.includes('<body'))return body;
  if(body.includes('ai-music-home-style'))return body;
  return body.replace(/<body[^>]*>/i,(match)=>match+'\n'+homeMarkup);
}

express.response.sendFile=function patchedSendFile(filePath,...args){
  const isIndex=typeof filePath==='string' && /(?:^|[\\/])index\.html$/i.test(filePath);
  if(!isIndex)return originalSendFile.call(this,filePath,...args);

  const response=this;
  const originalSend=response.send;
  response.send=function aiHomeUiSend(body){
    try{return originalSend.call(this,inject(body));}
    catch(error){console.error('[AI HOME UI]',error.message);return originalSend.call(this,body)}
  };

  try{return originalSendFile.call(this,filePath,...args)}
  finally{response.send=originalSend}
};

console.log('[AI HOME UI] redesigned home module loaded');
