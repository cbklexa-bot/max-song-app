const express = require('express');

const originalSendFile = express.response.sendFile;

const visualCss = `
<style id="ai-home-visual-style">
/* Keep the account at the top. The large duplicate title is intentionally hidden. */
#ai-gifts-home{padding-top:4px !important}
#ai-gifts-home .ai-home-top{display:none !important}

/* Main music card: portrait layout with a vivid cyan-blue neon halo. */
#ai-gifts-home .home-card{min-height:0 !important;height:auto !important;border-radius:26px !important;overflow:hidden !important;border-color:rgba(126,221,255,.30) !important;box-shadow:0 22px 58px rgba(0,0,0,.38),0 0 28px rgba(44,190,255,.16),0 0 62px rgba(41,156,255,.11) !important;transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease !important}
#ai-gifts-home .home-card:hover{border-color:rgba(133,230,255,.58) !important;box-shadow:0 24px 64px rgba(0,0,0,.40),0 0 34px rgba(44,205,255,.24),0 0 84px rgba(41,156,255,.16) !important}
#ai-gifts-home .home-art{height:auto !important;aspect-ratio:16/17 !important;min-height:0 !important;background-size:cover !important;background-position:center !important}
#ai-gifts-home .home-art:after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 32%,rgba(95,222,255,.10),transparent 42%),linear-gradient(180deg,rgba(32,198,255,.04),transparent 48%,rgba(4,10,18,.08) 100%);mix-blend-mode:screen}

/* CTA is printed directly over the image. */
#ai-gifts-home .home-card-cta{left:18px !important;right:auto !important;bottom:18px !important;padding:0 !important;margin:0 !important;display:flex !important;align-items:center !important;justify-content:flex-start !important;gap:9px !important;background:none !important;border:0 !important;border-radius:0 !important;backdrop-filter:none !important;-webkit-backdrop-filter:none !important;box-shadow:none !important}
#ai-gifts-home .home-card-cta span:first-child{font-size:16px !important;line-height:1 !important;font-weight:950 !important;letter-spacing:-.02em !important;color:#fff !important;text-shadow:0 2px 16px rgba(0,0,0,.72),0 0 18px rgba(255,255,255,.14),0 0 30px rgba(65,206,255,.28) !important}
#ai-gifts-home .home-arrow{width:auto !important;height:auto !important;min-width:0 !important;flex:0 0 auto !important;padding:0 !important;border:0 !important;border-radius:0 !important;background:none !important;color:#fff !important;font-size:25px !important;line-height:.8 !important;box-shadow:none !important;text-shadow:0 2px 16px rgba(0,0,0,.72),0 0 18px rgba(255,255,255,.16),0 0 26px rgba(65,206,255,.32) !important}

/* Glass showcase spheres. The image slot is kept clean; the user can replace the visuals with their own assets. */
#ai-gifts-home .showcase-track{align-items:center}
#ai-gifts-home .showcase-sphere{position:relative;isolation:isolate;overflow:visible;background:radial-gradient(circle at 28% 20%,rgba(255,255,255,.28),rgba(175,117,255,.18) 25%,rgba(91,53,145,.13) 53%,rgba(20,11,39,.06) 100%) !important;border-color:rgba(193,224,255,.23) !important;box-shadow:inset 0 2px 0 rgba(255,255,255,.16),inset 0 -22px 42px rgba(86,56,158,.16),inset 10px 8px 28px rgba(255,255,255,.05),0 16px 38px rgba(0,0,0,.30),0 0 36px rgba(113,101,255,.13) !important}
#ai-gifts-home .showcase-sphere:before{inset:8px !important;border-color:rgba(255,255,255,.09) !important;box-shadow:inset 0 0 22px rgba(127,220,255,.08),0 0 26px rgba(139,96,255,.06)}
#ai-gifts-home .showcase-sphere-title{z-index:2;text-shadow:0 1px 14px rgba(255,255,255,.16),0 0 14px rgba(111,190,255,.12)}
#ai-gifts-home .showcase-play{z-index:3;background:rgba(255,255,255,.10) !important;border-color:rgba(255,255,255,.23) !important;box-shadow:0 0 20px rgba(104,183,255,.15),inset 0 0 16px rgba(255,255,255,.04) !important;transition:transform .18s ease,background .18s ease,box-shadow .18s ease !important}
#ai-gifts-home .showcase-play:active{transform:scale(.93) !important}
#ai-gifts-home .showcase-sphere.is-playing{transform:scale(1.11);border-color:rgba(140,236,255,.72) !important;background:radial-gradient(circle at 28% 20%,rgba(255,255,255,.34),rgba(111,225,255,.24) 25%,rgba(117,76,184,.20) 55%,rgba(255,255,255,.05) 100%) !important;box-shadow:inset 0 2px 0 rgba(255,255,255,.22),inset 0 -22px 44px rgba(67,157,197,.18),0 20px 46px rgba(0,0,0,.35),0 0 42px rgba(65,220,255,.32),0 0 84px rgba(149,95,255,.22) !important}
#ai-gifts-home .showcase-sphere.is-playing .showcase-play{background:rgba(255,255,255,.18) !important;border-color:rgba(255,255,255,.34) !important;box-shadow:0 0 26px rgba(103,225,255,.34),inset 0 0 18px rgba(255,255,255,.05) !important}

/* Remove the small metadata row under the play control. */
#ai-gifts-home .showcase-time{display:none !important}

/* Full-screen creation intro shown before the existing song form. */
#ai-song-intro{position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle at 50% 42%,rgba(93,205,255,.18),transparent 24%),radial-gradient(circle at 28% 28%,rgba(154,83,255,.18),transparent 30%),linear-gradient(180deg,#050611 0%,#090518 54%,#04050c 100%);opacity:0;pointer-events:none;transition:opacity .18s ease}
#ai-song-intro.is-visible{opacity:1;pointer-events:auto}
#ai-song-intro:before,#ai-song-intro:after{content:"";position:absolute;border-radius:50%;pointer-events:none}
#ai-song-intro:before{width:46vmax;height:46vmax;background:radial-gradient(circle,rgba(77,215,255,.14),rgba(77,215,255,0) 67%);animation:aiIntroPulse 1.9s ease-in-out infinite}
#ai-song-intro:after{width:78vmax;height:78vmax;border:1px solid rgba(99,212,255,.13);box-shadow:0 0 80px rgba(91,115,255,.10),inset 0 0 80px rgba(178,90,255,.06);animation:aiIntroRotate 10s linear infinite}
.ai-song-intro-core{position:relative;z-index:2;width:min(82vw,520px);text-align:center;transform:scale(.82);opacity:0;transition:transform .5s cubic-bezier(.16,1,.3,1),opacity .5s ease}
#ai-song-intro.is-visible .ai-song-intro-core{transform:scale(1);opacity:1}
.ai-song-intro-orb{width:104px;height:104px;margin:0 auto 24px;border-radius:50%;position:relative;background:radial-gradient(circle at 32% 24%,rgba(255,255,255,.42),rgba(102,225,255,.24) 24%,rgba(143,74,255,.22) 56%,rgba(255,255,255,.04) 100%);border:1px solid rgba(182,236,255,.30);box-shadow:inset 0 2px 0 rgba(255,255,255,.22),0 0 38px rgba(76,211,255,.28),0 0 78px rgba(146,89,255,.22)}
.ai-song-intro-orb:after{content:"★";position:absolute;left:50%;top:50%;transform:translate(-50%,-53%);font-size:38px;color:#fff;text-shadow:0 0 15px rgba(102,225,255,.85),0 0 34px rgba(167,93,255,.75)}
.ai-song-intro-kicker{font-size:10px;letter-spacing:.30em;text-transform:uppercase;color:rgba(172,224,255,.66);font-weight:800;margin-bottom:12px}
.ai-song-intro-title{font-size:clamp(34px,9vw,58px);line-height:.96;letter-spacing:-.05em;font-weight:950;color:#fff;text-shadow:0 0 18px rgba(91,215,255,.55),0 0 40px rgba(162,84,255,.35)}
.ai-song-intro-subtitle{margin-top:14px;color:rgba(255,255,255,.56);font-size:12px;font-weight:700}
.ai-song-intro-progress{width:min(180px,45vw);height:3px;margin:26px auto 0;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.08)}
.ai-song-intro-progress:after{content:"";display:block;width:44%;height:100%;border-radius:inherit;background:linear-gradient(90deg,rgba(83,222,255,.2),#63ddff,#b17bff);animation:aiIntroProgress 1.8s linear forwards}
@keyframes aiIntroPulse{0%,100%{transform:scale(.88);opacity:.70}50%{transform:scale(1.05);opacity:1}}
@keyframes aiIntroRotate{to{transform:rotate(360deg)}}
@keyframes aiIntroProgress{from{transform:translateX(-130%)}to{transform:translateX(250%)}}

@media(max-width:390px){
  #ai-gifts-home{padding-left:10px !important;padding-right:10px !important}
  #ai-gifts-home .home-card-cta{left:14px !important;bottom:14px !important}
  #ai-gifts-home .home-card-cta span:first-child{font-size:15px !important}
  #ai-gifts-home .home-arrow{font-size:23px !important}
}
@media(prefers-reduced-motion:reduce){
  #ai-song-intro:before,#ai-song-intro:after,.ai-song-intro-progress:after{animation:none !important}
}
</style>
`;

const visualScript = `
<script id="ai-home-visual-script">
(function(){
  function install(){
    const home=document.getElementById('ai-gifts-home');
    const song=document.getElementById('ai-home-song');
    if(!home||!song||song.dataset.aiIntroBound==='1')return;
    song.dataset.aiIntroBound='1';

    const intro=document.createElement('div');
    intro.id='ai-song-intro';
    intro.innerHTML='<div class="ai-song-intro-core"><div class="ai-song-intro-orb"></div><div class="ai-song-intro-kicker">Персональная музыка</div><div class="ai-song-intro-title">Песня по заказу</div><div class="ai-song-intro-subtitle">Создаём песню специально для вас</div><div class="ai-song-intro-progress"></div></div>';
    document.body.appendChild(intro);

    let opening=false;
    let skipNext=false;
    song.addEventListener('click',function(event){
      if(skipNext){
        skipNext=false;
        opening=false;
        return;
      }
      if(opening)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      opening=true;
      intro.classList.add('is-visible');
      window.setTimeout(function(){
        /* Keep the full-screen intro visible while the existing home handler switches to the song form. */
        skipNext=true;
        song.click();
        window.setTimeout(function(){
          intro.classList.remove('is-visible');
          opening=false;
        },120);
      },2000);
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
</script>
`;

function inject(body){
  if(typeof body!=='string' || !body.includes('<body'))return body;
  if(body.includes('ai-home-visual-style'))return body;
  const marker='</body>';
  const index=body.toLowerCase().lastIndexOf(marker);
  if(index<0)return body;
  return body.slice(0,index)+visualCss+visualScript+'\n'+body.slice(index);
}

express.response.sendFile=function patchedSendFile(filePath,...args){
  const isIndex=typeof filePath==='string' && /(?:^|[\\/])index\.html$/i.test(filePath);
  if(!isIndex)return originalSendFile.call(this,filePath,...args);
  const response=this;
  const originalSend=response.send;
  response.send=function aiHomeVisualSend(body){
    try{return originalSend.call(this,inject(body));}
    catch(error){console.error('[AI HOME VISUAL]',error.message);return originalSend.call(this,body)}
  };
  try{return originalSendFile.call(this,filePath,...args)}
  finally{response.send=originalSend}
};

console.log('[AI HOME VISUAL] module loaded: clean transition, neon card, glass spheres');
