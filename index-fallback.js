const express=require('express');
const fs=require('fs');
const path=require('path');
const originalSendFile=express.response.sendFile;

express.response.sendFile=function patchedIndexFallback(filePath,...args){
  const requestPath=this.req?.path || this.req?.originalUrl?.split('?')[0] || '';

  if(typeof filePath==='string' && /[\\/]public[\\/]index\.html$/i.test(filePath)){
    const publicRoot=path.join(process.cwd(),'public');
    const rootIndex=path.join(process.cwd(),'index.html');
    const offerFile=path.join(publicRoot,'oferta.html');

    if(requestPath==='/oferta.html' && fs.existsSync(offerFile)){
      return originalSendFile.call(this,offerFile,...args);
    }

    if(!fs.existsSync(filePath) && fs.existsSync(rootIndex)){
      console.warn('[INDEX FALLBACK] public/index.html missing; serving root index.html');
      return originalSendFile.call(this,rootIndex,...args);
    }
  }

  return originalSendFile.call(this,filePath,...args);
};

console.log('[INDEX FALLBACK] module loaded');
