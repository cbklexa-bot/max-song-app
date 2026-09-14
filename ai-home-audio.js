const express = require('express');

const originalSendFile = express.response.sendFile;

const audioCss = `
<style id="ai-home-audio-style">
#ai-gifts-home .home-sample-player.is-playing .home-sample-play{box-shadow:0 0 22px color-mix(in srgb,var(--orb) 38%,transparent),0 0 10px rgba(255,255,255,.14);transform:scale(1.04)}
#ai-gifts-home .home-sample-track-line{position:relative;cursor:pointer}
#ai-gifts-home .home-sample-track-line .ai-audio-progress{position:absolute;inset:0 auto 0 0;width:0%;border-radius:inherit;background:linear-gradient(90deg,var(--orb),var(--orb2));box-shadow:0 0 12px color-mix(in srgb,var(--orb) 30%,transparent);pointer-events:none}
#ai-gifts-home .home-sample-track-line:after{display:none!important}
</style>
`;

const audioScript = `
<script id="ai-home-audio-script">
(function(){
  if(window.__AI_HOME_AUDIO__)return;
  window.__AI_HOME_AUDIO__=true;

  const tracks=[
    {file:'Первому_учителю.m4a',title:'Первому учителю'},
    {file:'Песенка про Милану.m4a',title:'Песенка про Милану'},
    {file:'Песня для мамы.m4a',title:'Песня для мамы'},
    {file:'для Любимой.m4a',title:'Для любимой'},
    {file:'с днём рождения Мария.m4a',title:'С днём рождения Мария'}
  ];

  function audioUrl(file){return '/assets/'+file.split('/').map(encodeURIComponent).join('/')}

  function initAudio(){
    const carousel=document.querySelector('#ai-gifts-home .home-carousel');
    if(!carousel)return false;
    const cards=[...carousel.querySelectorAll('.home-sample')];
    if(!cards.length)return true;

    let activeAudio=null;

    function formatTime(value){
      if(!Number.isFinite(value))return '0:00';
      const minutes=Math.floor(value/60);
      const seconds=Math.floor(value%60).toString().padStart(2,'0');
      return minutes+':'+seconds;
    }

    function stopCard(card,resetTime){
      const audio=card.__aiAudio;
      if(audio){audio.pause();if(resetTime)audio.currentTime=0;}
      card.querySelector('.home-sample-player')?.classList.remove('is-playing');
      const button=card.querySelector('.home-sample-play');
      if(button){button.textContent='▶';button.setAttribute('aria-label','Воспроизвести');}
      const progress=card.querySelector('.ai-audio-progress');
      if(progress)progress.style.width='0%';
      const current=card.querySelector('.home-sample-time span:first-child');
      if(current)current.textContent='0:00';
    }

    function pauseAll(except){
      cards.forEach(card=>{if(card!==except)stopCard(card,false)});
      if(except&&activeAudio&&activeAudio!==except.__aiAudio)activeAudio.pause();
      activeAudio=except?.__aiAudio||null;
    }

    cards.forEach((card,index)=>{
      if(card.dataset.aiAudioBound==='1')return;
      card.dataset.aiAudioBound='1';
      const track=tracks[index];
      const playButton=card.querySelector('.home-sample-play');
      const player=card.querySelector('.home-sample-player');
      const line=card.querySelector('.home-sample-track-line');
      const current=card.querySelector('.home-sample-time span:first-child');
      const total=card.querySelector('.home-sample-time span:last-child');

      if(track){
        const title=card.querySelector('.home-sample-text strong');
        if(title)title.textContent=track.title;

        const audio=new Audio(audioUrl(track.file));
        audio.preload='metadata';
        audio.playsInline=true;
        card.__aiAudio=audio;

        const progress=document.createElement('span');
        progress.className='ai-audio-progress';
        line?.appendChild(progress);

        audio.addEventListener('loadedmetadata',function(){
          if(total)total.textContent=formatTime(audio.duration);
        });
        audio.addEventListener('timeupdate',function(){
          const ratio=audio.duration?audio.currentTime/audio.duration:0;
          if(progress)progress.style.width=(Math.max(0,Math.min(1,ratio))*100).toFixed(2)+'%';
          if(current)current.textContent=formatTime(audio.currentTime);
        });
        audio.addEventListener('play',function(){
          pauseAll(card);
          player?.classList.add('is-playing');
          if(playButton){playButton.textContent='Ⅱ';playButton.setAttribute('aria-label','Пауза');}
        });
        audio.addEventListener('pause',function(){
          if(!audio.ended){player?.classList.remove('is-playing');if(playButton){playButton.textContent='▶';playButton.setAttribute('aria-label','Воспроизвести');}}
        });
        audio.addEventListener('ended',function(){
          stopCard(card,true);
          if(activeAudio===audio)activeAudio=null;
        });
        audio.addEventListener('error',function(){
          stopCard(card,false);
          console.warn('[AI HOME AUDIO] failed to load',track.file);
        });

        playButton?.addEventListener('click',async function(event){
          event.preventDefault();
          event.stopPropagation();
          try{
            if(!audio.paused){audio.pause();return;}
            pauseAll(card);
            await audio.play();
          }catch(error){
            console.warn('[AI HOME AUDIO] play failed',error.message);
          }
        });

        line?.addEventListener('click',function(event){
          event.preventDefault();
          event.stopPropagation();
          if(!Number.isFinite(audio.duration)||audio.duration<=0)return;
          const rect=line.getBoundingClientRect();
          const ratio=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));
          audio.currentTime=ratio*audio.duration;
        });
      }else if(playButton){
        playButton.disabled=true;
        playButton.style.opacity='.35';
        playButton.setAttribute('aria-label','Аудио пока отсутствует');
      }
    });

    return true;
  }

  function boot(){if(initAudio())return;setTimeout(boot,450)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
</script>
`;

function inject(body){
  if(typeof body!=='string'||!body.includes('<body'))return body;
  if(body.includes('ai-home-audio-style'))return body;
  const marker='</body>';const index=body.toLowerCase().lastIndexOf(marker);
  if(index<0)return body;
  return body.slice(0,index)+audioCss+'\n'+audioScript+'\n'+body.slice(index);
}

express.response.sendFile=function patchedSendFile(filePath,...args){
  const isIndex=typeof filePath==='string'&&/(?:^|[\\/])index\.html$/i.test(filePath);
  if(!isIndex)return originalSendFile.call(this,filePath,...args);
  const response=this,originalSend=response.send;
  response.send=function aiHomeAudioSend(body){try{return originalSend.call(this,inject(body))}catch(error){console.error('[AI HOME AUDIO]',error.message);return originalSend.call(this,body)}};
  try{return originalSendFile.call(this,filePath,...args)}finally{response.send=originalSend}
};

console.log('[AI HOME AUDIO] ready songs player layer loaded');
