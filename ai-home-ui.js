const express = require('express');

const originalSendFile = express.response.sendFile;

const homeCss = `
#ai-gifts-home{
  min-height:100vh;
  padding:10px 11px 18px;
  background:
    radial-gradient(520px 300px at 50% -70px,rgba(157,91,255,.24),transparent 70%),
    radial-gradient(420px 260px at 100% 28%,rgba(69,178,255,.10),transparent 72%),
    linear-gradient(180deg,#080611 0%,#0f0a18 52%,#0b0712 100%);
  color:#fff;
  font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  overflow-x:hidden
}
#ai-gifts-home *{box-sizing:border-box}
#ai-gifts-home .wrap{width:100%;max-width:560px;margin:0 auto}
.ai-home-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
.ai-home-brand{min-width:0}
.ai-home-eyebrow{margin:0 0 3px;color:rgba(255,255,255,.42);font-size:8px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}
.home-title{margin:0;font-size:34px;line-height:1;letter-spacing:-.05em;font-weight:950;background:linear-gradient(90deg,#dfb2ff,#b992ff 48%,#7ce0ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.ai-home-status{display:flex;align-items:center;gap:6px;flex:0 0 auto;padding:7px 9px;border-radius:999px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07);color:rgba(255,255,255,.55);font-size:7px;font-weight:900}
.ai-home-status-dot{width:6px;height:6px;border-radius:50%;background:#7df1c7;box-shadow:0 0 12px rgba(125,241,199,.7)}

.ai-home-hero{
  position:relative;
  overflow:hidden;
  margin-bottom:12px;
  padding:18px 17px 17px;
  border-radius:24px;
  border:1px solid rgba(255,255,255,.09);
  background:
    linear-gradient(145deg,rgba(41,25,63,.95),rgba(15,10,24,.98));
  box-shadow:0 20px 50px rgba(0,0,0,.27)
}
.ai-home-hero:before{
  content:"";
  position:absolute;
  width:190px;height:190px;
  right:-75px;top:-100px;
  border-radius:50%;
  background:radial-gradient(circle,rgba(173,113,255,.24),transparent 68%)
}
.ai-home-hero:after{
  content:"";
  position:absolute;
  width:130px;height:130px;
  left:-75px;bottom:-90px;
  border-radius:50%;
  background:radial-gradient(circle,rgba(86,204,255,.13),transparent 70%)
}
.ai-home-hero-inner{position:relative;z-index:1}
.ai-home-hero-kicker{display:inline-flex;align-items:center;gap:6px;padding:5px 8px;border-radius:999px;background:rgba(180,123,255,.10);border:1px solid rgba(180,123,255,.18);color:#d9bcff;font-size:7px;font-weight:950;letter-spacing:.10em;text-transform:uppercase}
.ai-home-hero-title{margin:10px 0 6px;font-size:21px;line-height:1.12;font-weight:950;letter-spacing:-.03em}
.ai-home-hero-text{margin:0;max-width:450px;color:rgba(255,255,255,.55);font-size:10px;line-height:1.5}
.ai-home-hero-glow{display:flex;gap:6px;margin-top:13px}
.ai-home-glow-chip{padding:6px 8px;border-radius:10px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.06);color:rgba(255,255,255,.66);font-size:7px;font-weight:850}

.home-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin:0 2px 8px}
.home-section-title{margin:0;font-size:11px;font-weight:950;letter-spacing:.02em}
.home-section-subtitle{margin:3px 0 0;color:rgba(255,255,255,.36);font-size:7px}
.home-section-badge{padding:4px 7px;border-radius:999px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.06);color:rgba(255,255,255,.43);font-size:6.5px;font-weight:900}

.home-types{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:13px}
.home-card{
  appearance:none;
  position:relative;
  overflow:hidden;
  min-width:0;
  border:1px solid rgba(255,255,255,.09);
  border-radius:22px;
  padding:0;
  background:rgba(20,13,30,.88);
  color:#fff;
  text-align:left;
  cursor:pointer;
  box-shadow:0 15px 38px rgba(0,0,0,.22);
  transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease
}
.home-card:active{transform:scale(.985)}
.home-card:hover{border-color:rgba(193,140,255,.27);box-shadow:0 18px 45px rgba(0,0,0,.28)}
.home-card:focus-visible{outline:2px solid rgba(190,137,255,.65);outline-offset:2px}
.home-art{height:118px;display:grid;place-items:center;position:relative;overflow:hidden}
.home-art:before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.06),transparent 45%,rgba(0,0,0,.10))}
.home-song-art{background:radial-gradient(circle at 50% 42%,rgba(211,139,255,.48),transparent 31%),linear-gradient(135deg,#3a1d69,#161024)}
.home-video-art{background:radial-gradient(circle at 58% 34%,rgba(94,196,255,.42),transparent 32%),linear-gradient(135deg,#172e5d,#111020)}
.home-art-ring{position:absolute;width:78px;height:78px;border-radius:50%;border:1px solid rgba(255,255,255,.12);box-shadow:0 0 45px rgba(178,109,255,.17)}
.home-video-art .home-art-ring{box-shadow:0 0 45px rgba(86,195,255,.15)}
.home-orb{width:56px;height:56px;border-radius:18px;display:grid;place-items:center;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);box-shadow:0 12px 32px rgba(0,0,0,.16);font-size:25px;animation:homeFloat 3.2s ease-in-out infinite}
.home-video-art .home-orb{animation-delay:-1.4s}
.home-chip{position:absolute;left:9px;bottom:9px;padding:5px 7px;border-radius:999px;background:rgba(5,2,12,.42);border:1px solid rgba(255,255,255,.10);font-size:6px;font-weight:950;letter-spacing:.10em;text-transform:uppercase;color:rgba(255,255,255,.67)}
.home-ready{position:absolute;right:9px;top:9px;padding:5px 7px;border-radius:999px;background:rgba(123,241,197,.09);border:1px solid rgba(123,241,197,.15);color:#9af5d1;font-size:6px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}
.home-soon{position:absolute;right:9px;top:9px;padding:5px 7px;border-radius:999px;background:rgba(255,194,91,.10);border:1px solid rgba(255,194,91,.15);color:#ffd68e;font-size:6px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}
.home-body{padding:11px 11px 12px}
.home-kicker{font-size:10px;font-weight:950}
.home-desc{margin:6px 0 9px;color:rgba(255,255,255,.47);font-size:8.5px;line-height:1.38;min-height:34px}
.home-link{display:flex;align-items:center;justify-content:space-between;color:#d6b8ff;font-size:8px;font-weight:950}
.home-arrow{width:22px;height:22px;border-radius:8px;display:grid;place-items:center;background:rgba(180,123,255,.10);border:1px solid rgba(180,123,255,.15);color:#e2cbff;font-size:11px}

.home-showcase{margin-top:2px;margin-bottom:12px;padding:12px;border-radius:20px;background:rgba(18,12,27,.72);border:1px solid rgba(255,255,255,.07)}
.home-marquee-viewport{overflow:hidden;border-radius:15px}
.home-marquee{display:flex;gap:8px;width:max-content;animation:aiGiftMarquee 34s linear infinite;will-change:transform}
.home-marquee:hover{animation-play-state:paused}
.home-sample{width:176px;min-height:80px;padding:10px;border-radius:16px;border:1px solid rgba(255,255,255,.07);background:linear-gradient(145deg,rgba(255,255,255,.035),rgba(255,255,255,.015));display:flex;align-items:center;gap:9px}
.home-sample-art{width:44px;height:44px;flex:0 0 44px;border-radius:14px;display:grid;place-items:center;font-size:18px;background:radial-gradient(circle at 32% 25%,rgba(255,255,255,.25),rgba(137,81,231,.38) 47%,rgba(21,13,38,.95))}
.home-sample-video .home-sample-art{background:radial-gradient(circle at 32% 25%,rgba(255,255,255,.24),rgba(46,145,220,.38) 47%,rgba(12,23,46,.95))}
.home-sample-text{min-width:0}
.home-sample-text span{display:block;color:rgba(255,255,255,.40);font-size:6.5px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
.home-sample-text strong{display:block;margin-top:4px;font-size:8.5px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.home-sample-text small{display:block;margin-top:4px;color:rgba(255,255,255,.28);font-size:6.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.home-footer{padding:13px 7px 4px;text-align:center;color:rgba(255,255,255,.32);font-size:7px;line-height:1.6}
.home-footer strong{color:rgba(255,255,255,.60)}
.home-footer a{color:rgba(207,172,255,.76);text-decoration:none}
.home-footer .mail{color:rgba(140,221,255,.68)}

@keyframes aiGiftMarquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes homeFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@media(max-width:390px){
  .home-title{font-size:30px}
  .ai-home-hero{padding:16px 14px}
  .ai-home-hero-title{font-size:19px}
  .home-types{gap:7px}
  .home-art{height:108px}
  .home-body{padding:10px}
  .home-desc{font-size:8px}
  .home-sample{width:165px}
}
@media(prefers-reduced-motion:reduce){
  .home-orb,.home-marquee{animation:none}
}
`;

const homeSamples = [
  ['song','🎙️','Песня','Спасибо, мама','Очень личная история'],
  ['song','💫','Песня','С днём рождения, Анна!','Праздничное поздравление'],
  ['song','❤️','Песня','Наша история','Подарок для двоих'],
  ['video','🎭','Видео','Поздравление для мамы','AI-персонаж в кадре'],
  ['video','🎉','Видео','С днём рождения!','Персональное поздравление'],
  ['video','🪄','Видео','История в фотографиях','Красивый ролик из фото'],
  ['song','🎙️','Песня','Спасибо, мама','Очень личная история'],
  ['song','💫','Песня','С днём рождения, Анна!','Праздничное поздравление'],
  ['song','❤️','Песня','Наша история','Подарок для двоих'],
  ['video','🎭','Видео','Поздравление для мамы','AI-персонаж в кадре'],
  ['video','🎉','Видео','С днём рождения!','Персональное поздравление'],
  ['video','🪄','Видео','История в фотографиях','Красивый ролик из фото']
];

const sampleMarkup = homeSamples.map(([type,icon,label,title,desc]) => `
  <div class="home-sample ${type === 'video' ? 'home-sample-video' : ''}">
    <div class="home-sample-art">${icon}</div>
    <div class="home-sample-text">
      <span>${label}</span>
      <strong>${title}</strong>
      <small>${desc}</small>
    </div>
  </div>
`).join('');

const homeMarkup = `
<style>${homeCss}</style>
<div id="ai-gifts-home">
  <div class="wrap">
    <div class="ai-home-top">
      <div class="ai-home-brand">
        <p class="ai-home-eyebrow">Персональные подарки с AI</p>
        <h1 class="home-title">AI-подарки</h1>
      </div>
      <div class="ai-home-status"><span class="ai-home-status-dot"></span> Сервис онлайн</div>
    </div>

    <section class="ai-home-hero">
      <div class="ai-home-hero-inner">
        <div class="ai-home-hero-kicker">✨ Создайте подарок, который запомнят</div>
        <h2 class="ai-home-hero-title">Не просто подарок.<br>Персональная эмоция.</h2>
        <p class="ai-home-hero-text">Песня, видео, поздравление или необычный AI-сюрприз — создайте что-то особенное за несколько минут.</p>
        <div class="ai-home-hero-glow">
          <span class="ai-home-glow-chip">🎵 Музыка</span>
          <span class="ai-home-glow-chip">🎬 Видео</span>
          <span class="ai-home-glow-chip">💝 Для близких</span>
        </div>
      </div>
    </section>

    <div class="home-section-head">
      <div>
        <h3 class="home-section-title">Выберите формат подарка</h3>
        <p class="home-section-subtitle">Все внутри одного Mini App</p>
      </div>
      <div class="home-section-badge">2 направления</div>
    </div>

    <section class="home-types">
      <button class="home-card" id="ai-home-song" type="button">
        <div class="home-art home-song-art">
          <div class="home-art-ring"></div>
          <div class="home-orb">🎵</div>
          <span class="home-chip">AI Music</span>
          <span class="home-ready">Готово</span>
        </div>
        <div class="home-body">
          <div class="home-kicker">Песня в подарок</div>
          <div class="home-desc">Персональная песня о человеке, ваших чувствах и вашей истории.</div>
          <div class="home-link"><span>Создать песню</span><span class="home-arrow">→</span></div>
        </div>
      </button>

      <button class="home-card" id="ai-home-video" type="button">
        <div class="home-art home-video-art">
          <div class="home-art-ring"></div>
          <div class="home-orb">🎬</div>
          <span class="home-chip">AI Video</span>
          <span class="home-soon">Скоро</span>
        </div>
        <div class="home-body">
          <div class="home-kicker">Видео в подарок</div>
          <div class="home-desc">Фото, поющее фото и персональные поздравления от AI-персонажей.</div>
          <div class="home-link"><span>Посмотреть возможности</span><span class="home-arrow">→</span></div>
        </div>
      </button>
    </section>

    <div class="home-section-head">
      <div>
        <h3 class="home-section-title">Примеры готовых работ</h3>
        <p class="home-section-subtitle">Витрина подарков, которые можно создать</p>
      </div>
      <div class="home-section-badge">AI Showcase</div>
    </div>

    <section class="home-showcase">
      <div class="home-marquee-viewport">
        <div class="home-marquee">${sampleMarkup}</div>
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
  function backButton(){
    try{return window.WebApp&&window.WebApp.BackButton||null}catch(e){return null}
  }
  function hideBack(){
    try{var bb=backButton();if(bb&&typeof bb.hide==='function')bb.hide()}catch(e){}
  }
  function showHome(){
    var app=document.querySelector('.app'),home=document.getElementById('ai-gifts-home');
    if(!app||!home)return;
    window.__AI_SONG_SCREEN__=false;
    home.style.display='block';
    app.style.display='none';
    hideBack();
    window.scrollTo(0,0)
  }
  function showSong(){
    var app=document.querySelector('.app'),home=document.getElementById('ai-gifts-home');
    if(!app||!home)return;
    window.__AI_SONG_SCREEN__=true;
    home.style.display='none';
    app.style.display='block';
    try{var bb=backButton();if(bb&&typeof bb.show==='function')bb.show()}catch(e){}
    window.scrollTo(0,0)
  }
  function bindBack(){
    try{
      var bb=backButton();
      if(!bb||typeof bb.onClick!=='function')return;
      if(bb.__aiHomeBound)return;
      bb.__aiHomeBound=true;
      bb.onClick(showHome)
    }catch(e){}
  }
  function init(){
    var app=document.querySelector('.app'),home=document.getElementById('ai-gifts-home');
    if(!app||!home)return;
    document.getElementById('ai-home-song')?.addEventListener('click',showSong);
    document.getElementById('ai-home-video')?.addEventListener('click',function(){
      try{
        if(window.showStatus)window.showStatus('🎬 Раздел «Видео в подарок» будет добавлен следующим этапом')
      }catch(e){}
    });
    bindBack();
    showHome()
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();</script>
`;

express.response.sendFile = function patchedSendFile(filePath,...args){
  const isIndex=String(filePath||'').endsWith('/index.html')||String(filePath||'').endsWith('index.html');
  if(!isIndex)return originalSendFile.call(this,filePath,...args);

  const response=this;
  const originalSend=response.send;
  response.send=function aiHomeSend(body){
    try{
      if(typeof body==='string'&&body.includes('<body')){
        const injected=body.replace(/<body([^>]*)>/i,(tag)=>tag+homeMarkup);
        return originalSend.call(this,injected);
      }
    }catch(error){console.error('[AI HOME UI]',error.message)}
    return originalSend.call(this,body);
  };

  try{return originalSendFile.call(this,filePath,...args)}
  finally{response.send=originalSend}
};
