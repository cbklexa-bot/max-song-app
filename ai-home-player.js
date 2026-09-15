const express = require('express');

const originalSendFile = express.response.sendFile;

const playerCss = `
<style id="ai-home-player-style">
#ai-gifts-home .showcase-sphere{padding:18px 14px 15px !important;justify-content:center !important}
#ai-gifts-home .showcase-sphere-art img{transform:scale(1.04);transform-origin:center center}
#ai-gifts-home .showcase-sphere-title{
  width:86% !important;
  min-height:29px !important;
  padding:5px 8px !important;
  border-radius:10px !important;
  background:linear-gradient(180deg,rgba(5,8,22,.74),rgba(9,5,24,.58)) !important;
  border:1px solid rgba(151,220,255,.17) !important;
  box-shadow:0 5px 18px rgba(0,0,0,.22),0 0 18px rgba(76,204,255,.08) !important;
  color:#fff !important;
  font-size:10.5px !important;
  line-height:1.18 !important;
  text-shadow:0 2px 11px rgba(0,0,0,.92),0 0 12px rgba(255,255,255,.13) !important;
}
#ai-gifts-home .showcase-play{
  margin-top:9px !important;
  width:42px !important;
  height:42px !important;
  flex:0 0 42px !important;
  background:radial-gradient(circle at 35% 28%,rgba(255,255,255,.30),rgba(80,194,255,.20) 42%,rgba(83,65,166,.22) 100%) !important;
  border:1px solid rgba(166,232,255,.56) !important;
  color:#fff !important;
  font-size:16px !important;
  text-shadow:0 1px 9px rgba(0,0,0,.55) !important;
  box-shadow:0 0 18px rgba(65,208,255,.28),inset 0 0 14px rgba(255,255,255,.08) !important;
}
#ai-gifts-home .showcase-sphere.is-playing .showcase-play{
  background:radial-gradient(circle at 35% 28%,rgba(255,255,255,.34),rgba(75,225,255,.28) 42%,rgba(157,83,255,.25) 100%) !important;
  border-color:rgba(180,245,255,.78) !important;
  box-shadow:0 0 24px rgba(74,223,255,.44),0 0 44px rgba(148,91,255,.18),inset 0 0 16px rgba(255,255,255,.10) !important;
}
#ai-gifts-home .showcase-player{position:relative;z-index:4;width:84%;margin-top:8px}
#ai-gifts-home .showcase-progress{height:5px;width:100%;padding:1px;border-radius:999px;background:rgba(255,255,255,.13);border:1px solid rgba(151,226,255,.15);box-shadow:inset 0 0 8px rgba(0,0,0,.28),0 0 12px rgba(73,189,255,.08);overflow:hidden;cursor:pointer}
#ai-gifts-home .showcase-progress-fill{display:block;width:0%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#55dcff 0%,#69b7ff 45%,#b177ff 100%);box-shadow:0 0 9px rgba(78,217,255,.38);transition:width .08s linear}
#ai-gifts-home .showcase-time{display:flex !important;align-items:center;justify-content:center;margin-top:5px !important;color:rgba(255,255,255,.68) !important;font-size:8px !important;font-weight:800 !important;letter-spacing:.01em !important;text-shadow:0 1px 8px rgba(0,0,0,.72) !important}
#ai-gifts-home .showcase-time .current{color:#fff}
#ai-gifts-home .showcase-time .sep{color:rgba(255,255,255,.35);margin:0 3px}
#ai-gifts-home .showcase-time .total{color:rgba(201,227,255,.70)}
@media(max-width:390px){
  #ai-gifts-home .showcase-sphere{padding-left:13px !important;padding-right:13px !important}
  #ai-gifts-home .showcase-sphere-title{width:89% !important;font-size:10px !important}
  #ai-gifts-home .showcase-player{width:87%}
}
</style>
`;

const playerScript = `
<script id="ai-home-player-script">
(function(){
  function formatTime(seconds){
    if(!Number.isFinite(seconds)||seconds<0)return '0:00';
    const m=Math.floor(seconds/60);
    const s=Math.floor(seconds%60).toString().padStart(2,'0');
    return m+':'+s;
  }

  function enhanceCard(card){
    if(!card||card.dataset.playerEnhance==='1')return;
    const audio=card.querySelector('.showcase-audio');
    const button=card.querySelector('.showcase-play');
    const time=card.querySelector('.showcase-time');
    if(!audio||!button||!time)return;
    card.dataset.playerEnhance='1';

    let player=card.querySelector('.showcase-player');
    if(!player){
      player=document.createElement('div');
      player.className='showcase-player';
      const progress=document.createElement('div');
      progress.className='showcase-progress';
      progress.setAttribute('role','progressbar');
      progress.setAttribute('aria-label','Прогресс песни');
      const fill=document.createElement('span');
      fill.className='showcase-progress-fill';
      progress.appendChild(fill);
      player.appendChild(progress);
      time.innerHTML='<span class="current">0:00</span><span class="sep">/</span><span class="total">0:00</span>';
      card.insertBefore(player,time);
      const current=time.querySelector('.current');
      const total=time.querySelector('.total');
      audio.addEventListener('loadedmetadata',function(){
        total.textContent=formatTime(audio.duration);
        current.textContent=formatTime(audio.currentTime);
      });
      audio.addEventListener('durationchange',function(){
        total.textContent=formatTime(audio.duration);
      });
      audio.addEventListener('timeupdate',function(){
        current.textContent=formatTime(audio.currentTime);
        const ratio=Number.isFinite(audio.duration)&&audio.duration>0?Math.max(0,Math.min(1,audio.currentTime/audio.duration)):0;
        fill.style.width=(ratio*100)+'%';
      });
      audio.addEventListener('pause',function(){
        button.setAttribute('aria-label','Воспроизвести');
      });
      audio.addEventListener('play',function(){
        button.setAttribute('aria-label','Пауза');
      });
      audio.addEventListener('ended',function(){
        fill.style.width='100%';
        current.textContent=formatTime(audio.duration);
      });
      progress.addEventListener('click',function(event){
        event.preventDefault();
        event.stopPropagation();
        if(!Number.isFinite(audio.duration)||audio.duration<=0)return;
        const rect=progress.getBoundingClientRect();
        const ratio=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));
        audio.currentTime=ratio*audio.duration;
        if(audio.paused){
          const playPromise=audio.play();
          if(playPromise&&typeof playPromise.catch==='function')playPromise.catch(function(){});
        }
      });
    }

    if(audio.readyState>=1){
      const current=time.querySelector('.current');
      const total=time.querySelector('.total');
      if(current)current.textContent=formatTime(audio.currentTime);
      if(total)total.textContent=formatTime(audio.duration);
    }
  }

  function enhanceAll(){
    document.querySelectorAll('#music-showcase-track .showcase-sphere').forEach(enhanceCard);
  }

  function install(){
    enhanceAll();
    const track=document.getElementById('music-showcase-track');
    if(track){
      const observer=new MutationObserver(function(){enhanceAll()});
      observer.observe(track,{childList:true,subtree:true});
    }
    window.setTimeout(enhanceAll,250);
    window.setTimeout(enhanceAll,1000);
    window.setTimeout(enhanceAll,2500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
</script>
`;

function inject(body){
  if(typeof body!=='string'||!body.includes('<body'))return body;
  if(body.includes('ai-home-player-style'))return body;
  const marker='</body>';
  const index=body.toLowerCase().lastIndexOf(marker);
  if(index<0)return body;
  return body.slice(0,index)+playerCss+playerScript+'\n'+body.slice(index);
}

express.response.sendFile=function patchedSendFile(filePath,...args){
  const isIndex=typeof filePath==='string'&&/(?:^|[\\/])index\.html$/i.test(filePath);
  if(!isIndex)return originalSendFile.call(this,filePath,...args);
  const response=this;
  const originalSend=response.send;
  response.send=function aiHomePlayerSend(body){
    try{return originalSend.call(this,inject(body));}
    catch(error){console.error('[AI HOME PLAYER]',error.message);return originalSend.call(this,body)}
  };
  try{return originalSendFile.call(this,filePath,...args)}
  finally{response.send=originalSend}
};

console.log('[AI HOME PLAYER] module loaded: title emphasis, play control and progress bar');
