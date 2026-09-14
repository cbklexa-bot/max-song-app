const express = require('express');
const originalSendFile = express.response.sendFile;

const css = `<style id="ai-home-showcase-style">
#ai-gifts-home #home-orb-carousel{position:relative;overflow:hidden;scroll-snap-type:none;touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none}
#ai-gifts-home #home-orb-carousel.is-dragging{cursor:grabbing}
#ai-gifts-home #home-orb-carousel .ai-showcase-track{position:absolute;left:0;top:7px;height:198px;display:flex;align-items:center;gap:8px;will-change:transform;white-space:nowrap}
#ai-gifts-home #home-orb-carousel .home-sample{display:flex;flex:0 0 clamp(220px,65vw,360px);width:clamp(220px,65vw,360px);height:clamp(182px,54vw,260px);margin:0;border-radius:50%;white-space:normal}
#ai-gifts-home #home-orb-carousel .home-sample-top{pointer-events:none;z-index:1}
#ai-gifts-home #home-orb-carousel .home-sample-player{z-index:10;pointer-events:auto}
#ai-gifts-home #home-orb-carousel .home-sample-play,#ai-gifts-home #home-orb-carousel .home-sample-track-line{pointer-events:auto;cursor:pointer}
#ai-gifts-home #home-orb-carousel .home-sample.is-center{transform:translateY(-5px) scale(1.04);opacity:1;filter:saturate(1.12) brightness(1.04);z-index:3}
#ai-gifts-home #home-orb-carousel .home-sample.is-near{transform:translateY(2px) scale(.92);opacity:.62;filter:saturate(.92) brightness(.92);z-index:2}
#ai-gifts-home #home-orb-carousel .home-sample.is-side{transform:translateY(4px) scale(.84);opacity:.34;filter:saturate(.75) brightness(.82);z-index:1}
@media(max-width:390px){#ai-gifts-home #home-orb-carousel{height:202px}#ai-gifts-home #home-orb-carousel .ai-showcase-track{height:186px}}
</style>`;

const script = `<script id="ai-home-showcase-script">
(function(){
if(window.__AI_HOME_SHOWCASE_FINAL__)return;
window.__AI_HOME_SHOWCASE_FINAL__=true;
const tracks=[
 {file:'Первому_учителю.m4a',title:'Первому учителю',icon:'♪',orb:'#63d6ff',orb2:'#755dff'},
 {file:'Песенка про Милану.m4a',title:'Песенка про Милану',icon:'♫',orb:'#77b7ff',orb2:'#5fd6ff'},
 {file:'Песня для мамы.m4a',title:'Песня для мамы',icon:'♬',orb:'#c16dff',orb2:'#6f6dff'},
 {file:'для Любимой.m4a',title:'Для любимой',icon:'♪',orb:'#7ce1ff',orb2:'#9b68ff'},
 {file:'с днём рождения Мария.m4a',title:'С днём рождения Мария',icon:'♫',orb:'#73c7ff',orb2:'#c06cff'}
];
const src=f=>'/assets/'+f.split('/').map(encodeURIComponent).join('/');
const fmt=v=>!Number.isFinite(v)||v<0?'0:00':Math.floor(v/60)+':'+String(Math.floor(v%60)).padStart(2,'0');
function init(){
 const old=document.querySelector('#ai-gifts-home #home-orb-carousel');
 if(!old)return false;
 const carousel=old.cloneNode(false);old.replaceWith(carousel);
 const track=document.createElement('div');track.className='ai-showcase-track';carousel.appendChild(track);
 function makeCard(item,index){
  const c=document.createElement('article');c.className='home-sample';c.dataset.index=index;c.style.setProperty('--orb',item.orb);c.style.setProperty('--orb2',item.orb2);
  c.innerHTML='<div class="home-sample-top"><div><div class="home-sample-art">'+item.icon+'</div><div class="home-sample-text"><strong>'+item.title+'</strong></div></div></div><div class="home-sample-player"><button class="home-sample-play" type="button" aria-label="Воспроизвести">▶</button><div class="home-sample-track"><div class="home-sample-track-line"></div><div class="home-sample-time"><span>0:00</span><span>0:00</span></div></div></div>';
  const a=document.createElement('audio');a.src=src(item.file);a.preload='metadata';a.playsInline=true;a.style.display='none';c.appendChild(a);c.__audio=a;
  const b=c.querySelector('.home-sample-play'),p=c.querySelector('.home-sample-player'),line=c.querySelector('.home-sample-track-line'),cur=c.querySelector('.home-sample-time span:first-child'),total=c.querySelector('.home-sample-time span:last-child');
  const progress=document.createElement('span');progress.className='ai-audio-progress';progress.style.cssText='position:absolute;left:0;top:0;bottom:0;width:0;border-radius:inherit;background:linear-gradient(90deg,var(--orb),var(--orb2));pointer-events:none';line.style.position='relative';line.appendChild(progress);
  a.addEventListener('loadedmetadata',()=>total.textContent=fmt(a.duration));
  a.addEventListener('timeupdate',()=>{cur.textContent=fmt(a.currentTime);progress.style.width=(a.duration?Math.min(1,a.currentTime/a.duration):0)*100+'%'});
  a.addEventListener('play',()=>{document.querySelectorAll('#home-orb-carousel audio').forEach(o=>{if(o!==a)o.pause()});p.classList.add('is-playing');b.textContent='Ⅱ';carousel.classList.add('is-audio-playing')});
  a.addEventListener('pause',()=>{if(!a.ended){p.classList.remove('is-playing');b.textContent='▶'}if(![...carousel.querySelectorAll('audio')].some(o=>!o.paused&&!o.ended))carousel.classList.remove('is-audio-playing')});
  a.addEventListener('ended',()=>{a.currentTime=0;progress.style.width='0%';cur.textContent='0:00';p.classList.remove('is-playing');b.textContent='▶';carousel.classList.remove('is-audio-playing')});
  a.addEventListener('error',()=>console.warn('[AI HOME SHOWCASE] audio error',item.file,a.error));
  b.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();try{if(a.paused)await a.play();else a.pause()}catch(err){console.warn('[AI HOME SHOWCASE] play failed',err.name,err.message)}});
  line.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(!Number.isFinite(a.duration)||a.duration<=0)return;const r=line.getBoundingClientRect();a.currentTime=a.duration*Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))});
  return c;
 }
 const first=tracks.map((t,i)=>makeCard(t,i));const second=tracks.map((t,i)=>makeCard(t,i+tracks.length));first.forEach(c=>track.appendChild(c));second.forEach(c=>track.appendChild(c));
 let x=0,firstWidth=0,drag=false,startX=0,startOffset=0,last=performance.now(),pauseUntil=0,suppress=0;
 const gap=8;
 function measure(){firstWidth=first.reduce((n,c)=>n+c.getBoundingClientRect().width,0)+gap*(first.length-1);const w=carousel.clientWidth,cw=first[0]?.getBoundingClientRect().width||0;if(!drag&&Math.abs(x)<1)x=(w-cw)/2}
 function wrap(){if(!firstWidth)return;if(x<=-firstWidth)x+=firstWidth;if(x>firstWidth)x-=firstWidth}
 function visuals(){const center=carousel.getBoundingClientRect().left+carousel.clientWidth/2;track.querySelectorAll('.home-sample').forEach(c=>{const r=c.getBoundingClientRect(),d=Math.abs((r.left+r.width/2)-center)/(carousel.clientWidth*.52);c.classList.toggle('is-center',d<.22);c.classList.toggle('is-near',d>=.22&&d<.62);c.classList.toggle('is-side',d>=.62)})}
 function render(){track.style.transform='translate3d('+x.toFixed(2)+'px,0,0)';visuals()}
 function hold(ms){pauseUntil=Math.max(pauseUntil,performance.now()+ms)}
 function down(e){if(e.pointerType==='mouse'&&e.button!==0)return;drag=true;startX=e.clientX;startOffset=x;hold(8000);carousel.classList.add('is-dragging');try{carousel.setPointerCapture(e.pointerId)}catch(_){} }
 function move(e){if(!drag)return;const dx=e.clientX-startX;if(Math.abs(dx)>4)suppress=performance.now()+250;x=startOffset+dx;wrap();render()}
 function up(e){if(!drag)return;drag=false;carousel.classList.remove('is-dragging');try{carousel.releasePointerCapture(e.pointerId)}catch(_){}hold(2200)}
 carousel.addEventListener('pointerdown',down,{passive:true});carousel.addEventListener('pointermove',move,{passive:true});carousel.addEventListener('pointerup',up,{passive:true});carousel.addEventListener('pointercancel',up,{passive:true});
 carousel.addEventListener('click',e=>{if(performance.now()<suppress){e.preventDefault();e.stopPropagation()}},{capture:true});
 carousel.addEventListener('wheel',()=>hold(5000),{passive:true});
 window.addEventListener('resize',()=>{measure();render()},{passive:true});
 measure();render();
 function frame(now){const dt=Math.min(40,now-last);last=now;if(!drag&&now>=pauseUntil&&!carousel.classList.contains('is-audio-playing')){x-=0.012*dt;wrap();render()}else{visuals()}requestAnimationFrame(frame)}
 requestAnimationFrame(frame);return true;
}
function boot(){if(init())return;setTimeout(boot,350)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
</script>`;
function inject(body){if(typeof body!=='string'||!body.includes('<body')||body.includes('ai-home-showcase-style'))return body;const i=body.toLowerCase().lastIndexOf('</body>');if(i<0)return body;return body.slice(0,i)+css+script+body.slice(i)}
express.response.sendFile=function(filePath,...args){const isIndex=typeof filePath==='string'&&/(?:^|[\\/])index\.html$/i.test(filePath);if(!isIndex)return originalSendFile.call(this,filePath,...args);const old=this.send;this.send=body=>old.call(this,inject(body));try{return originalSendFile.call(this,filePath,...args)}finally{this.send=old}};
console.log('[AI HOME SHOWCASE] interactive swipe showcase loaded');
