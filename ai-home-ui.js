const express = require('express');

const originalSendFile = express.response.sendFile;

const homeMarkup = `
<style id="ai-music-home-style">
#ai-gifts-home{min-height:100vh;padding:12px 12px 20px;background:radial-gradient(520px 300px at 50% -80px,rgba(157,91,255,.24),transparent 70%),linear-gradient(180deg,#080611 0%,#0f0a18 54%,#0b0712 100%);color:#fff;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow-x:hidden}
#ai-gifts-home *{box-sizing:border-box}
#ai-gifts-home .wrap{width:100%;max-width:560px;margin:0 auto}
.ai-home-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}
.ai-home-eyebrow{margin:0 0 4px;color:rgba(255,255,255,.42);font-size:8px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}
.home-title{margin:0;font-size:31px;line-height:1;letter-spacing:-.05em;font-weight:950;background:linear-gradient(90deg,#dfb2ff,#b992ff 48%,#7ce0ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.ai-home-status{display:flex;align-items:center;gap:6px;flex:0 0 auto;padding:7px 9px;border-radius:999px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07);color:rgba(255,255,255,.55);font-size:7px;font-weight:900}
.ai-home-status-dot{width:6px;height:6px;border-radius:50%;background:#7df1c7;box-shadow:0 0 12px rgba(125,241,199,.7)}
.ai-home-hero{position:relative;overflow:hidden;margin-bottom:13px;padding:19px 17px 18px;border-radius:24px;border:1px solid rgba(255,255,255,.09);background:linear-gradient(145deg,rgba(41,25,63,.95),rgba(15,10,24,.98));box-shadow:0 20px 50px rgba(0,0,0,.27)}
.ai-home-hero:before{content:"";position:absolute;width:200px;height:200px;right:-80px;top:-110px;border-radius:50%;background:radial-gradient(circle,rgba(173,113,255,.24),transparent 68%)}
.ai-home-hero:after{content:"";position:absolute;width:140px;height:140px;left:-80px;bottom:-100px;border-radius:50%;background:radial-gradient(circle,rgba(86,204,255,.12),transparent 70%)}
.ai-home-hero-inner{position:relative;z-index:1}
.ai-home-hero-kicker{display:inline-flex;align-items:center;gap:6px;padding:5px 8px;border-radius:999px;background:rgba(180,123,255,.10);border:1px solid rgba(180,123,255,.18);color:#d9bcff;font-size:7px;font-weight:950;letter-spacing:.10em;text-transform:uppercase}
.ai-home-hero-title{margin:10px 0 6px;font-size:22px;line-height:1.12;font-weight:950;letter-spacing:-.03em}
.ai-home-hero-text{margin:0;color:rgba(255,255,255,.55);font-size:10px;line-height:1.52}
.ai-home-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:13px}
.ai-home-chip{padding:6px 8px;border-radius:10px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.06);color:rgba(255,255,255,.68);font-size:7px;font-weight:850}
.home-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin:0 2px 8px}
.home-section-title{margin:0;font-size:11px;font-weight:950}
.home-section-subtitle{margin:3px 0 0;color:rgba(255,255,255,.36);font-size:7px}
.home-section-badge{padding:4px 7px;border-radius:999px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.06);color:rgba(255,255,255,.43);font-size:6.5px;font-weight:900}
.home-card{display:block;position:relative;overflow:hidden;width:100%;padding:0;border:1px solid rgba(255,255,255,.09);border-radius:24px;background:rgba(20,13,30,.88);color:#fff;text-align:left;cursor:pointer;box-shadow:0 18px 46px rgba(0,0,0,.25);transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}
.home-card:active{transform:scale(.988)}
.home-card:focus-visible{outline:2px solid rgba(190,137,255,.65);outline-offset:2px}
.home-art{height:176px;display:grid;place-items:center;position:relative;overflow:hidden;background:radial-gradient(circle at 50% 42%,rgba(211,139,255,.48),transparent 31%),linear-gradient(135deg,#3a1d69,#161024)}
.home-art:before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.06),transparent 45%,rgba(0,0,0,.12))}
.home-art-ring{position:absolute;width:116px;height:116px;border-radius:50%;border:1px solid rgba(255,255,255,.12);box-shadow:0 0 60px rgba(178,109,255,.18)}
.home-orb{position:relative;z-index:1;width:74px;height:74px;border-radius:23px;display:grid;place-items:center;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);box-shadow:0 15px 34px rgba(0,0,0,.18);font-size:31px;animation:homeFloat 3.2s ease-in-out infinite}
.home-chip{position:absolute;left:11px;bottom:11px;padding:5px 7px;border-radius:999px;background:rgba(5,2,12,.42);border:1px solid rgba(255,255,255,.10);font-size:6px;font-weight:950;letter-spacing:.10em;text-transform:uppercase;color:rgba(255,255,255,.67)}
.home-ready{position:absolute;right:11px;top:11px;padding:5px 7px;border-radius:999px;background:rgba(123,241,197,.09);border:1px solid rgba(123,241,197,.15);color:#9af5d1;font-size:6px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}
.home-body{padding:15px 15px 16px}
.home-kicker{font-size:16px;font-weight:950;letter-spacing:-.02em}
.home-desc{margin:7px 0 12px;color:rgba(255,255,255,.47);font-size:9px;line-height:1.45}
.home-link{display:flex;align-items:center;justify-content:space-between;color:#d6b8ff;font-size:9px;font-weight:950}
.home-arrow{width:25px;height:25px;border-radius:9px;display:grid;place-items:center;background:rgba(180,123,255,.10);border:1px solid rgba(180,123,255,.15);color:#e2cbff;font-size:12px}
.home-showcase{margin-top:13px;padding:12px;border-radius:20px;background:rgba(18,12,27,.72);border:1px solid rgba(255,255,255,.07)}
.home-showcase-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.home-sample{min-height:76px;padding:10px;border-radius:16px;border:1px solid rgba(255,255,255,.07);background:linear-gradient(145deg,rgba(255,255,255,.035),rgba(255,255,255,.015));display:flex;align-items:center;gap:9px}
.home-sample-art{width:42px;height:42px;flex:0 0 42px;border-radius:13px;display:grid;place-items:center;font-size:17px;background:radial-gradient(circle at 32% 25%,rgba(255,255,255,.25),rgba(137,81,231,.38) 47%,rgba(21,13,38,.95))}
.home-sample-text{min-width:0}
.home-sample-text span{display:block;color:rgba(255,255,255,.40);font-size:6.5px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
.home-sample-text strong{display:block;margin-top:4px;font-size:8.5px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.home-sample-text small{display:block;margin-top:4px;color:rgba(255,255,255,.28);font-size:6.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.home-footer{padding:13px 7px 4px;text-align:center;color:rgba(255,255,255,.32);font-size:7px;line-height:1.6}
.home-footer strong{color:rgba(255,255,255,.60)}
.home-footer a{color:rgba(207,172,255,.76);text-decoration:none}
.home-footer .mail{color:rgba(140,221,255,.68)}
@keyframes homeFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@media(max-width:390px){.home-title{font-size:29px}.ai-home-hero{padding:16px 14px}.ai-home-hero-title{font-size:19px}.home-art{height:156px}.home-body{padding:12px}.home-showcase-grid{grid-template-columns:1fr}.home-sample{min-height:70px}}
@media(prefers-reduced-motion:reduce){.home-orb{animation:none}}
</style>
<div id="ai-gifts-home">
  <div class="wrap">
    <div class="ai-home-top">
      <div>
        <p class="ai-home-eyebrow">Персональная музыка с AI</p>
        <h1 class="home-title">Песня в подарок</h1>
      </div>
      <div class="ai-home-status"><span class="ai-home-status-dot"></span> Сервис онлайн</div>
    </div>

    <section class="ai-home-hero">
      <div class="ai-home-hero-inner">
        <div class="ai-home-hero-kicker">✨ Создайте песню, которую запомнят</div>
        <h2 class="ai-home-hero-title">Песня не из шаблона.<br>Песня про вашего человека.</h2>
        <p class="ai-home-hero-text">Опишите человека, вашу историю и настроение — сервис создаст персональную песню через AI.</p>
        <div class="ai-home-chips">
          <span class="ai-home-chip">🎵 Персональный текст</span>
          <span class="ai-home-chip">🎙️ Выбор вокала</span>
          <span class="ai-home-chip">💳 Оплата через Robokassa</span>
        </div>
      </div>
    </section>

    <div class="home-section-head">
      <div>
        <h3 class="home-section-title">Создайте свою песню</h3>
        <p class="home-section-subtitle">Готово к заказу прямо сейчас</p>
      </div>
      <div class="home-section-badge">AI Music</div>
    </div>

    <button class="home-card" id="ai-home-song" type="button">
      <div class="home-art">
        <div class="home-art-ring"></div>
        <div class="home-orb">🎵</div>
        <span class="home-chip">AI Music</span>
        <span class="home-ready">Готово</span>
      </div>
      <div class="home-body">
        <div class="home-kicker">Песня под заказ</div>
        <div class="home-desc">Опишите человека, повод и чувства. Сгенерируем песню, покажем демо и дадим выбрать вариант перед покупкой.</div>
        <div class="home-link"><span>Создать песню</span><span class="home-arrow">→</span></div>
      </div>
    </button>

    <div class="home-section-head" style="margin-top:14px">
      <div>
        <h3 class="home-section-title">Примеры</h3>
        <p class="home-section-subtitle">Что можно заказать</p>
      </div>
      <div class="home-section-badge">🎵 Music</div>
    </div>

    <section class="home-showcase">
      <div class="home-showcase-grid">
        <div class="home-sample"><div class="home-sample-art">🎙️</div><div class="home-sample-text"><span>Песня</span><strong>Спасибо, мама</strong><small>Очень личная история</small></div></div>
        <div class="home-sample"><div class="home-sample-art">💫</div><div class="home-sample-text"><span>Песня</span><strong>С днём рождения</strong><small>Праздничное поздравление</small></div></div>
        <div class="home-sample"><div class="home-sample-art">❤️</div><div class="home-sample-text"><span>Песня</span><strong>Наша история</strong><small>Подарок для двоих</small></div></div>
        <div class="home-sample"><div class="home-sample-art">🎸</div><div class="home-sample-text"><span>Песня</span><strong>Песня для друга</strong><small>С юмором и характером</small></div></div>
      </div>
    </section>

    <footer class="home-footer">
      <strong>ИП Титаренко Алексей Викторович</strong><br>
      ИНН 384908759582 · <a href="https://max-song-app-v3-tehnopark.amvera.io/oferta.html">Публичная оферта</a><br>
      <a class="mail" href="mailto:cbklexa@mail.ru">cbklexa@mail.ru</a>
    </footer>
  </div>
</div>

<script>(function(){
  function backButton(){try{return window.WebApp&&window.WebApp.BackButton||null}catch(e){return null}}
  function hideBack(){try{var bb=backButton();if(bb&&typeof bb.hide==='function')bb.hide()}catch(e){}}
  function showHome(){var app=document.querySelector('.app'),home=document.getElementById('ai-gifts-home');if(!app||!home)return;window.__AI_SONG_SCREEN__=false;home.style.display='block';app.style.display='none';hideBack();window.scrollTo(0,0)}
  function showSong(){var app=document.querySelector('.app'),home=document.getElementById('ai-gifts-home');if(!app||!home)return;window.__AI_SONG_SCREEN__=true;home.style.display='none';app.style.display='block';try{var bb=backButton();if(bb&&typeof bb.show==='function')bb.show();if(bb&&typeof bb.onClick==='function'&&!bb.__aiMusicHomeBound){bb.__aiMusicHomeBound=true;bb.onClick(showHome)}}catch(e){}window.scrollTo(0,0)}
  function init(){var app=document.querySelector('.app'),home=document.getElementById('ai-gifts-home');if(!app||!home)return;var song=document.getElementById('ai-home-song');if(song&&!song.dataset.musicHomeBound){song.dataset.musicHomeBound='1';song.addEventListener('click',function(e){e.preventDefault();showSong()})}showHome()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();</script>`;

express.response.sendFile=function patchedSendFile(filePath,...args){
  const name=String(filePath||'');
  const isIndex=name.endsWith('/index.html')||name.endsWith('index.html');
  if(!isIndex)return originalSendFile.call(this,filePath,...args);
  const response=this;
  const originalSend=response.send;
  response.send=function aiMusicHomeSend(body){
    try{
      if(typeof body==='string'&&body.includes('<body')){
        return originalSend.call(this,body.replace(/<body([^>]*)>/i,(tag)=>tag+homeMarkup));
      }
    }catch(error){console.error('[AI MUSIC HOME]',error.message)}
    return originalSend.call(this,body);
  };
  try{return originalSendFile.call(this,filePath,...args)}finally{response.send=originalSend}
};

console.log('[AI HOME UI] music-only module loaded');
