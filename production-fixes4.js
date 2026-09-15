const express = require('express');
const originalSendFile = express.response.sendFile;

const css = `<style id="production-fixes4-style">
/* Final interaction layer: keep the active song screen above the home overlay. */
body.ai-song-visual-screen .app{position:relative;z-index:50!important;pointer-events:auto!important}
body.ai-song-visual-screen .card,body.ai-song-visual-screen .choice,body.ai-song-visual-screen #balance-button,body.ai-song-visual-screen #generate,body.ai-song-visual-screen textarea{position:relative;z-index:60!important;pointer-events:auto!important}
#topup-modal{z-index:100000!important;pointer-events:auto!important}
#topup-modal *{pointer-events:auto}
#ai-home-account,#ai-home-balance-button{position:relative;z-index:70!important;pointer-events:auto!important}
#ai-gifts-home{position:relative;z-index:1}
#ai-song-page-transition{pointer-events:none!important}
</style>`;

const script = `<script id="production-fixes4-script">(function(){
if(window.__PRODUCTION_FIXES4__)return;window.__PRODUCTION_FIXES4__=true;

function getInitData(){
  try{const value=String(window.WebApp?.initData||'').trim();if(value)return value}catch(_){}
  try{
    const hash=String(location.hash||'').replace(/^#/,'');
    if(hash){const p=new URLSearchParams(hash);const value=p.get('WebAppData');if(value)return value.trim();}
  }catch(_){}
  try{
    const p=new URLSearchParams(location.search||'');
    const value=p.get('WebAppData')||p.get('initData');
    if(value)return String(value).trim();
  }catch(_){}
  return '';
}

function patchFetch(){
  if(window.__PRODUCTION_FIXES4_FETCH__)return;
  const originalFetch=window.fetch.bind(window);
  window.fetch=function(input,options){
    try{
      const url=typeof input==='string'?input:(input&&input.url)||'';
      if(/\/api\//.test(url)){
        const initData=getInitData();
        const next={...(options||{})};
        const headers=new Headers(next.headers||{});
        if(initData)headers.set('X-MAX-Init-Data',initData);
        next.headers=headers;
        return originalFetch(input,next);
      }
    }catch(error){console.warn('[PRODUCTION FIXES 4] fetch patch',error)}
    return originalFetch(input,options);
  };
  window.__PRODUCTION_FIXES4_FETCH__=true;
}

async function repairAccount(){
  patchFetch();
  const initData=getInitData();
  if(!initData)return false;
  try{
    const response=await fetch('/api/user',{method:'GET',headers:{'X-MAX-Init-Data':initData},cache:'no-store'});
    const text=await response.text();
    let data={};try{data=text?JSON.parse(text):{}}catch(_){return false}
    if(!response.ok||!data.ok||!data.user)return false;
    if(typeof window.setBalance==='function')window.setBalance(data.user.balance||0);
    const orders=Array.isArray(data.orders)?data.orders:[];
    if(typeof window.renderOrders==='function')window.renderOrders(orders.filter(order=>order.status!=='failed'));
    if(typeof window.loadOrders==='function'){
      try{await window.loadOrders()}catch(_){}
    }
    if(typeof window.updateGenerateAvailability==='function')window.updateGenerateAvailability();
    const name=data.user.name||'';
    if(name){
      const clean=name.trim();
      const userName=document.getElementById('user-name');
      if(userName&&clean)userName.textContent=clean.split(/\s+/)[0];
      const homeName=document.getElementById('ai-home-account-name');
      if(homeName&&clean)homeName.textContent=clean.split(/\s+/)[0];
      const avatar=document.getElementById('avatar');
      if(avatar&&clean)avatar.textContent=clean.charAt(0).toUpperCase();
      const homeAvatar=document.getElementById('ai-home-account-avatar');
      if(homeAvatar&&clean)homeAvatar.textContent=clean.charAt(0).toUpperCase();
    }
    return true;
  }catch(error){console.warn('[PRODUCTION FIXES 4] account repair',error.message);return false}
}

function bindInteractionGuards(){
  if(document.documentElement.dataset.pf4Interactions==='1')return;
  document.documentElement.dataset.pf4Interactions='1';
  document.addEventListener('click',function(event){
    const choice=event.target.closest?.('.app .choice');
    if(choice){
      requestAnimationFrame(function(){
        if(choice.matches('[data-genre]')){
          document.querySelectorAll('[data-genre]').forEach(el=>el.classList.remove('selected'));
          choice.classList.add('selected');
        }
        if(choice.matches('[data-vocal]')){
          document.querySelectorAll('[data-vocal]').forEach(el=>el.classList.remove('selected'));
          choice.classList.add('selected');
        }
      });
      return;
    }
    const balance=event.target.closest?.('#ai-home-balance-button,#balance-button');
    if(balance){
      try{if(typeof window.openTopup==='function'){window.openTopup();event.preventDefault();event.stopPropagation();}}catch(_){}
    }
  },true);
}

function boot(){
  patchFetch();
  bindInteractionGuards();
  repairAccount();
  setTimeout(repairAccount,900);
  setTimeout(repairAccount,2200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();</script>`;

function inject(body){
  if(typeof body!=='string'||!body.includes('<body')||body.includes('production-fixes4-script'))return body;
  const i=body.toLowerCase().lastIndexOf('</body>');
  if(i<0)return body;
  return body.slice(0,i)+css+script+body.slice(i);
}

express.response.sendFile=function(filePath,...args){
  const isIndex=typeof filePath==='string'&&/(?:^|[\\/])index\.html$/i.test(filePath);
  if(!isIndex)return originalSendFile.call(this,filePath,...args);
  const old=this.send;
  this.send=body=>old.call(this,inject(body));
  try{return originalSendFile.call(this,filePath,...args)}finally{this.send=old}
};

console.log('[PRODUCTION FIXES 4] account retry, dynamic MAX initData, clickability guard loaded');
