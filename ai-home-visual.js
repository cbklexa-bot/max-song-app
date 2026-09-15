const express = require('express');

const originalSendFile = express.response.sendFile;

const visualCss = `
<style id="ai-home-visual-style">
/* Music home: keep the account at the top and show the main neon title. */
#ai-gifts-home{padding-top:10px !important}
#ai-gifts-home .ai-home-top{display:block !important;margin:8px 0 17px !important;text-align:center !important}
#ai-gifts-home .ai-home-top .home-title{display:block !important}

/* Main music card: portrait image fills the entire card. */
#ai-gifts-home .home-card{min-height:0 !important;height:auto !important;border-radius:28px !important;overflow:hidden !important}
#ai-gifts-home .home-art{height:auto !important;aspect-ratio:4/5 !important;min-height:0 !important;background-size:cover !important;background-position:center !important}

/* CTA is printed directly over the image, with no separate panel/icon container. */
#ai-gifts-home .home-card-cta{left:18px !important;right:auto !important;bottom:18px !important;padding:0 !important;margin:0 !important;display:flex !important;align-items:center !important;justify-content:flex-start !important;gap:9px !important;background:none !important;border:0 !important;border-radius:0 !important;backdrop-filter:none !important;-webkit-backdrop-filter:none !important;box-shadow:none !important}
#ai-gifts-home .home-card-cta span:first-child{font-size:16px !important;line-height:1 !important;font-weight:950 !important;letter-spacing:-.02em !important;color:#fff !important;text-shadow:0 2px 16px rgba(0,0,0,.72),0 0 18px rgba(255,255,255,.14) !important}
#ai-gifts-home .home-arrow{width:auto !important;height:auto !important;min-width:0 !important;flex:0 0 auto !important;padding:0 !important;border:0 !important;border-radius:0 !important;background:none !important;color:#fff !important;font-size:25px !important;line-height:.8 !important;box-shadow:none !important;text-shadow:0 2px 16px rgba(0,0,0,.72),0 0 18px rgba(255,255,255,.16) !important}

@media(max-width:390px){
  #ai-gifts-home{padding-left:10px !important;padding-right:10px !important}
  #ai-gifts-home .ai-home-top{margin-bottom:14px !important}
  #ai-gifts-home .ai-home-top .home-title{font-size:32px !important}
  #ai-gifts-home .home-card-cta{left:14px !important;bottom:14px !important}
  #ai-gifts-home .home-card-cta span:first-child{font-size:15px !important}
  #ai-gifts-home .home-arrow{font-size:23px !important}
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
