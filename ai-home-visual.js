const express = require('express');

const originalSendFile = express.response.sendFile;

const visualCss = `
<style id="ai-home-visual-style">
#ai-gifts-home .ai-home-top{margin:0;padding:11px 13px 9px;border:1px solid rgba(255,255,255,.10);border-bottom:0;border-radius:24px 24px 0 0;background:linear-gradient(145deg,rgba(41,25,63,.98),rgba(15,10,24,.98));box-shadow:0 18px 48px rgba(0,0,0,.25)}
#ai-gifts-home .home-title{font-size:28px}
#ai-gifts-home .ai-home-eyebrow{font-size:7px}
#ai-gifts-home .ai-home-status{font-size:6.5px;padding:6px 8px}
#ai-gifts-home .ai-home-account{margin:0;padding:8px 11px 9px;border:1px solid rgba(255,255,255,.10);border-top:0;border-bottom:0;border-radius:0;background:linear-gradient(145deg,rgba(41,25,63,.98),rgba(15,10,24,.98));box-shadow:none}
#ai-gifts-home .ai-home-account-avatar{width:34px;height:34px;flex-basis:34px;border-radius:11px;font-size:13px}
#ai-gifts-home .ai-home-account-name{font-size:10px}
#ai-gifts-home .ai-home-account-subtitle{font-size:6.5px}
#ai-gifts-home .ai-home-account-balance{min-height:33px;padding:5px 7px}
#ai-gifts-home .ai-home-account-balance-value{font-size:9.5px}
#ai-gifts-home .ai-home-hero{margin:0 0 14px;padding:10px 14px 13px;border:1px solid rgba(255,255,255,.10);border-top:0;border-radius:0 0 24px 24px;background:linear-gradient(145deg,rgba(41,25,63,.98),rgba(15,10,24,.98));box-shadow:0 18px 48px rgba(0,0,0,.25)}
#ai-gifts-home .ai-home-hero-kicker{padding:4px 7px;font-size:6.5px}
#ai-gifts-home .ai-home-hero-title{margin:7px 0 4px;font-size:17px;line-height:1.10}
#ai-gifts-home .ai-home-hero-text{font-size:8.5px;line-height:1.42}
#ai-gifts-home .ai-home-hero-glow{gap:5px;margin-top:9px}
#ai-gifts-home .ai-home-glow-chip{padding:5px 7px;font-size:6.5px}
#ai-gifts-home .home-section-head{margin:0 2px 9px}
#ai-gifts-home .home-section-title{font-size:14px}
#ai-gifts-home .home-section-subtitle{font-size:8px;margin-top:3px}
#ai-gifts-home .home-section-badge{font-size:7px;padding:5px 8px}
#ai-gifts-home .home-types{gap:10px;margin-bottom:15px}
#ai-gifts-home .home-card{min-height:235px;border-width:2px;border-radius:24px;transform:none;box-shadow:0 20px 48px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.08)}
#ai-gifts-home .home-card.ai-home-song-card{border-color:rgba(203,148,255,.68);background:linear-gradient(160deg,rgba(64,30,99,.98),rgba(25,13,42,.98));box-shadow:0 20px 52px rgba(0,0,0,.32),0 0 36px rgba(166,97,255,.20),inset 0 1px 0 rgba(255,255,255,.10)}
#ai-gifts-home .home-card.ai-home-video-card{border-color:rgba(103,208,255,.62);background:linear-gradient(160deg,rgba(26,57,100,.98),rgba(15,20,42,.98));box-shadow:0 20px 52px rgba(0,0,0,.32),0 0 36px rgba(72,177,255,.17),inset 0 1px 0 rgba(255,255,255,.10)}
#ai-gifts-home .home-art{height:142px}
#ai-gifts-home .home-art-ring{width:94px;height:94px}
#ai-gifts-home .home-orb{width:68px;height:68px;border-radius:21px;font-size:30px;background:rgba(255,255,255,.11);border-color:rgba(255,255,255,.23);box-shadow:0 14px 34px rgba(0,0,0,.23)}
#ai-gifts-home .home-chip{left:10px;bottom:10px;font-size:6.5px;padding:6px 8px;background:rgba(3,2,10,.52)}
#ai-gifts-home .home-ready,#ai-gifts-home .home-soon{right:10px;top:10px;font-size:6.5px;padding:6px 8px}
#ai-gifts-home .home-body{padding:13px 13px 14px}
#ai-gifts-home .home-kicker{font-size:12px}
#ai-gifts-home .home-desc{margin:6px 0 11px;font-size:9px;line-height:1.42;min-height:34px}
#ai-gifts-home .home-link{font-size:9px}
#ai-gifts-home .home-arrow{width:26px;height:26px;border-radius:9px;font-size:13px}
#ai-gifts-home .home-showcase{margin-top:2px;margin-bottom:14px;padding:15px;border-radius:22px;background:rgba(18,12,27,.80);border-color:rgba(255,255,255,.10)}
#ai-gifts-home .home-marquee-viewport{border-radius:17px}
#ai-gifts-home .home-marquee{gap:10px;animation-duration:30s}
#ai-gifts-home .home-sample{width:218px;min-height:108px;padding:12px;border-radius:18px;gap:11px;background:linear-gradient(145deg,rgba(255,255,255,.06),rgba(255,255,255,.018));border-color:rgba(255,255,255,.10)}
#ai-gifts-home .home-sample-art{width:58px;height:58px;flex-basis:58px;border-radius:17px;font-size:24px}
#ai-gifts-home .home-sample-text span{font-size:7px}
#ai-gifts-home .home-sample-text strong{margin-top:5px;font-size:10px}
#ai-gifts-home .home-sample-text small{margin-top:5px;font-size:7px}
@media(max-width:390px){
  #ai-gifts-home .home-title{font-size:26px}
  #ai-gifts-home .ai-home-hero{padding:9px 12px 12px}
  #ai-gifts-home .ai-home-hero-title{font-size:16px}
  #ai-gifts-home .home-types{gap:7px}
  #ai-gifts-home .home-card{min-height:220px}
  #ai-gifts-home .home-art{height:128px}
  #ai-gifts-home .home-orb{width:62px;height:62px;font-size:27px}
  #ai-gifts-home .home-body{padding:11px}
  #ai-gifts-home .home-kicker{font-size:11px}
  #ai-gifts-home .home-desc{font-size:8px}
  #ai-gifts-home .home-sample{width:198px;min-height:100px}
  #ai-gifts-home .home-sample-art{width:54px;height:54px;flex-basis:54px}
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
