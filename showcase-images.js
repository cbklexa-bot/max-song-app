const express = require('express');

const originalSendFile = express.response.sendFile;

const imageEnhancement = `
<style id="ai-showcase-images-style">
.showcase-sphere{position:relative;overflow:visible!important}
.showcase-sphere-art{position:absolute;inset:6px;border-radius:50%;overflow:hidden;z-index:0;pointer-events:none;background:radial-gradient(circle at 35% 28%,rgba(255,255,255,.18),rgba(126,90,198,.12) 45%,rgba(10,6,22,.08) 100%);}
.showcase-sphere-art img{display:block;width:100%;height:100%;object-fit:cover;opacity:.84;filter:saturate(1.14) contrast(1.05);}
.showcase-sphere.has-image:after{content:"";position:absolute;z-index:1;inset:6px;border-radius:50%;pointer-events:none;box-shadow:inset 0 0 26px rgba(255,255,255,.08),inset 0 -22px 38px rgba(40,15,90,.20);}
.showcase-sphere.has-image .showcase-sphere-title{z-index:3;text-shadow:0 2px 16px rgba(0,0,0,.72),0 0 14px rgba(255,255,255,.16)}
.showcase-sphere.has-image .showcase-play{z-index:4;box-shadow:0 0 24px rgba(72,211,255,.20),0 5px 18px rgba(0,0,0,.26)!important}
.showcase-sphere.is-playing.has-image .showcase-sphere-art img{opacity:.94;filter:saturate(1.18) contrast(1.06) brightness(1.05);}
</style>
<script id="ai-showcase-images-script">
(function(){
  const exts=['.jpg','.jpeg','.png','.webp'];
  function loadImage(urls,img,card,art,index){
    if(index>=urls.length)return;
    img.onload=function(){card.classList.add('has-image');art.style.display='block'};
    img.onerror=function(){loadImage(urls,img,card,art,index+1)};
    img.src=urls[index];
  }
  function enhance(){
    document.querySelectorAll('#music-showcase-track .showcase-sphere').forEach(function(card){
      if(card.dataset.imageEnhance==='1')return;
      card.dataset.imageEnhance='1';
      const audio=card.querySelector('.showcase-audio');
      if(!audio||!audio.src)return;
      const src=new URL(audio.src,window.location.href).pathname;
      const slash=src.lastIndexOf('/');
      if(slash<0)return;
      const dir=src.slice(0,slash);
      const encodedName=src.slice(slash+1);
      let stem='';
      try{stem=decodeURIComponent(encodedName).replace(/\.[^.]+$/,'')}catch(e){stem=encodedName.replace(/\.[^.]+$/,'')}
      const encStem=encodeURIComponent(stem);
      const urls=exts.map(function(ext){return dir+'/images/'+encStem+ext});
      const art=document.createElement('div');
      art.className='showcase-sphere-art';
      const img=document.createElement('img');
      img.alt='';
      img.loading='lazy';
      art.appendChild(img);
      card.insertBefore(art,card.firstChild);
      loadImage(urls,img,card,art,0);
    });
  }
  setTimeout(enhance,0);
  setTimeout(enhance,350);
})();
</script>
`;

function inject(body){
  if(typeof body!=='string' || !body.includes('<body'))return body;
  if(body.includes('ai-showcase-images-style'))return body;
  const marker='</body>';
  const index=body.toLowerCase().lastIndexOf(marker);
  if(index<0)return body;
  return body.slice(0,index)+imageEnhancement+'\n'+body.slice(index);
}

express.response.sendFile=function patchedShowcaseImageSendFile(filePath,...args){
  const isIndex=typeof filePath==='string' && /(?:^|[\\/])index\.html$/i.test(filePath);
  if(!isIndex)return originalSendFile.call(this,filePath,...args);
  const response=this;
  const originalSend=response.send;
  response.send=function showcaseImageSend(body){
    try{return originalSend.call(this,inject(body));}
    catch(error){console.error('[SHOWCASE IMAGES]',error.message);return originalSend.call(this,body)}
  };
  try{return originalSendFile.call(this,filePath,...args)}
  finally{response.send=originalSend}
};

console.log('[SHOWCASE IMAGES] module loaded');
