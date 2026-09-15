const express = require('express');

const originalSendFile = express.response.sendFile;

const motionCss = `
<style id="ai-song-intro-motion-style">
#ai-song-intro.is-visible .ai-song-intro-orb{
  animation:aiIntroOrbIn .9s cubic-bezier(.16,1,.3,1) both,aiIntroOrbPulse 1.65s ease-in-out .9s infinite!important;
}
#ai-song-intro.is-visible .ai-song-intro-kicker{
  animation:aiIntroTextIn .7s cubic-bezier(.16,1,.3,1) .14s both!important;
}
#ai-song-intro.is-visible .ai-song-intro-title{
  animation:aiIntroTitleIn .95s cubic-bezier(.16,1,.3,1) .24s both!important;
}
#ai-song-intro.is-visible .ai-song-intro-subtitle{
  animation:aiIntroTextIn .75s cubic-bezier(.16,1,.3,1) .42s both!important;
}
#ai-song-intro.is-visible .ai-song-intro-progress{
  animation:aiIntroProgressIn .65s ease .58s both!important;
}
#ai-song-intro.is-visible:before{
  animation:aiIntroPulseStrong 1.7s ease-in-out infinite!important;
}
#ai-song-intro.is-visible:after{
  animation:aiIntroRotate 6s linear infinite!important;
  opacity:1!important;
}
@keyframes aiIntroOrbIn{
  0%{transform:scale(.15) rotate(-35deg);opacity:0;filter:blur(8px)}
  60%{transform:scale(1.16) rotate(7deg);opacity:1;filter:blur(0)}
  100%{transform:scale(1) rotate(0);opacity:1}
}
@keyframes aiIntroOrbPulse{
  0%,100%{transform:scale(1);box-shadow:inset 0 2px 0 rgba(255,255,255,.22),0 0 38px rgba(76,211,255,.28),0 0 78px rgba(146,89,255,.22)}
  50%{transform:scale(1.08);box-shadow:inset 0 2px 0 rgba(255,255,255,.28),0 0 52px rgba(76,211,255,.45),0 0 110px rgba(146,89,255,.36)}
}
@keyframes aiIntroTextIn{
  0%{opacity:0;transform:translateY(18px);filter:blur(5px)}
  100%{opacity:1;transform:translateY(0);filter:blur(0)}
}
@keyframes aiIntroTitleIn{
  0%{opacity:0;transform:translateY(28px) scale(.88);filter:blur(7px)}
  60%{opacity:1;transform:translateY(-3px) scale(1.025);filter:blur(0)}
  100%{opacity:1;transform:translateY(0) scale(1)}
}
@keyframes aiIntroProgressIn{
  0%{opacity:0;transform:scaleX(.15)}
  100%{opacity:1;transform:scaleX(1)}
}
@keyframes aiIntroPulseStrong{
  0%,100%{transform:scale(.78);opacity:.45}
  50%{transform:scale(1.08);opacity:1}
}
@media(prefers-reduced-motion:reduce){
  #ai-song-intro.is-visible .ai-song-intro-orb,
  #ai-song-intro.is-visible .ai-song-intro-kicker,
  #ai-song-intro.is-visible .ai-song-intro-title,
  #ai-song-intro.is-visible .ai-song-intro-subtitle,
  #ai-song-intro.is-visible .ai-song-intro-progress,
  #ai-song-intro.is-visible:before,
  #ai-song-intro.is-visible:after{animation:none!important}
}
</style>
`;

const motionScript = `
<script id="ai-song-intro-motion-script">
(function(){
  function enhance(){
    const intro=document.getElementById('ai-song-intro');
    if(!intro||intro.dataset.motionBound==='1')return;
    intro.dataset.motionBound='1';
    const observer=new MutationObserver(function(mutations){
      mutations.forEach(function(m){
        if(m.type!=='attributes'||m.attributeName!=='class')return;
        if(intro.classList.contains('is-visible')){
          const core=intro.querySelector('.ai-song-intro-core');
          if(core){
            core.style.animation='none';
            void core.offsetWidth;
            core.style.animation='aiIntroCoreIn .9s cubic-bezier(.16,1,.3,1) both';
          }
        }
      });
    });
    observer.observe(intro,{attributes:true,attributeFilter:['class']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});
  else enhance();
})();
</script>
`;

const coreCss = `
<style id="ai-song-intro-core-motion-style">
@keyframes aiIntroCoreIn{
  0%{transform:scale(.72);opacity:0;filter:blur(10px)}
  55%{transform:scale(1.035);opacity:1;filter:blur(0)}
  100%{transform:scale(1);opacity:1;filter:blur(0)}
}
</style>
`;

function inject(body){
  if(typeof body!=='string'||!body.includes('<body'))return body;
  if(body.includes('ai-song-intro-motion-style'))return body;
  const marker='</body>';
  const index=body.toLowerCase().lastIndexOf(marker);
  if(index<0)return body;
  return body.slice(0,index)+motionCss+coreCss+motionScript+'\n'+body.slice(index);
}

express.response.sendFile=function patchedSendFile(filePath,...args){
  const isIndex=typeof filePath==='string'&&/(?:^|[\\/])index\.html$/i.test(filePath);
  if(!isIndex)return originalSendFile.call(this,filePath,...args);
  const response=this;
  const originalSend=response.send;
  response.send=function aiSongIntroMotionSend(body){
    try{return originalSend.call(this,inject(body));}
    catch(error){console.error('[AI SONG INTRO MOTION]',error.message);return originalSend.call(this,body)}
  };
  try{return originalSendFile.call(this,filePath,...args)}
  finally{response.send=originalSend}
};

console.log('[AI SONG INTRO MOTION] module loaded');
