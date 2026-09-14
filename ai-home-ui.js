const express = require('express');

const originalSendFile = express.response.sendFile;

const homeMarkup = `
<style id="ai-music-home-style">
#ai-gifts-home{min-height:100vh;padding:14px 12px 22px;background:radial-gradient(520px 260px at 50% -70px,rgba(155,92,255,.18),transparent 72%),linear-gradient(180deg,#09070f 0%,#0d0a14 55%,#09070e 100%);color:#fff;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow-x:hidden}
#ai-gifts-home *{box-sizing:border-box}
#ai-gifts-home .wrap{width:100%;max-width:560px;margin:0 auto}
.ai-home-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin:0 1px 12px}
.home-title{margin:0;font-size:28px;line-height:1;letter-spacing:-.05em;font-weight:950;background:linear-gradient(100deg,#fff,#d8c5ff 48%,#a8e6ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.ai-home-title-sub{margin:5px 0 0;color:rgba(255,255,255,.35);font-size:8px;font-weight:750}
.ai-home-status{display:flex;align-items:center;gap:6px;flex:0 0 auto;margin-top:2px;padding:7px 9px;border-radius:999px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);color:rgba(255,255,255,.52);font-size:7px;font-weight:850}
.ai-home-status-dot{width:6px;height:6px;border-radius:50%;background:#79e7bd;box-shadow:0 0 12px rgba(121,231,189,.7)}
#ai-home-account{margin:0 0 13px}
.home-hero-card{position:relative;overflow:hidden;width:100%;border:1px solid rgba(255,255,255,.12);border-radius:28px;background:#100c16;box-shadow:0 22px 64px rgba(0,0,0,.36),0 0 40px rgba(145,72,255,.08);cursor:pointer;text-align:left;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
.home-hero-card:active{transform:scale(.992);box-shadow:0 16px 42px rgba(0,0,0,.38),0 0 32px rgba(145,72,255,.12)}
.home-hero-card:focus-visible{outline:2px solid rgba(198,147,255,.75);outline-offset:3px}
.home-hero-media{position:relative;height:clamp(320px,84vw,470px);overflow:hidden;background:#17101d}
.home-hero-media img{width:100%;height:100%;display:block;object-fit:cover;object-position:center;transform:scale(1.015);transition:transform .65s cubic-bezier(.2,.7,.2,1),filter .35s ease}
.home-hero-card:hover .home-hero-media img{transform:scale(1.035)}
.home-hero-media:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,3,9,.04) 0%,rgba(5,3,9,.02) 38%,rgba(5,3,9,.60) 72%,rgba(5,3,9,.94) 100%);pointer-events:none}
.home-hero-glow{position:absolute;left:10%;right:10%;bottom:-55px;height:130px;background:radial-gradient(ellipse at center,rgba(188,112,255,.30),transparent 68%);filter:blur(16px);pointer-events:none}
.home-hero-content{position:absolute;left:17px;right:17px;bottom:16px;z-index:2}
.home-hero-kicker{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border-radius:999px;background:rgba(8,5,14,.50);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);color:rgba(255,255,255,.76);font-size:7px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
.home-hero-title{margin:10px 0 5px;font-size:25px;line-height:1.03;letter-spacing:-.04em;font-weight:950;text-shadow:0 8px 26px rgba(0,0,0,.45)}
.home-hero-text{margin:0;max-width:390px;color:rgba(255,255,255,.70);font-size:9px;line-height:1.45}
.home-hero-action{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px}
.home-hero-action-label{font-size:10px;font-weight:950;color:#fff}
.home-hero-arrow{width:34px;height:34px;display:grid;place-items:center;flex:0 0 34px;border-radius:12px;background:linear-gradient(135deg,#8c48ff,#b15cff);box-shadow:0 10px 25px rgba(145,72,255,.34);font-size:15px;font-weight:900}
.home-section{margin-top:15px}
.home-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin:0 2px 8px}
.home-section-title{margin:0;font-size:12px;font-weight:950;letter-spacing:-.02em}
.home-section-subtitle{margin:3px 0 0;color:rgba(255,255,255,.33);font-size:7px}
.home-section-badge{padding:4px 7px;border-radius:999px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.06);color:rgba(255,255,255,.40);font-size:6.5px;font-weight:900}
.home-carousel{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding:2px 2px 5px}
.home-carousel::-webkit-scrollbar{display:none}
.home-sample{position:relative;flex:0 0 86%;min-width:0;scroll-snap-align:start;padding:13px;border-radius:20px;background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.018));border:1px solid rgba(255,255,255,.075);box-shadow:0 14px 36px rgba(0,0,0,.20)}
.home-sample-top{display:flex;align-items:center;gap:10px}
.home-sample-art{width:48px;height:48px;flex:0 0 48px;border-radius:15px;display:grid;place-items:center;background:radial-gradient(circle at 30% 24%,rgba(255,255,255,.22),rgba(143,82,238,.40) 48%,rgba(24,14,40,.98));font-size:18px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
.home-sample-text{min-width:0;flex:1}
.home-sample-text span{display:block;color:rgba(255,255,255,.38);font-size:6.5px;font-weight:850;letter-spacing:.08em;text-transform:uppercase}
.home-sample-text strong{display:block;margin-top:4px;font-size:11px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.home-sample-text small{display:block;margin-top:4px;color:rgba(255,255,255,.31);font-size:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.home-sample-player{display:flex;align-items:center;gap:9px;margin-top:12px;padding:9px 10px;border-radius:14px;background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.05)}
.home-sample-play{width:32px;height:32px;flex:0 0 32px;border-radius:10px;display:grid;place-items:center;background:rgba(161,94,255,.14);border:1px solid rgba(181,125,255,.20);color:#e1ccff;font-size:12px}
.home-sample-track{flex:1;min-width:0}
.home-sample-track-line{height:4px;border-radius:999px;background:rgba(255,255,255,.10);overflow:hidden}
.home-sample-track-line:after{content:"";display:block;width:34%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#9250ff,#c06bff)}
.home-sample-time{display:flex;justify-content:space-between;margin-top:4px;color:rgba(255,255,255,.24);font-size:6.5px}
.home-sample-note{margin-top:8px;color:rgba(255,255,255,.28);font-size:6.5px}
.home-footer{padding:17px 7px 4px;text-align:center;color:rgba(255,255,255,.27);font-size:7px;line-height:1.6}
.home-footer strong{color:rgba(255,255,255,.56)}
.home-footer a{color:rgba(207,172,255,.70);text-decoration:none}
.home-footer .mail{color:rgba(140,221,255,.62)}
@media(max-width:390px){.home-title{font-size:26px}.home-hero-media{height:330px}.home-hero-title{font-size:22px}.home-hero-content{left:14px;right:14px;bottom:13px}.home-sample{flex-basis:89%}}
@media(prefers-reduced-motion:reduce){.home-hero-media img{transition:none}}
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
          <h3 class="home-section-title">Примеры</h3>
          <p class="home-section-subtitle">Листайте и слушайте формат подарка</p>
        </div>
        <div class="home-section-badge">Music</div>
      </div>
      <div class="home-carousel" aria-label="Примеры песен">
        <article class="home-sample"><div class="home-sample-top"><div class="home-sample-art">🎙️</div><div class="home-sample-text"><span>Персональная песня</span><strong>Спасибо, мама</strong><small>Тёплое семейное поздравление</small></div></div><div class="home-sample-player"><button class="home-sample-play" type="button" aria-label="Воспроизвести">▶</button><div class="home-sample-track"><div class="home-sample-track-line"></div><div class="home-sample-time"><span>0:00</span><span>0:30</span></div></div></div><div class="home-sample-note">Демо из созданных пользователями песен</div></article>
        <article class="home-sample"><div class="home-sample-top"><div class="home-sample-art">💫</div><div class="home-sample-text"><span>Праздничная</span><strong>С днём рождения</strong><small>Яркое музыкальное поздравление</small></div></div><div class="home-sample-player"><button class="home-sample-play" type="button" aria-label="Воспроизвести">▶</button><div class="home-sample-track"><div class="home-sample-track-line"></div><div class="home-sample-time"><span>0:00</span><span>0:30</span></div></div></div><div class="home-sample-note">Здесь позже подключаются реальные демо</div></article>
        <article class="home-sample"><div class="home-sample-top"><div class="home-sample-art">❤️</div><div class="home-sample-text"><span>История пары</span><strong>Наша история</strong><small>Романтичный персональный трек</small></div></div><div class="home-sample-player"><button class="home-sample-play" type="button" aria-label="Воспроизвести">▶</button><div class="home-sample-track"><div class="home-sample-track-line"></div><div class="home-sample-time"><span>0:00</span><span>0:30</span></div></div></div><div class="home-sample-note">Формат примера для будущего аудиокаталога</div></article>
      </div>
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
  function init(){var app=document.querySelector('.app'),home=document.getElementById('ai-gifts-home');if(!app||!home)return;showHome()}
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
