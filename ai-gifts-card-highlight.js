const express = require('express');

const originalSend = express.response.send;

const css = `
<style id="ai-gifts-card-highlight-style">
#ai-gifts-home .home-types .home-card.ai-gift-home-final{
  border:2px solid rgba(255,255,255,.24)!important;
  box-shadow:
    0 18px 52px rgba(0,0,0,.42),
    0 0 0 1px rgba(255,255,255,.08),
    0 0 34px rgba(176,92,255,.30)!important;
  transform:translateY(0);
  transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease;
}
#ai-gifts-home .home-types .home-card.ai-gift-home-final:nth-child(2){
  border-color:rgba(115,210,255,.30)!important;
  box-shadow:
    0 18px 52px rgba(0,0,0,.42),
    0 0 0 1px rgba(115,210,255,.10),
    0 0 34px rgba(65,190,255,.28)!important;
}
#ai-gifts-home .home-types .home-card.ai-gift-home-final::before{
  content:"";
  position:absolute;
  inset:0;
  z-index:2;
  pointer-events:none;
  border-radius:22px;
  background:linear-gradient(135deg,rgba(255,255,255,.14),transparent 24%,transparent 72%,rgba(255,255,255,.05));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.20),inset 0 0 28px rgba(255,255,255,.035);
}
#ai-gifts-home .home-types .home-card.ai-gift-home-final:nth-child(1)::after,
#ai-gifts-home .home-types .home-card.ai-gift-home-final:nth-child(2)::after{
  content:"";
  position:absolute;
  inset:-5px;
  z-index:-1;
  border-radius:28px;
  pointer-events:none;
  opacity:.72;
}
#ai-gifts-home .home-types .home-card.ai-gift-home-final:nth-child(1)::after{
  background:radial-gradient(circle at 50% 55%,rgba(171,79,255,.28),transparent 68%);
  filter:blur(12px);
}
#ai-gifts-home .home-types .home-card.ai-gift-home-final:nth-child(2)::after{
  background:radial-gradient(circle at 50% 55%,rgba(55,190,255,.24),transparent 68%);
  filter:blur(12px);
}
#ai-gifts-home .home-types .home-card.ai-gift-home-final:active{
  transform:translateY(1px) scale(.992);
}
</style>`;

function inject(body){
  if(typeof body!=='string'||body.indexOf('ai-gifts-card-highlight-style')!==-1||body.indexOf('<html')===-1)return body;
  var at=body.toLowerCase().lastIndexOf('</body>');
  if(at<0)return body;
  return body.slice(0,at)+css+'\n'+body.slice(at);
}

express.response.send=function patchedSend(body){
  try{body=inject(body)}catch(error){console.error('[AI GIFTS CARD HIGHLIGHT]',error.message)}
  return originalSend.call(this,body);
};

console.log('[AI GIFTS CARD HIGHLIGHT] module loaded');
