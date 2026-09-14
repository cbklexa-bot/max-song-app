const express = require('express');

const originalSendFile = express.response.sendFile;

const visualCss = `
<style id="ai-home-visual-style">
#ai-gifts-home img{max-width:100%}
#ai-gifts-home .home-hero-card{-webkit-tap-highlight-color:transparent}
#ai-gifts-home .home-carousel{overscroll-behavior-x:contain}

/* Premium title treatment: stronger letter contrast and a restrained neon contour. */
#ai-gifts-home .home-title{
  position:relative;
  color:#f5fbff;
  -webkit-text-fill-color:#f5fbff;
  background:none;
  text-shadow:
    0 0 2px rgba(255,255,255,.98),
    0 0 10px rgba(117,213,255,.72),
    0 0 24px rgba(103,190,255,.34),
    0 0 44px rgba(150,91,255,.18);
  filter:drop-shadow(0 7px 22px rgba(37,155,255,.16));
}
#ai-gifts-home .home-title:before{
  content:"";
  position:absolute;
  left:-7px;
  right:calc(18% - 7px);
  top:-6px;
  bottom:-9px;
  border-radius:14px;
  border:1px solid rgba(126,215,255,.14);
  background:linear-gradient(90deg,rgba(91,190,255,.07),rgba(156,93,255,.035),transparent);
  box-shadow:0 0 22px rgba(94,198,255,.08),inset 0 0 18px rgba(255,255,255,.018);
  z-index:-1;
  pointer-events:none;
}
#ai-gifts-home .home-section-head{position:relative}
#ai-gifts-home .home-section-head:after{
  content:"";
  position:absolute;
  left:0;
  bottom:-5px;
  width:118px;
  height:1px;
  background:linear-gradient(90deg,rgba(99,211,255,.72),rgba(146,96,255,.38),transparent);
  box-shadow:0 0 12px rgba(95,202,255,.24);
}

/* Remove the remaining placeholder/hint line under the showcase. */
#ai-gifts-home .home-carousel-hint{display:none!important}
#ai-gifts-home .home-sample-note{display:none!important}

/* Make the orb stage feel volumetric rather than like cards sitting on a rectangle. */
#ai-gifts-home .home-carousel{
  position:relative;
  height:274px;
  padding:9px 0 18px;
  gap:0;
  align-items:center;
  background:transparent!important;
  border:0!important;
  box-shadow:none!important;
  scrollbar-width:none;
  mask-image:linear-gradient(90deg,transparent 0,rgba(0,0,0,.92) 9%,#000 22%,#000 78%,rgba(0,0,0,.92) 91%,transparent 100%);
  -webkit-mask-image:linear-gradient(90deg,transparent 0,rgba(0,0,0,.92) 9%,#000 22%,#000 78%,rgba(0,0,0,.92) 91%,transparent 100%);
}
#ai-gifts-home .home-carousel:before{
  content:"";
  position:absolute;
  left:12%;right:12%;top:50%;height:120px;
  transform:translateY(-50%);
  border-radius:50%;
  background:radial-gradient(ellipse at center,rgba(66,188,255,.105),rgba(118,91,255,.045) 38%,transparent 72%);
  filter:blur(22px);
  pointer-events:none;
}
#ai-gifts-home .home-sample{
  flex-basis:67%;
  height:228px;
  margin-left:-8%;
  border-color:rgba(157,224,255,.24);
  box-shadow:
    0 24px 56px rgba(0,0,0,.48),
    0 0 34px color-mix(in srgb,var(--orb) 26%,transparent),
    0 0 78px color-mix(in srgb,var(--orb2) 10%,transparent),
    inset 0 0 36px rgba(255,255,255,.045),
    inset 0 0 0 1px rgba(255,255,255,.035);
  backdrop-filter:blur(15px) saturate(125%);
  -webkit-backdrop-filter:blur(15px) saturate(125%);
  transform-origin:center center;
}
#ai-gifts-home .home-sample:first-child{margin-left:16.5%}
#ai-gifts-home .home-sample:after{
  left:17%;right:17%;top:9%;height:22%;
  background:linear-gradient(115deg,transparent 2%,rgba(255,255,255,.26) 40%,rgba(164,233,255,.17) 55%,transparent 84%);
  filter:blur(4px);
}
#ai-gifts-home .home-sample:before{
  inset:6px;
  border-color:rgba(225,247,255,.11);
  box-shadow:inset 0 0 28px rgba(255,255,255,.035),0 0 18px rgba(110,214,255,.035);
}
#ai-gifts-home .home-sample.is-active{transform:translateY(-9px) scale(1.055);opacity:1;filter:saturate(1.15) brightness(1.05)}
#ai-gifts-home .home-sample:not(.is-active){opacity:.48;transform:translateY(6px) scale(.86);filter:saturate(.84) blur(.1px)}
#ai-gifts-home .home-sample-text strong{text-shadow:0 0 18px color-mix(in srgb,var(--orb) 32%,transparent)}
#ai-gifts-home .home-sample-art{box-shadow:0 0 34px color-mix(in srgb,var(--orb) 28%,transparent),inset 0 0 20px rgba(255,255,255,.08)}

/* Hide the center dot from the cinematic transition; the glow/rings carry the animation. */
#ai-song-page-transition .transition-pulse{display:none!important}

@media(max-width:390px){
  #ai-gifts-home .home-title{font-size:26px}
  #ai-gifts-home .home-carousel{height:252px}
  #ai-gifts-home .home-sample{height:210px;flex-basis:72%;margin-left:-10%}
  #ai-gifts-home .home-sample:first-child{margin-left:14%}
}
</style>
`;

const visualScript = `
<script id="ai-home-visual-script">
(function(){
  if(window.__AI_HOME_VISUAL_MOTION__)return;
  window.__AI_HOME_VISUAL_MOTION__=true;

  function initCarousel(){
    const carousel=document.querySelector('#ai-gifts-home .home-carousel');
    if(!carousel)return false;
    const cards=[...carousel.querySelectorAll('.home-sample')];
    if(cards.length<2)return true;

    let index=0;
    let timer=null;
    let pausedUntil=0;

    function setActive(i){cards.forEach((card,n)=>card.classList.toggle('is-active',n===i));}
    function goTo(i){
      index=(i+cards.length)%cards.length;
      setActive(index);
      const card=cards[index];
      const target=Math.max(0,card.offsetLeft-(carousel.clientWidth-card.offsetWidth)/2);
      carousel.scrollTo({left:target,behavior:'smooth'});
    }
    function schedule(){
      clearTimeout(timer);
      timer=setTimeout(function step(){
        if(document.hidden||Date.now()<pausedUntil){schedule();return;}
        goTo(index+1);
        schedule();
      },7600);
    }
    function pause(){pausedUntil=Date.now()+9000;schedule();}

    setActive(0);
    carousel.addEventListener('pointerdown',pause,{passive:true});
    carousel.addEventListener('touchstart',pause,{passive:true});
    carousel.addEventListener('wheel',pause,{passive:true});
    carousel.addEventListener('mouseenter',pause,{passive:true});
    carousel.addEventListener('scroll',function(){
      let best=0,bestDistance=Infinity;
      const center=carousel.scrollLeft+carousel.clientWidth/2;
      cards.forEach((card,i)=>{const cardCenter=card.offsetLeft+card.offsetWidth/2;const d=Math.abs(cardCenter-center);if(d<bestDistance){bestDistance=d;best=i;}});
      if(best!==index){index=best;setActive(index)}
    },{passive:true});
    document.addEventListener('visibilitychange',schedule,{passive:true});
    schedule();
    return true;
  }

  function boot(){
    if(initCarousel())return;
    setTimeout(boot,450);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
</script>
`;

function inject(body){
  if(typeof body!=='string' || !body.includes('<body'))return body;
  if(body.includes('ai-home-visual-style'))return body;
  const marker='</body>';
  const index=body.toLowerCase().lastIndexOf(marker);
  if(index<0)return body;
  return body.slice(0,index)+visualCss+'\n'+visualScript+'\n'+body.slice(index);
}

express.response.sendFile=function patchedSendFile(filePath,...args){
  const isIndex=typeof filePath==='string' && /(?:^|[\\/])index\.html$/i.test(filePath);
  if(!isIndex)return originalSendFile.call(this,filePath,...args);
  const response=this;
  const originalSend=response.send;
  response.send=function aiHomeVisualSend(body){
    try{return originalSend.call(this,inject(body))}
    catch(error){console.error('[AI HOME VISUAL]',error.message);return originalSend.call(this,body)}
  };
  try{return originalSendFile.call(this,filePath,...args)}
  finally{response.send=originalSend}
};

console.log('[AI HOME VISUAL] premium orb showcase layer loaded');
