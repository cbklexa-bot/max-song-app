const express = require('express');

const originalSendFile = express.response.sendFile;

const visualCss = `
<style id="ai-home-visual-style">
/* Compact top area: profile becomes the first app block directly below MAX header. */
#ai-gifts-home{padding-top:0 !important}
#ai-gifts-home .ai-home-top{display:none !important}
#ai-gifts-home .ai-home-account{margin:0 0 8px !important;padding:9px 11px !important;border:1px solid rgba(255,255,255,.11) !important;border-radius:18px !important;background:linear-gradient(145deg,rgba(34,19,50,.98),rgba(14,9,23,.98)) !important;box-shadow:0 14px 34px rgba(0,0,0,.22) !important}
#ai-gifts-home .ai-home-account-avatar{width:36px;height:36px;flex-basis:36px}
#ai-gifts-home .ai-home-account-name{font-size:10.5px}
#ai-gifts-home .ai-home-account-subtitle{font-size:6.5px}
#ai-gifts-home .ai-home-account-balance{min-height:34px;padding:5px 8px}
#ai-gifts-home .ai-home-account-balance-value{font-size:10px}

/* Trim the intro card so the product choices move into the visible first screen. */
#ai-gifts-home .ai-home-hero{margin:0 0 11px !important;padding:11px 13px 12px !important;border:1px solid rgba(255,255,255,.10) !important;border-radius:18px !important;background:linear-gradient(145deg,rgba(38,22,56,.96),rgba(15,10,24,.98)) !important;box-shadow:0 15px 38px rgba(0,0,0,.23) !important}
#ai-gifts-home .ai-home-hero-kicker,#ai-gifts-home .ai-home-hero-glow{display:none !important}
#ai-gifts-home .ai-home-hero-title{margin:0 0 5px !important;font-size:18px !important;line-height:1.08 !important}
#ai-gifts-home .ai-home-hero-text{font-size:8.5px !important;line-height:1.36 !important;max-height:34px;overflow:hidden}

/* Keep the two product choices prominent, but slightly shorter than the previous pass. */
#ai-gifts-home .home-section-head{margin:0 2px 8px}
#ai-gifts-home .home-section-title{font-size:14px}
#ai-gifts-home .home-section-subtitle{font-size:8px;margin-top:3px}
#ai-gifts-home .home-section-badge{font-size:7px;padding:5px 8px}
#ai-gifts-home .home-types{gap:9px;margin-bottom:13px}
#ai-gifts-home .home-card{min-height:215px !important;border-width:2px;border-radius:23px;transform:none;box-shadow:0 19px 45px rgba(0,0,0,.31),inset 0 1px 0 rgba(255,255,255,.08)}
#ai-gifts-home .home-art{height:122px !important}
#ai-gifts-home .home-art-ring{width:90px;height:90px}
#ai-gifts-home .home-orb{width:64px;height:64px;border-radius:20px;font-size:29px}
#ai-gifts-home .home-body{padding:12px 12px 13px}
#ai-gifts-home .home-kicker{font-size:11.5px}
#ai-gifts-home .home-desc{margin:5px 0 9px;font-size:8.5px;line-height:1.38;min-height:31px}
#ai-gifts-home .home-link{font-size:8.5px}
#ai-gifts-home .home-arrow{width:25px;height:25px;border-radius:9px;font-size:12px}

/* Keep the showcase large enough to remain visible on the first mobile screen. */
#ai-gifts-home .home-showcase{margin-top:2px;margin-bottom:12px;padding:14px;border-radius:21px}
#ai-gifts-home .home-marquee-viewport{border-radius:16px}
#ai-gifts-home .home-marquee{gap:9px;animation-duration:30s}
#ai-gifts-home .home-sample{width:210px;min-height:104px;padding:11px;border-radius:17px;gap:10px}
#ai-gifts-home .home-sample-art{width:56px;height:56px;flex-basis:56px;border-radius:16px;font-size:23px}
#ai-gifts-home .home-sample-text span{font-size:7px}
#ai-gifts-home .home-sample-text strong{margin-top:5px;font-size:9.5px}
#ai-gifts-home .home-sample-text small{margin-top:4px;font-size:7px}

/* Preserve the stronger visual separation of Song and Video cards. */
#ai-gifts-home .home-card.ai-home-song-card{border-color:rgba(203,148,255,.68);background:linear-gradient(160deg,rgba(64,30,99,.98),rgba(25,13,42,.98));box-shadow:0 19px 48px rgba(0,0,0,.31),0 0 32px rgba(166,97,255,.19),inset 0 1px 0 rgba(255,255,255,.10)}
#ai-gifts-home .home-card.ai-home-video-card{border-color:rgba(103,208,255,.62);background:linear-gradient(160deg,rgba(26,57,100,.98),rgba(15,20,42,.98));box-shadow:0 19px 48px rgba(0,0,0,.31),0 0 32px rgba(72,177,255,.16),inset 0 1px 0 rgba(255,255,255,.10)}

@media(max-width:390px){
  #ai-gifts-home .home-card{min-height:205px !important}
  #ai-gifts-home .home-art{height:116px !important}
  #ai-gifts-home .home-orb{width:60px;height:60px;font-size:26px}
  #ai-gifts-home .home-body{padding:10px}
  #ai-gifts-home .home-kicker{font-size:11px}
  #ai-gifts-home .home-desc{font-size:8px;line-height:1.35}
  #ai-gifts-home .home-sample{width:195px;min-height:98px}
  #ai-gifts-home .home-sample-art{width:52px;height:52px;flex-basis:52px}
}
</style>
`;

function inject(body){
  if(typeof body!=='string' || !body.includes('<body'))return body;
  if(body.includes('ai-home-visual-style'))return body;
  const marker='</body>';
  const index=body.toLowerCase().lastIndexOf(marker);
  if(index<0)return body;
  return body.slice(0,index)+visualCss+'\n'+body.slice(index);
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

console.log('[AI HOME VISUAL] module loaded');
