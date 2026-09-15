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
.home-card{display:block;position:relative;overflow:hidden;width:100%;padding:0;border:1px solid rgba(255,255,255,.09);border-radius:24px;background:rgba(20,13,30,.88);color:#fff;text-align:left;cursor:pointer;box-shadow:0 18px 46px rgba(0,0,0,.25);transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}
.home-card:active{transform:scale(.988)}
.home-card:focus-visible{outline:2px solid rgba(190,137,255,.65);outline-offset:2px}
.home-art{height:320px;display:block;position:relative;overflow:hidden;background:linear-gradient(135deg,#3a1d69,#161024);background-image:linear-gradient(180deg,rgba(0,0,0,.06),rgba(0,0,0,.18)),url('/песня%20в%20подарок.jpg');background-position:center;background-size:cover;background-repeat:no-repeat}
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
@media(max-width:390px){.home-title{font-size:29px}.home-art{height:280px}.home-showcase-grid{grid-template-columns:1fr}.home-sample{min-height:70px}}
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

    <button class="home-card" id="ai-home-song" type="button">
      <div class="home-art" aria-label="Песня в подарок"></div>
      <div class="home-body">
        <div class="home-kicker">Песня под заказ</div>
        <div class="home-desc">Опишите человека, повод и чувства. Сгенерируем персональную песню и покажем демо перед покупкой.</div>
        <div class="home-link"><span>Создать песню</span><span class="home-arrow">→</span></div>
      </div>
    </button>

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
