const express = require('express');
const fs = require('fs');
const path = require('path');

const originalSendFile = express.response.sendFile;

function getShowcaseTracks() {
  const dir = path.join(process.cwd(), 'public', 'showcase');
  try {
    const allowed = new Set(['.mp3', '.m4a', '.wav', '.ogg', '.aac', '.webm']);
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && allowed.has(path.extname(entry.name).toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      .map((entry) => ({
        src: '/showcase/' + encodeURIComponent(entry.name).replace(/%2F/g, '/'),
        title: path.basename(entry.name, path.extname(entry.name)).replace(/[_-]+/g, ' ').trim()
      }));
  } catch (_) {
    return [];
  }
}

const showcaseTracks = getShowcaseTracks();
const showcaseJson = JSON.stringify(showcaseTracks).replace(/</g, '\\u003c');

const homeMarkup = `
<style id="ai-music-home-style">
#ai-gifts-home{min-height:100vh;padding:10px 12px 24px;background:radial-gradient(520px 330px at 50% -120px,rgba(180,98,255,.30),transparent 70%),radial-gradient(420px 330px at 100% 35%,rgba(93,120,255,.10),transparent 76%),linear-gradient(180deg,#080611 0%,#0c0714 58%,#09050f 100%);color:#fff;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow-x:hidden}
#ai-gifts-home *{box-sizing:border-box}
#ai-gifts-home .wrap{width:100%;max-width:560px;margin:0 auto}
.ai-home-top{margin:8px 0 17px;text-align:center}
.ai-home-top .home-title{margin:0;font-size:35px;line-height:.98;letter-spacing:-.055em;font-weight:950;background:linear-gradient(100deg,#f0c5ff 0%,#b887ff 45%,#ff6ec7 100%);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 0 28px rgba(190,112,255,.28)}
.ai-home-card-wrap{margin:0 0 22px}
.home-card{display:block;position:relative;overflow:hidden;width:100%;padding:0;border:1px solid rgba(255,255,255,.15);border-radius:28px;background:#120b1a;color:#fff;text-align:left;cursor:pointer;box-shadow:0 22px 58px rgba(0,0,0,.38),0 0 35px rgba(173,91,255,.11);transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}
.home-card:active{transform:scale(.988)}
.home-card:focus-visible{outline:2px solid rgba(223,176,255,.8);outline-offset:3px}
.home-art{position:relative;display:block;width:100%;aspect-ratio:4/5;overflow:hidden;background:#161022;background-image:linear-gradient(180deg,rgba(0,0,0,.02) 0%,rgba(0,0,0,.05) 45%,rgba(0,0,0,.62) 100%),url('/песня%20в%20подарок.jpg');background-position:center;background-size:cover;background-repeat:no-repeat}
.home-card-cta{position:absolute;left:14px;right:14px;bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 13px 12px 15px;border-radius:16px;background:rgba(11,5,18,.72);border:1px solid rgba(255,255,255,.13);backdrop-filter:blur(13px);-webkit-backdrop-filter:blur(13px);box-shadow:0 10px 28px rgba(0,0,0,.25)}
.home-card-cta span:first-child{font-size:13px;font-weight:950;letter-spacing:-.015em}
.home-arrow{width:34px;height:34px;flex:0 0 34px;border-radius:11px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(171,104,255,.42),rgba(244,83,170,.34));border:1px solid rgba(255,255,255,.16);color:#fff;font-size:18px;font-weight:900;box-shadow:0 0 22px rgba(173,91,255,.20)}
.home-section{margin-top:4px}
.home-section-title{text-align:center;margin:0;color:#fff;font-size:14px;font-weight:950;letter-spacing:-.02em}
.home-section-subtitle{margin:5px 0 12px;text-align:center;color:rgba(255,255,255,.38);font-size:8px}
.showcase-viewport{position:relative;overflow-x:auto;overflow-y:hidden;margin:0 -1px;padding:7px 2px 13px;scrollbar-width:none;-ms-overflow-style:none;overscroll-behavior-x:contain;touch-action:pan-x;cursor:grab}
.showcase-viewport::-webkit-scrollbar{display:none}
.showcase-viewport.dragging{cursor:grabbing}
.showcase-track{display:flex;align-items:center;gap:14px;width:max-content;padding:0 2px}
.showcase-sphere{position:relative;width:158px;height:158px;flex:0 0 158px;border-radius:50%;padding:20px 16px 17px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:radial-gradient(circle at 30% 22%,rgba(255,255,255,.25),rgba(193,122,255,.18) 28%,rgba(90,53,126,.11) 58%,rgba(255,255,255,.025) 100%);border:1px solid rgba(255,255,255,.18);box-shadow:inset 0 1px 0 rgba(255,255,255,.13),inset 0 -18px 35px rgba(121,73,168,.12),0 14px 36px rgba(0,0,0,.28),0 0 34px rgba(178,96,255,.12);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.showcase-sphere:before{content:"";position:absolute;inset:8px;border-radius:50%;border:1px solid rgba(255,255,255,.07);pointer-events:none}
.showcase-sphere-title{position:relative;z-index:1;width:100%;padding:0 5px;color:#fff;font-size:11px;line-height:1.25;font-weight:900;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-shadow:0 1px 12px rgba(255,255,255,.14)}
.showcase-play{position:relative;z-index:1;margin-top:12px;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.21);color:#fff;font-size:17px;cursor:pointer;box-shadow:0 0 22px rgba(194,115,255,.16)}
.showcase-play:active{transform:scale(.94)}
.showcase-time{position:relative;z-index:1;margin-top:8px;color:rgba(255,255,255,.38);font-size:7px;font-weight:800}
.showcase-empty{padding:28px 18px;border-radius:22px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025);text-align:center;color:rgba(255,255,255,.38);font-size:9px;line-height:1.55}
.home-footer{padding:18px 7px 3px;text-align:center;color:rgba(255,255,255,.30);font-size:7px;line-height:1.6}
.home-footer strong{color:rgba(255,255,255,.56)}
.home-footer a{color:rgba(207,172,255,.76);text-decoration:none}
.home-footer .mail{color:rgba(140,221,255,.68)}
.showcase-audio{display:none}
@media(max-width:390px){#ai-gifts-home .wrap{max-width:100%}.ai-home-top .home-title{font-size:32px}.home-card-cta{left:11px;right:11px;bottom:11px}.showcase-sphere{width:146px;height:146px;flex-basis:146px}}
@media(prefers-reduced-motion:reduce){.showcase-viewport{scroll-behavior:auto}}
</style>
<div id="ai-gifts-home">
  <div class="wrap">
    <div class="ai-home-top"><h1 class="home-title">Песня в подарок</h1></div>

    <div class="ai-home-card-wrap">
      <button class="home-card" id="ai-home-song" type="button" aria-label="Создать песню">
        <div class="home-art" aria-label="Песня в подарок">
          <div class="home-card-cta"><span>Создать песню</span><span class="home-arrow">→</span></div>
        </div>
      </button>
    </div>

    <section class="home-section">
      <h2 class="home-section-title">Песни, созданные в нашем приложении</h2>
      <p class="home-section-subtitle">Слушайте готовые работы и выбирайте понравившуюся</p>
      <div class="showcase-viewport" id="music-showcase-viewport">
        <div class="showcase-track" id="music-showcase-track"></div>
      </div>
    </section>

    <footer class="home-footer">
      <strong>ИП Титаренко Алексей Викторович</strong><br>
      ИНН 384908759582 · <a href="/oferta.html" target="_blank" rel="noopener">Публичная оферта</a><br>
      <a class="mail" href="mailto:cbklexa@gmail.com">cbklexa@gmail.com</a>
    </footer>
  </div>
</div>

<script>
(function(){
  const tracks=${showcaseJson};
  function backButton(){try{return window.WebApp&&window.WebApp.BackButton||null}catch(e){return null}}
  function hideBack(){try{const bb=backButton();if(bb&&typeof bb.hide==='function')bb.hide()}catch(e){}}
  function showHome(){const app=document.querySelector('.app'),home=document.getElementById('ai-gifts-home');if(!app||!home)return;window.__AI_SONG_SCREEN__=false;home.style.display='block';app.style.display='none';hideBack();window.scrollTo(0,0)}
  function showSong(){const app=document.querySelector('.app'),home=document.getElementById('ai-gifts-home');if(!app||!home)return;window.__AI_SONG_SCREEN__=true;home.style.display='none';app.style.display='block';try{const bb=backButton();if(bb&&typeof bb.show==='function')bb.show();if(bb&&typeof bb.onClick==='function'&&!bb.__aiMusicHomeBound){bb.__aiMusicHomeBound=true;bb.onClick(showHome)}}catch(e){}window.scrollTo(0,0)}

  let activeAudio=null;
  function buildCard(track,index){
    const card=document.createElement('div');
    card.className='showcase-sphere';
    card.innerHTML='<div class="showcase-sphere-title"></div><button class="showcase-play" type="button" aria-label="Воспроизвести">▶</button><div class="showcase-time">0:00</div><audio class="showcase-audio" preload="metadata"></audio>';
    card.querySelector('.showcase-sphere-title').textContent=track.title||('Песня '+(index+1));
    const audio=card.querySelector('audio');
    const play=card.querySelector('.showcase-play');
    const time=card.querySelector('.showcase-time');
    audio.src=track.src;
    function formatTime(seconds){if(!Number.isFinite(seconds))return '0:00';const m=Math.floor(seconds/60);const s=Math.floor(seconds%60).toString().padStart(2,'0');return m+':'+s}
    audio.addEventListener('loadedmetadata',()=>{time.textContent=formatTime(audio.duration)})
    audio.addEventListener('timeupdate',()=>{time.textContent=formatTime(audio.currentTime)+' / '+formatTime(audio.duration)})
    audio.addEventListener('ended',()=>{play.textContent='▶';if(activeAudio===audio)activeAudio=null})
    play.addEventListener('click',(event)=>{
      event.stopPropagation();
      if(activeAudio&&activeAudio!==audio){activeAudio.pause();const old=activeAudio.closest('.showcase-sphere');if(old)old.querySelector('.showcase-play').textContent='▶'}
      if(audio.paused){audio.play().then(()=>{activeAudio=audio;play.textContent='❚❚'}).catch(()=>{})}else{audio.pause();play.textContent='▶';if(activeAudio===audio)activeAudio=null}
    });
    return card;
  }

  function initShowcase(){
    const viewport=document.getElementById('music-showcase-viewport');
    const track=document.getElementById('music-showcase-track');
    if(!viewport||!track)return;
    if(!tracks.length){track.innerHTML='<div class="showcase-empty">Пока здесь нет готовых песен. Добавьте аудиофайлы в папку <b>public/showcase</b> — приложение само создаст для них витрину.</div>';return}
    tracks.forEach((item,i)=>track.appendChild(buildCard(item,i)));
    const originals=[...track.children];
    originals.forEach((card)=>track.appendChild(card.cloneNode(true)));
    const wireClones=()=>{
      [...track.children].forEach((card)=>{
        const button=card.querySelector('.showcase-play');
        const audio=card.querySelector('audio');
        if(!button||!audio||button.dataset.wired==='1')return;
        button.dataset.wired='1';
        button.onclick=(event)=>{event.stopPropagation();if(activeAudio&&activeAudio!==audio){activeAudio.pause();const old=activeAudio.closest('.showcase-sphere');if(old)old.querySelector('.showcase-play').textContent='▶'}if(audio.paused){audio.play().then(()=>{activeAudio=audio;button.textContent='❚❚'}).catch(()=>{})}else{audio.pause();button.textContent='▶';if(activeAudio===audio)activeAudio=null}};
      });
    };
    wireClones();
    let pausedUntil=0;
    let dragging=false;
    let startX=0;
    let startScroll=0;
    viewport.addEventListener('touchstart',e=>{pausedUntil=Date.now()+1800;startX=e.touches[0].clientX;startScroll=viewport.scrollLeft;},{passive:true});
    viewport.addEventListener('touchmove',e=>{pausedUntil=Date.now()+1200;}, {passive:true});
    viewport.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'){dragging=true;viewport.classList.add('dragging');startX=e.clientX;startScroll=viewport.scrollLeft;viewport.setPointerCapture?.(e.pointerId)}});
    viewport.addEventListener('pointermove',e=>{if(!dragging)return;e.preventDefault();viewport.scrollLeft=startScroll-(e.clientX-startX)});
    viewport.addEventListener('pointerup',()=>{dragging=false;viewport.classList.remove('dragging');pausedUntil=Date.now()+1200});
    viewport.addEventListener('pointercancel',()=>{dragging=false;viewport.classList.remove('dragging')});
    let previous=performance.now();
    function tick(now){
      const delta=Math.min(40,now-previous);previous=now;
      if(!dragging&&Date.now()>pausedUntil){viewport.scrollLeft += delta*0.035;if(viewport.scrollLeft>=track.scrollWidth/2){viewport.scrollLeft -= track.scrollWidth/2}}
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function init(){
    const app=document.querySelector('.app'),home=document.getElementById('ai-gifts-home');
    if(!app||!home)return;
    const song=document.getElementById('ai-home-song');
    if(song&&!song.dataset.musicHomeBound){song.dataset.musicHomeBound='1';song.addEventListener('click',function(e){e.preventDefault();showSong()})}
    initShowcase();
    showHome();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
</script>`;

express.response.sendFile=function patchedSendFile(filePath,...args){
  const name=String(filePath||'');
  const isIndex=name.endsWith('/index.html')||name.endsWith('index.html');
  if(!isIndex)return originalSendFile.call(this,filePath,...args);
  const response=this;
  const originalSend=response.send;
  response.send=function aiMusicHomeSend(body){
    try{if(typeof body==='string'&&body.includes('<body'))return originalSend.call(this,body.replace(/<body([^>]*)>/i,(tag)=>tag+homeMarkup))}catch(error){console.error('[AI MUSIC HOME]',error.message)}
    return originalSend.call(this,body);
  };
  try{return originalSendFile.call(this,filePath,...args)}finally{response.send=originalSend}
};

console.log('[AI HOME UI] music showcase home loaded:', showcaseTracks.length, 'tracks');
