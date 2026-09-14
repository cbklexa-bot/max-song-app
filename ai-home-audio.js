const express = require('express');
const originalSendFile = express.response.sendFile;

const audioCss = `
<style id="ai-home-audio-final-style">
#ai-gifts-home #home-orb-carousel{position:relative;overflow:hidden;scroll-snap-type:none;touch-action:pan-y;height:214px;padding:7px 0 11px;display:block;white-space:nowrap}
#ai-gifts-home #home-orb-carousel .ai-showcase-track{position:absolute;left:0;top:7px;height:198px;display:flex;align-items:center;gap:8px;will-change:transform;white-space:nowrap}
#ai-gifts-home #home-orb-carousel .home-sample{display:flex;flex:0 0 188px;width:188px;height:172px;margin:0;border-radius:50%;white-space:normal;transition:transform .35s ease,opacity .35s ease,filter .35s ease;z-index:1}
#ai-gifts-home #home-orb-carousel .home-sample-top{z-index:1;pointer-events:none}
#ai-gifts-home #home-orb-carousel .home-sample-player{z-index:4;pointer-events:auto;bottom:34%;transform:translateY(50%)}
#ai-gifts-home #home-orb-carousel .home-sample-play{position:relative;z-index:5;pointer-events:auto;cursor:pointer}
#ai-gifts-home #home-orb-carousel .home-sample-track-line{position:relative;z-index:5;cursor:pointer}
#ai-gifts-home #home-orb-carousel .home-sample-text strong{font-size:11px}
#ai-gifts-home #home-orb-carousel .home-sample-text span,#ai-gifts-home #home-orb-carousel .home-sample-text small{display:none!important}
#ai-gifts-home #home-orb-carousel .home-sample-art{width:38px;height:38px;font-size:14px;margin-bottom:5px}
#ai-gifts-home #home-orb-carousel .home-sample.is-center{transform:translateY(-5px) scale(1.04);opacity:1;filter:saturate(1.12) brightness(1.04);z-index:3}
#ai-gifts-home #home-orb-carousel .home-sample.is-side{transform:translateY(4px) scale(.84);opacity:.34;filter:saturate(.75) brightness(.82);z-index:1}
#ai-gifts-home #home-orb-carousel .home-sample.is-near{transform:translateY(2px) scale(.92);opacity:.62;filter:saturate(.92) brightness(.92);z-index:2}
#ai-gifts-home #home-orb-carousel .home-sample-player.is-playing .home-sample-play{box-shadow:0 0 22px color-mix(in srgb,var(--orb) 42%,transparent),0 0 10px rgba(255,255,255,.14);transform:scale(1.05)}
#ai-gifts-home #home-orb-carousel .ai-audio-progress{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:inherit;background:linear-gradient(90deg,var(--orb),var(--orb2));box-shadow:0 0 12px color-mix(in srgb,var(--orb) 30%,transparent);pointer-events:none}
@media(max-width:390px){#ai-gifts-home #home-orb-carousel{height:202px}#ai-gifts-home #home-orb-carousel .ai-showcase-track{height:186px}}
</style>
`;

const audioScript = `
<script id="ai-home-audio-final-script">
(function(){
if(window.__AI_HOME_AUDIO_FINAL__)return;
window.__AI_HOME_AUDIO_FINAL__=true;
const tracks=[
 {file:'Первому_учителю.m4a',title:'Первому учителю',icon:'♪',orb:'#63d6ff',orb2:'#755dff'},
 {file:'Песенка про Милану.m4a',title:'Песенка про Милану',icon:'♫',orb:'#77b7ff',orb2:'#5fd6ff'},
 {file:'Песня для мамы.m4a',title:'Песня для мамы',icon:'♬',orb:'#c16dff',orb2:'#6f6dff'},
 {file:'для Любимой.m4a',title:'Для любимой',icon:'♪',orb:'#7ce1ff',orb2:'#9b68ff'},
 {file:'с днём рождения Мария.m4a',title:'С днём рождения Мария',icon:'♫',orb:'#73c7ff',orb2:'#c06cff'}
];
function audioUrl(file){return '/assets/'+file.split('/').map(encodeURIComponent).join('/')}
function fmt(v){if(!Number.isFinite(v)||v<0)return '0:00';return Math.floor(v/60)+':'+String(Math.floor(v%60)).padStart(2,'0')}
function build(){
 const carousel=document.querySelector('#ai-gifts-home #home-orb-carousel');
 if(!carousel)return false;
 const fresh=carousel.cloneNode(false);carousel.replaceWith(fresh);
 const track=document.createElement('div');track.className='ai-showcase-track';fresh.appendChild(track);
 function makeCard(item,index){
  const card=document.createElement('article');card.className='home-sample';card.dataset.index=String(index);card.style.setProperty('--orb',item.orb);card.style.setProperty('--orb2',item.orb2);
  card.innerHTML='<div class="home-sample-top"><div><div class="home-sample-art">'+item.icon+'</div><div class="home-sample-text"><strong>'+item.title+'</strong></div></div></div><div class="home-sample-player"><button class="home-sample-play" type="button" aria-label="Воспроизвести">▶</button><div class="home-sample-track"><div class="home-sample-track-line"></div><div class="home-sample-time"><span>0:00</span><span>0:00</span></div></div></div>';
  const audio=document.createElement('audio');audio.preload='metadata';audio.playsInline=true;audio.setAttribute('aria-hidden','true');audio.src=audioUrl(item.file);audio.style.display='none';card.appendChild(audio);card.__audio=audio;
  const button=card.querySelector('.home-sample-play'),player=card.querySelector('.home-sample-player'),line=card.querySelector('.home-sample-track-line'),current=card.querySelector('.home-sample-time span:first-child'),total=card.querySelector('.home-sample-time span:last-child');
  const progress=document.createElement('span');progress.className='ai-audio-progress';line.appendChild(progress);
  audio.addEventListener('loadedmetadata',()=>{total.textContent=fmt(audio.duration)});
  audio.addEventListener('timeupdate',()=>{current.textContent=fmt(audio.currentTime);const r=audio.duration?audio.currentTime/audio.duration:0;progress.style.width=(Math.max(0,Math.min(1,r))*100)+'%'});
  audio.addEventListener('play',()=>{player.classList.add('is-playing');button.textContent='Ⅱ';button.setAttribute('aria-label','Пауза')});
  audio.addEventListener('pause',()=>{if(!audio.ended){player.classList.remove('is-playing');button.textContent='▶';button.setAttribute('aria-label','Воспроизвести')}});
  audio.addEventListener('ended',()=>{audio.currentTime=0;progress.style.width='0%';current.textContent='0:00';player.classList.remove('is-playing');button.textContent='▶';button.setAttribute('aria-label','Воспроизвести')});
  audio.addEventListener('error',()=>{button.title='Не удалось загрузить аудио';console.warn('[AI HOME AUDIO FINAL] audio error',item.file,audio.error)});
  button.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();document.querySelectorAll('#home-orb-carousel audio').forEach(other=>{if(other!==audio)other.pause()});try{if(audio.paused)await audio.play();else audio.pause()}catch(error){console.warn('[AI HOME AUDIO FINAL] play failed',error.name,error.message);button.title='Не удалось воспроизвести: '+error.name}});
  line.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(!Number.isFinite(audio.duration)||audio.duration<=0)return;const rect=line.getBoundingClientRect();audio.currentTime=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width))*audio.duration});
  return card;
 }
 const firstSet=tracks.map(makeCard);const secondSet=tracks.map((item,i)=>makeCard(item,i+tracks.length));firstSet.forEach(c=>track.appendChild(c));secondSet.forEach(c=>track.appendChild(c));
 let x=0,pausedUntil=0,last=performance.now(),firstSetWidth=0;
 function measure(){const width=firstSet.reduce((sum,c)=>sum+c.getBoundingClientRect().width,0);firstSetWidth=width+8*(firstSet.length-1)}measure();
 function updateVisuals(){const center=fresh.getBoundingClientRect().left+fresh.clientWidth/2;track.querySelectorAll('.home-sample').forEach(card=>{const r=card.getBoundingClientRect();const d=Math.abs((r.left+r.width/2)-center)/(fresh.clientWidth*.52);card.classList.toggle('is-center',d<.22);card.classList.toggle('is-near',d>=.22&&d<.62);card.classList.toggle('is-side',d>=.62)})}
 function frame(now){const dt=Math.min(40,now-last);last=now;if(now>=pausedUntil){x-=0.018*dt;if(-x>=firstSetWidth)x+=firstSetWidth}track.style.transform='translate3d('+x.toFixed(2)+'px,0,0)';updateVisuals();requestAnimationFrame(frame)}
 ['pointerdown','touchstart','wheel'].forEach(type=>fresh.addEventListener(type,()=>{pausedUntil=performance.now()+5000},{passive:true}));
 window.addEventListener('resize',measure,{passive:true});requestAnimationFrame(frame);return true;
}
function boot(){if(build())return;setTimeout(boot,350)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
</script>
`;
function inject(body){if(typeof body!=='string'||!body.includes('<body'))return body;if(body.includes('ai-home-audio-final-style'))return body;const i=body.toLowerCase().lastIndexOf('</body>');if(i<0)return body;return body.slice(0,i)+audioCss+'\n'+audioScript+'\n'+body.slice(i)}
express.response.sendFile=function patchedSendFile(filePath,...args){const isIndex=typeof filePath==='string'&&/(?:^|[\\/])index\.html$/i.test(filePath);if(!isIndex)return originalSendFile.call(this,filePath,...args);const response=this,old=response.send;response.send=body=>old.call(this,inject(body));try{return originalSendFile.call(this,filePath,...args)}finally{response.send=old}};
console.log('[AI HOME AUDIO FINAL] five-track continuous showcase loaded');
