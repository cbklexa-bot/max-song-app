const express = require('express');

const originalSendFile = express.response.sendFile;

const visualCss = `
<style id="ai-home-visual-style">
#ai-gifts-home img{max-width:100%}
#ai-gifts-home .home-hero-card{-webkit-tap-highlight-color:transparent}
#ai-gifts-home .home-carousel{overscroll-behavior-x:contain}
#ai-gifts-home .home-title{position:relative;color:#f5fbff;-webkit-text-fill-color:#f5fbff;background:none;text-shadow:0 0 2px rgba(255,255,255,.98),0 0 10px rgba(117,213,255,.72),0 0 24px rgba(103,190,255,.34),0 0 44px rgba(150,91,255,.18);filter:drop-shadow(0 7px 22px rgba(37,155,255,.16))}
#ai-gifts-home .home-title:before{content:"";position:absolute;left:-7px;right:calc(18% - 7px);top:-6px;bottom:-9px;border-radius:14px;border:1px solid rgba(126,215,255,.14);background:linear-gradient(90deg,rgba(91,190,255,.07),rgba(156,93,255,.035),transparent);box-shadow:0 0 22px rgba(94,198,255,.08),inset 0 0 18px rgba(255,255,255,.018);z-index:-1;pointer-events:none}
#ai-gifts-home .home-hero-kicker,#ai-gifts-home .home-hero-title{display:none!important}
#ai-gifts-home .home-hero-content{bottom:20px}
#ai-gifts-home .home-hero-text{margin-top:0}
#ai-gifts-home .ai-home-account-subtitle{display:none!important}
#ai-gifts-home .home-section-head{position:relative}
#ai-gifts-home .home-section-head:after{content:"";position:absolute;left:0;bottom:-5px;width:118px;height:1px;background:linear-gradient(90deg,rgba(99,211,255,.72),rgba(146,96,255,.38),transparent);box-shadow:0 0 12px rgba(95,202,255,.24)}
#ai-gifts-home .home-carousel-hint,#ai-gifts-home .home-sample-note{display:none!important}
#ai-gifts-home .home-carousel{position:relative;height:214px;padding:7px 0 11px;gap:0;align-items:center;background:transparent!important;border:0!important;box-shadow:none!important;scrollbar-width:none;perspective:1100px;mask-image:linear-gradient(90deg,transparent 0,rgba(0,0,0,.95) 9%,#000 18%,#000 82%,rgba(0,0,0,.95) 91%,transparent 100%);-webkit-mask-image:linear-gradient(90deg,transparent 0,rgba(0,0,0,.95) 9%,#000 18%,#000 82%,rgba(0,0,0,.95) 91%,transparent 100%)}
#ai-gifts-home .home-carousel:before{content:"";position:absolute;left:12%;right:12%;top:50%;height:82px;transform:translateY(-50%);border-radius:50%;background:radial-gradient(ellipse at center,rgba(66,188,255,.08),rgba(118,91,255,.03) 38%,transparent 72%);filter:blur(24px);pointer-events:none}
#ai-gifts-home .home-sample{flex-basis:54%;height:172px;margin-left:-7%;border-color:rgba(190,230,255,.18);background:radial-gradient(circle at 34% 27%,rgba(255,255,255,.23) 0%,rgba(255,255,255,.06) 8%,transparent 22%),radial-gradient(circle at 42% 42%,rgba(255,255,255,.035),transparent 46%),radial-gradient(circle at 50% 62%,color-mix(in srgb,var(--orb) 20%,transparent),transparent 62%),linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.008));box-shadow:0 18px 44px rgba(0,0,0,.42),0 0 24px color-mix(in srgb,var(--orb) 19%,transparent),0 0 58px color-mix(in srgb,var(--orb2) 7%,transparent),inset 0 0 28px rgba(255,255,255,.03),inset 0 0 0 1px rgba(255,255,255,.025);backdrop-filter:blur(15px) saturate(120%);-webkit-backdrop-filter:blur(15px) saturate(120%);transform-origin:center center;transition:transform 2.15s cubic-bezier(.22,.72,.2,1),opacity 2.15s ease,filter 2.15s ease;will-change:transform,opacity,filter}
#ai-gifts-home .home-sample:first-child{margin-left:23%}
#ai-gifts-home .home-sample:before{inset:6px;border-color:rgba(225,247,255,.10);box-shadow:inset 0 0 26px rgba(255,255,255,.03),0 0 18px rgba(110,214,255,.025)}
#ai-gifts-home .home-sample:after{left:17%;right:17%;top:9%;height:22%;background:linear-gradient(115deg,transparent 2%,rgba(255,255,255,.22) 40%,rgba(164,233,255,.14) 55%,transparent 84%);filter:blur(4px)}
#ai-gifts-home .home-sample.is-active{transform:translateY(-5px) scale(1.03);opacity:1;filter:saturate(1.12) brightness(1.04);animation:aiOrbFloat 5.8s ease-in-out infinite}
#ai-gifts-home .home-sample:not(.is-active){opacity:.43;transform:translateY(4px) scale(.87);filter:saturate(.82) blur(.1px)}
#ai-gifts-home .home-sample-top{padding:22px 14px 16px;align-items:flex-start}
#ai-gifts-home .home-sample-text span,#ai-gifts-home .home-sample-text small{display:none!important}
#ai-gifts-home .home-sample-art{width:38px;height:38px;margin-bottom:5px;font-size:14px;box-shadow:0 0 22px color-mix(in srgb,var(--orb) 24%,transparent),inset 0 0 16px rgba(255,255,255,.06);animation:aiOrbCore 4.4s ease-in-out infinite}
#ai-gifts-home .home-sample-text strong{font-size:11px;margin-top:0;text-shadow:0 0 16px color-mix(in srgb,var(--orb) 28%,transparent)}
#ai-gifts-home .home-sample-player{left:16px;right:16px;bottom:50%;transform:translateY(50%);padding:6px 8px;background:rgba(3,9,17,.20);border-color:rgba(178,230,255,.07);box-shadow:0 4px 18px rgba(0,0,0,.16),inset 0 1px 0 rgba(255,255,255,.03)}
#ai-gifts-home .home-sample-play{width:22px;height:22px;flex-basis:22px;font-size:7px;box-shadow:0 0 15px color-mix(in srgb,var(--orb) 18%,transparent)}
#ai-gifts-home .home-sample-track-line:after{animation:aiTrackShimmer 3.8s linear infinite}
@keyframes aiOrbFloat{0%,100%{margin-top:0}50%{margin-top:-5px}}
@keyframes aiOrbCore{0%,100%{transform:scale(1);box-shadow:0 0 20px color-mix(in srgb,var(--orb) 22%,transparent),inset 0 0 16px rgba(255,255,255,.06)}50%{transform:scale(1.045);box-shadow:0 0 30px color-mix(in srgb,var(--orb) 31%,transparent),inset 0 0 20px rgba(255,255,255,.09)}}
@keyframes aiTrackShimmer{0%{filter:brightness(.85)}50%{filter:brightness(1.2)}100%{filter:brightness(.85)}}
#ai-song-page-transition .transition-pulse{display:none!important}
@media(max-width:390px){#ai-gifts-home .home-title{font-size:26px}#ai-gifts-home .home-carousel{height:202px}#ai-gifts-home .home-sample{height:156px;flex-basis:56%;margin-left:-9%}#ai-gifts-home .home-sample:first-child{margin-left:22%}#ai-gifts-home .home-sample-top{padding:20px 11px 14px}#ai-gifts-home .home-sample-art{width:35px;height:35px;font-size:13px}#ai-gifts-home .home-sample-player{left:13px;right:13px}}
@media(min-width:520px){#ai-gifts-home .home-sample{flex-basis:47%}}
@media(prefers-reduced-motion:reduce){.home-hero-media img,.home-sample,.home-sample.is-active,.home-sample-art,.home-sample-track-line:after{transition:none;animation:none}}
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
    let index=0,timer=null,pausedUntil=0;
    function setActive(i){cards.forEach((card,n)=>card.classList.toggle('is-active',n===i));}
    function centerCard(i,behavior='smooth'){index=(i+cards.length)%cards.length;setActive(index);const card=cards[index];const target=Math.max(0,card.offsetLeft-(carousel.clientWidth-card.offsetWidth)/2);carousel.scrollTo({left:target,behavior});}
    function schedule(){clearTimeout(timer);timer=setTimeout(function step(){if(document.hidden||Date.now()<pausedUntil){schedule();return}centerCard(index+1,'smooth');schedule()},8200)}
    function pause(){pausedUntil=Date.now()+9500;schedule()}
    centerCard(0,'auto');
    carousel.addEventListener('pointerdown',pause,{passive:true});
    carousel.addEventListener('touchstart',pause,{passive:true});
    carousel.addEventListener('wheel',pause,{passive:true});
    carousel.addEventListener('mouseenter',pause,{passive:true});
    carousel.addEventListener('scroll',function(){let best=0,bestDistance=Infinity;const center=carousel.scrollLeft+carousel.clientWidth/2;cards.forEach((card,i)=>{const d=Math.abs((card.offsetLeft+card.offsetWidth/2)-center);if(d<bestDistance){bestDistance=d;best=i}});if(best!==index){index=best;setActive(index)}},{passive:true});
    document.addEventListener('visibilitychange',schedule,{passive:true});
    schedule();return true;
  }
  function boot(){if(initCarousel())return;setTimeout(boot,450)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
</script>
`;

function inject(body){
  if(typeof body!=='string' || !body.includes('<body'))return body;
  if(body.includes('ai-home-visual-style'))return body;
  const marker='</body>';const index=body.toLowerCase().lastIndexOf(marker);if(index<0)return body;
  return body.slice(0,index)+visualCss+'\n'+visualScript+'\n'+body.slice(index);
}

express.response.sendFile=function patchedSendFile(filePath,...args){
  const isIndex=typeof filePath==='string' && /(?:^|[\\/])index\.html$/i.test(filePath);
  if(!isIndex)return originalSendFile.call(this,filePath,...args);
  const response=this,originalSend=response.send;
  response.send=function aiHomeVisualSend(body){try{return originalSend.call(this,inject(body))}catch(error){console.error('[AI HOME VISUAL]',error.message);return originalSend.call(this,body)}};
  try{return originalSendFile.call(this,filePath,...args)}finally{response.send=originalSend}
};

console.log('[AI HOME VISUAL] premium orb showcase layer loaded');
