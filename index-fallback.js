const express=require('express');
const fs=require('fs');
const originalSendFile=express.response.sendFile;

express.response.sendFile=function patchedIndexFallback(filePath,...args){
  if(typeof filePath==='string' && /[\\/]public[\\/]index\.html$/i.test(filePath) && !fs.existsSync(filePath)){
    const rootIndex=require('path').join(process.cwd(),'index.html');
    if(fs.existsSync(rootIndex)){
      console.warn('[INDEX FALLBACK] public/index.html missing; serving root index.html');
      return originalSendFile.call(this,rootIndex,...args);
    }
  }
  return originalSendFile.call(this,filePath,...args);
};

console.log('[INDEX FALLBACK] module loaded');
