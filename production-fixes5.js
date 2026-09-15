const express = require('express');
const originalSendFile = express.response.sendFile;

const css = `<style id="production-fixes5-style">
#topup-modal{z-index:100000!important;pointer-events:auto!important}
#topup-modal.visible{display:flex!important}
#topup-modal *{pointer-events:auto!important}
#ai-home-account,#ai-home-balance-button,#balance-button,#ai-home-song,.choice{pointer-events:auto!important}
body.ai-song-visual-screen .app{position:relative!important;z-index:200!important;pointer-events:auto!important}
body.ai-song-visual-screen .app *{pointer-events:auto}
</style>`;

const script = `<script id="production-fixes5-script">(function(){
if(window.__PRODUCTION_FIXES5__)return;
window.__PRODUCTION_FIXES5__=true;

function initData(){
  try{const v=String(window.WebApp?.initData||'').trim();if(v)return v}catch(_){}
  try{const h=String(location.hash||'').replace(/^#/,'');if(h){const p=new URLSearchParams(h);const v=p.get('WebAppData')||p.get('initData');if(v)return String(v).trim()}}catch(_){}
  try{const p=new URLSearchParams(location.search||'');const v=p.get('WebAppData')||p.get('initData');if(v)return String(v).trim()}catch(_){}
  return '';
}

function applyAccount(data){
  if(!data||!data.user)return false;
  const balance=Number(data.user.balance||0);
  const balanceEl=document.getElementById('balance-value');
  if(balanceEl)balanceEl.textContent=balance+' ₽';
  const homeBalance=document.getElementById('ai-home-account-balance-value');
  if(homeBalance)homeBalance.textContent=balance+' ₽';
  const name=String(data.user.name||'').trim();
  if(name){
    const first=name.split(/\\s+/)[0];
    const userEl=document.getElementById('user-name');if(userEl)userEl.textContent=first;
    const homeName=document.getElementById('ai-home-account-name');if(homeName)homeName.textContent=first;
    const avatar=document.getElementById('avatar');if(avatar)avatar.textContent=first.charAt(0).toUpperCase();
    const homeAvatar=document.getElementById('ai-home-account-avatar');if(homeAvatar)homeAvatar.textContent=first.charAt(0).toUpperCase();
  }
  const orders=Array.isArray(data.orders)?data.orders.filter(o=>o.status!=='failed'):[];
  if(typeof window.renderOrders==='function')window.renderOrders(orders);
  const count=document.getElementById('orders-count');if(count)count.textContent=String(orders.length);
  return true;
}

async function refreshAccount(){
  const token=initData();
  if(!token)return false;
  try{
    const r=await fetch('/api/user',{method:'GET',headers:{'X-MAX-Init-Data':token},cache:'no-store'});
    const text=await r.text();
    const data=text?JSON.parse(text):{};
    if(!r.ok||!data.ok||!data.user){console.warn('[PRODUCTION FIXES 5] /api/user',r.status,data);return false}
    applyAccount(data);
    return true;
  }catch(error){console.warn('[PRODUCTION FIXES 5] account refresh',error.message);return false}
}

function openTopupDirect(){
  const modal=document.getElementById('topup-modal');
  if(!modal)return false;
  modal.classList.add('visible');
  modal.style.display='flex';
  return true;
}

function enterSongDirect(){
  const home=document.getElementById('ai-gifts-home');
  const app=document.querySelector('.app');
  if(!home||!app)return false;
  home.style.display='none';
  app.style.display='block';
  window.__AI_SONG_SCREEN__=true;
  document.body.classList.add('ai-song-visual-screen');
  try{window.WebApp?.BackButton?.show?.()}catch(_){}
  try{window.scrollTo(0,0)}catch(_){}
  return true;
}

function installInteractions(){
  if(document.documentElement.dataset.pf5==='1')return;
  document.documentElement.dataset.pf5='1';
  document.addEventListener('click',function(event){
    if(window.__PF5_NATIVE_CLICK__){window.__PF5_NATIVE_CLICK__=false;return;}
    const song=event.target.closest?.('#ai-home-song');
    if(song){
      event.preventDefault();event.stopImmediatePropagation();
      enterSongDirect();
      return;
    }
    const balance=event.target.closest?.('#ai-home-balance-button,#balance-button');
    if(balance){
      event.preventDefault();event.stopImmediatePropagation();
      openTopupDirect();
      return;
    }
    const choice=event.target.closest?.('.app .choice');
    if(choice){
      event.preventDefault();event.stopImmediatePropagation();
      window.__PF5_NATIVE_CLICK__=true;
      try{choice.click()}catch(_){window.__PF5_NATIVE_CLICK__=false}
      return;
    }
  },true);
}

function repairChoiceListeners(){
  document.querySelectorAll('.app .choice').forEach(function(button){
    if(button.dataset.pf5Bound==='1')return;
    button.dataset.pf5Bound='1';
    button.addEventListener('click',function(){
      if(button.dataset.genre){window.__PF5_GENRE__=button.dataset.genre}
      if(button.dataset.vocal){window.__PF5_VOCAL__=button.dataset.vocal}
    });
  });
}

function boot(){
  installInteractions();
  repairChoiceListeners();
  refreshAccount();
  [700,1500,3000,6000].forEach(ms=>setTimeout(refreshAccount,ms));
  setTimeout(repairChoiceListeners,1000);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();</script>`;

function inject(body){
  if(typeof body!=='string'||!body.includes('<body')||body.includes('production-fixes5-script'))return body;
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

console.log('[PRODUCTION FIXES 5] deterministic MAX account, topup and song-screen interaction loaded');
