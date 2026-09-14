const express=require('express');
const originalSendFile=express.response.sendFile;
const audioCss=`<style id="ai-home-audio-style">
#ai-gifts-home .home-sample-player.is-playing .home-sample-play{box-shadow:0 0 22px color-mix(in srgb,var(--orb) 38%,transparent),0 0 10px rgba(255,255,255,.14);transform:scale(1.04)}
#ai-gifts-home .home-sample-track-line{position:relative;cursor:pointer}
#ai-gifts-home .home-sample-track-line .ai-audio-progress{position:absolute;inset:0 auto 0 0;width:0;border-radius:inherit;background:linear-gradient(90deg,var(--orb),var(--orb2));box-shadow:0 0 12px color-mix(in srgb,var(--orb) 30%,transparent);pointer-events:none}
#ai-gifts-home .home-sample-track-line:after{display:none!important}
#ai-gifts-home .home-sample-play{position:relative;z-index:20;cursor:pointer;pointer-events:auto}
</style>`;
const audioScript=`<script id="ai-home-audio-script">(()=>{
if(window.__AI_HOME_AUDIO__)return;window.__AI_HOME_AUDIO__=1;
const tracks=[
['Первому учителю','Первому_учителю.m4a','#63d6ff','#755dff'],
['Песенка про Милану','Песенка про Милану.m4a','#77b7ff','#5fd6ff'],
['Песня для мамы','Песня для мамы.m4a','#c16dff','#6f6dff'],
['Для любимой','для Любимой.m4a','#67e8d1','#6c7bff'],
['С днём рождения Мария','с днём рождения Мария.m4a','#ff8cd7','#8a72ff']
];
const enc=f=>'/assets/'+f.split('/').map(encodeURIComponent).join('/');
let activeAudio=null;
const time=v=>!Number.isFinite(v)?'0:00':Math.floor(v/60)+':'+String(Math.floor(v%60)).padStart(2,'0');
function makeCard(t,i){const c=document.createElement('article');c.className='home-sample';c.dataset.audioIndex=i;c.style.setProperty('--orb',t[2]);c.style.setProperty('--orb2',t[3]);c.innerHTML='<div class="home-sample-top"><div class="home-sample-text"><div class="home-sample-art">♫</div><strong></strong></div></div><div class="home-sample-player"><button type="button" class="home-sample-play">▶</button><div class="home-sample-track"><div class="home-sample-track-line"></div><div class="home-sample-time"><span>0:00</span><span>0:00</span></div></div></div>';c.querySelector('strong').textContent=t[0];return c}
function renderFive(car){car.innerHTML='';tracks.forEach((t,i)=>car.appendChild(makeCard(t,i)));return [...car.querySelectorAll('.home-sample')]}
function init(){const car=document.querySelector('#ai-gifts-home .home-carousel');if(!car)return false;const cards=renderFive(car);
function stop(card,reset){const a=card.__audio;if(a){a.pause();if(reset)a.currentTime=0}card.querySelector('.home-sample-player')?.classList.remove('is-playing');const b=card.querySelector('.home-sample-play');if(b)b.textContent='▶';const p=card.querySelector('.ai-audio-progress');if(p)p.style.width='0';const cur=card.querySelector('.home-sample-time span:first-child');if(cur)cur.textContent='0:00'}
function pauseOthers(except){cards.forEach(c=>{if(c!==except)stop(c,false)});if(activeAudio&&(!except||activeAudio!==except.__audio))activeAudio.pause();activeAudio=except?.__audio||null}
cards.forEach((card,i)=>{const t=tracks[i],button=card.querySelector('.home-sample-play'),line=card.querySelector('.home-sample-track-line'),cur=card.querySelector('.home-sample-time span:first-child'),total=card.querySelector('.home-sample-time span:last-child');const a=new Audio(enc(t[1]));a.preload='metadata';a.playsInline=true;card.__audio=a;const prog=document.createElement('span');prog.className='ai-audio-progress';line.appendChild(prog);a.addEventListener('loadedmetadata',()=>{total.textContent=time(a.duration)});a.addEventListener('timeupdate',()=>{const r=a.duration?Math.max(0,Math.min(1,a.currentTime/a.duration)):0;prog.style.width=(r*100).toFixed(2)+'%';cur.textContent=time(a.currentTime)});a.addEventListener('play',()=>{pauseOthers(card);card.querySelector('.home-sample-player').classList.add('is-playing');button.textContent='❚❚'});a.addEventListener('pause',()=>{if(!a.ended){card.querySelector('.home-sample-player').classList.remove('is-playing');button.textContent='▶'}});a.addEventListener('ended',()=>{stop(card,true);if(activeAudio===a)activeAudio=null});a.addEventListener('error',()=>{button.textContent='!';console.warn('[AI HOME AUDIO] failed',t[1],a.error)});button.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();try{if(!a.paused){a.pause();return}pauseOthers(card);await a.play()}catch(err){console.warn('[AI HOME AUDIO] play failed',err.message)}});line.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(!isFinite(a.duration)||a.duration<=0)return;const r=line.getBoundingClientRect();a.currentTime=a.duration*Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))})});return true}
function boot(){if(init())return;setTimeout(boot,400)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();</script>`;
function inject(body){if(typeof body!=='string'||!body.includes('<body')||body.includes('ai-home-audio-style'))return body;const i=body.toLowerCase().lastIndexOf('</body>');if(i<0)return body;return body.slice(0,i)+audioCss+'\\n'+audioScript+'\\n'+body.slice(i)}
express.response.sendFile=function(filePath,...args){const isIndex=typeof filePath==='string'&&/(?:^|[\\/])index\.html$/i.test(filePath);if(!isIndex)return originalSendFile.call(this,filePath,...args);const old=this.send;this.send=body=>old.call(this,inject(body));try{return originalSendFile.call(this,filePath,...args)}finally{this.send=old}};
console.log('[AI HOME AUDIO] five-song showcase ready');
