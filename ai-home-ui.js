const express = require('express');

const originalSendFile = express.response.sendFile;

const homeCss = `
#ai-gifts-home{min-height:100vh;padding:7px 10px 14px;background:radial-gradient(430px 250px at 50% -40px,rgba(143,86,255,.22),transparent 70%),linear-gradient(180deg,#080611 0%,#10091a 100%);color:#fff;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}
#ai-gifts-home .wrap{max-width:560px;margin:0 auto}
.home-title{text-align:center;margin:7px 0 11px;font-size:38px;line-height:1;letter-spacing:-.05em;background:linear-gradient(90deg,#d39cff,#ff76c5);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:950}
.home-types{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.home-card{appearance:none;border:1px solid rgba(255,255,255,.09);border-radius:20px;overflow:hidden;background:linear-gradient(160deg,rgba(39,24,58,.96),rgba(15,9,25,.98));color:#fff;text-align:left;box-shadow:0 14px 35px rgba(0,0,0,.24);padding:0;cursor:pointer}
.home-art{height:112px;display:grid;place-items:center;position:relative;overflow:hidden}
.home-song-art{background:radial-gradient(circle at 50% 45%,rgba(198,122,255,.46),transparent 34%),linear-gradient(135deg,#39206f,#161126)}
.home-video-art{background:radial-gradient(circle at 50% 35%,rgba(81,175,255,.38),transparent 34%),linear-gradient(135deg,#152a59,#121022)}
.home-orb{width:62px;height:62px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);box-shadow:0 0 35px rgba(162,90,255,.28);font-size:28px;animation:homeFloat 2.8s ease-in-out infinite}
.home-video-art .home-orb{box-shadow:0 0 35px rgba(81,175,255,.25);animation-delay:-1.2s}
.home-chip{position:absolute;left:9px;bottom:8px;padding:4px 7px;border-radius:999px;background:rgba(4,2,10,.42);border:1px solid rgba(255,255,255,.12);font-size:7px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.72)}
.home-body{padding:10px 10px 11px;min-height:96px}.home-kicker{font-size:10px;font-weight:900}.home-desc{margin:6px 0 8px;color:rgba(255,255,255,.5);font-size:8.5px;line-height:1.35}.home-link{font-size:8.5px;color:#c7a3ff;font-weight:900}.home-soon{margin-left:4px;padding:2px 5px;border-radius:999px;background:rgba(255,193,77,.1);color:#ffd27a;font-size:6.5px;letter-spacing:.05em}
.home-live{margin-top:13px}.home-live-title{display:flex;align-items:center;gap:6px;color:rgba(255,255,255,.42);font-size:8px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;margin:0 0 6px 2px}.home-live-dot{width:5px;height:5px;border-radius:50%;background:#8dffda;box-shadow:0 0 10px #8dffda}
.home-marquee{display:flex;gap:8px;width:max-content;animation:aiGiftMarquee 30s linear infinite}.home-sample{width:190px;min-height:74px;padding:10px;border-radius:17px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.035);display:flex;align-items:center;gap:9px}.home-sample-icon{width:42px;height:42px;flex:0 0 42px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.26),rgba(133,77,232,.36) 45%,rgba(23,15,42,.92));font-size:18px}.home-sample-text{min-width:0}.home-sample-text span{display:block;color:#aa92be;font-size:7px}.home-sample-text strong{display:block;margin-top:3px;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.home-sample-text small{display:block;margin-top:3px;color:#75687d;font-size:7px}
.home-legal{margin-top:14px;padding:9px 4px 2px;text-align:center;color:rgba(255,255,255,.34);font-size:7.5px;line-height:1.55}.home-legal strong{color:rgba(255,255,255,.58)}.home-legal a{color:rgba(197,158,255,.76);text-decoration:none}.home-legal .mail{color:rgba(140,221,255,.7)}
@keyframes aiGiftMarquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}@keyframes homeFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@media(max-width:390px){.home-title{font-size:34px}.home-art{height:100px}.home-body{min-height:92px}}
`;

const homeMarkup = `
<style>${homeCss}</style>
<div id="ai-gifts-home"><div class="wrap"><h1 class="home-title">AI-подарки</h1><section class="home-types" id="ai-home-types"><button class="home-card" id="ai-home-song" type="button"><div class="home-art home-song-art"><div class="home-orb">🎵</div><span class="home-chip">AI Music</span></div><div class="home-body"><div class="home-kicker">🎵 Песня в подарок</div><div class="home-desc">Персональная песня о человеке, чувствах и вашей истории.</div><div class="home-link">Создать песню →</div></div></button><button class="home-card" id="ai-home-video" type="button"><div class="home-art home-video-art"><div class="home-orb">🎬</div><span class="home-chip">AI Video</span></div><div class="home-body"><div class="home-kicker">🎬 Видео в подарок <span class="home-soon">СКОРО</span></div><div class="home-desc">Фото, поющее фото и AI-персонаж, который поздравляет лично.</div><div class="home-link">Скоро</div></div></button></section><section class="home-live"><div class="home-live-title"><span class="home-live-dot"></span> Уже создано</div><div class="home-marquee"><div class="home-sample"><div class="home-sample-icon">🎙️</div><div class="home-sample-text"><span>Песня</span><strong>Спасибо, мама</strong><small>Очень личная история</small></div></div><div class="home-sample"><div class="home-sample-icon">💫</div><div class="home-sample-text"><span>Песня</span><strong>С днём рождения, Анна!</strong><small>Праздничное поздравление</small></div></div><div class="home-sample"><div class="home-sample-icon">❤️</div><div class="home-sample-text"><span>Песня</span><strong>Наша история</strong><small>Подарок для двоих</small></div></div><div class="home-sample"><div class="home-sample-icon">🎭</div><div class="home-sample-text"><span>Видео</span><strong>Поздравление для мамы</strong><small>AI-персонаж в кадре</small></div></div><div class="home-sample"><div class="home-sample-icon">🎉</div><div class="home-sample-text"><span>Видео</span><strong>С днём рождения!</strong><small>Личное поздравление</small></div></div><div class="home-sample"><div class="home-sample-icon">🎙️</div><div class="home-sample-text"><span>Песня</span><strong>Спасибо, мама</strong><small>Очень личная история</small></div></div></div></section><footer class="home-legal"><strong>ИП Титаренко Алексей Викторович</strong><br>ИНН 384908759582 · <a href="/oferta.html">Публичная оферта</a><br><a class="mail" href="mailto:cbklexa@mail.com">cbklexa@mail.com</a></footer></div></div>
<script>(function(){
function getBack(){try{return window.WebApp&&window.WebApp.BackButton||null}catch(e){return null}}
function patchBackButton(){try{var bb=getBack();if(!bb||typeof bb.show!=='function'||bb.__aiGiftPatched)return false;var originalShow=bb.show.bind(bb),originalHide=typeof bb.hide==='function'?bb.hide.bind(bb):function(){};bb.__aiGiftPatched=true;bb.__aiGiftOriginalShow=originalShow;bb.__aiGiftOriginalHide=originalHide;bb.show=function(){if(window.__AI_SONG_SCREEN__)return originalShow();return originalHide()};bb.hide=function(){return originalHide()};return true}catch(e){return false}}
function hideHomeBack(){try{var bb=getBack();if(bb&&typeof bb.hide==='function')bb.hide()}catch(e){}}
function userRefresh(){try{var n=document.getElementById('user-name');var b=document.getElementById('balance-value');var hn=document.getElementById('ai-home-user');if(hn&&n&&n.textContent&&n.textContent!=='Загрузка...')hn.textContent=n.textContent;if(b)document.getElementById('ai-home-balance')?.textContent==='')}catch(e){}}
function showHome(){var app=document.querySelector('.app'),home=document.getElementById('ai-gifts-home');if(!app||!home)return;window.__AI_SONG_SCREEN__=false;home.style.display='block';app.style.display='none';patchBackButton();hideHomeBack();window.scrollTo(0,0)}
function showSong(){var app=document.querySelector('.app'),home=document.getElementById('ai-gifts-home');if(!app||!home)return;window.__AI_SONG_SCREEN__=true;home.style.display='none';app.style.display='block';patchBackButton();try{var bb=getBack();bb&&bb.show&&bb.show()}catch(e){}window.scrollTo(0,0)}
function init(){var app=document.querySelector('.app'),home=document.getElementById('ai-gifts-home');if(!app||!home)return;app.style.display='none';document.getElementById('ai-home-song')?.addEventListener('click',showSong);document.getElementById('ai-home-video')?.addEventListener('click',function(){try{window.showStatus&&window.showStatus('Видео в подарок — следующий этап ✨')}catch(e){}});showHome();var tries=0;var timer=setInterval(function(){tries++;patchBackButton();if(window.__AI_SONG_SCREEN__)return;if(tries>100){clearInterval(timer);hideHomeBack()}},100)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();</script>
`;

express.response.sendFile = function patchedSendFile(filePath, ...args) {
  const original = originalSendFile.bind(this);
  try {
    const html = require('fs').readFileSync(filePath,'utf8');
    const isIndex = String(filePath||'').endsWith('/index.html') || String(filePath||'').endsWith('index.html');
    if(isIndex){
      const injected = html.replace(/<body([^>]*)>/i,(tag)=>tag+homeMarkup);
      return this.type('html').send(injected);
    }
  } catch(error) {
    console.error('[AI HOME UI]',error.message);
  }
  return original(filePath,...args);
};
