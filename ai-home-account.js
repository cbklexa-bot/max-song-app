const express = require('express');

const originalSendFile = express.response.sendFile;

const extraCss = `
<style id="ai-home-account-style">
#ai-gifts-home .ai-home-account{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:58px;padding:9px 10px;border-radius:20px;border:1px solid rgba(255,255,255,.085);background:linear-gradient(145deg,rgba(28,22,35,.92),rgba(15,12,21,.92));box-shadow:0 13px 36px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.035)}
#ai-gifts-home .ai-home-account-profile{display:flex;align-items:center;gap:9px;min-width:0}
#ai-gifts-home .ai-home-account-avatar{width:39px;height:39px;flex:0 0 39px;border-radius:14px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#8744ff,#c15bff 55%,#ef4c9f);font-size:13px;font-weight:950;box-shadow:0 9px 24px rgba(145,72,255,.25)}
#ai-gifts-home .ai-home-account-info{min-width:0}
#ai-gifts-home .ai-home-account-label{margin:0;color:rgba(255,255,255,.34);font-size:6.5px;font-weight:850;letter-spacing:.10em;text-transform:uppercase}
#ai-gifts-home .ai-home-account-name{margin:3px 0 0;font-size:11px;line-height:1.15;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ai-gifts-home .ai-home-account-subtitle{margin:3px 0 0;color:rgba(255,255,255,.28);font-size:7px}
#ai-gifts-home .ai-home-account-balance{appearance:none;display:flex;align-items:center;gap:7px;flex:0 0 auto;min-height:39px;padding:7px 8px;border-radius:14px;background:rgba(7,4,12,.70);border:1px solid rgba(145,72,255,.24);color:#fff;cursor:pointer;transition:transform .15s ease,border-color .15s ease,background .15s ease}
#ai-gifts-home .ai-home-account-balance:active{transform:scale(.97);border-color:rgba(194,127,255,.44);background:rgba(15,8,24,.88)}
#ai-gifts-home .ai-home-account-balance-label{display:block;margin-bottom:2px;color:rgba(255,255,255,.30);font-size:6px;font-weight:850;text-align:right;text-transform:uppercase;letter-spacing:.08em}
#ai-gifts-home .ai-home-account-balance-value{display:block;color:#6fe4bd;font-size:10px;font-weight:950;line-height:1}
#ai-gifts-home .ai-home-account-plus{width:21px;height:21px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#8a46ff,#bb59ff);color:#fff;font-size:14px;font-weight:900;box-shadow:0 5px 15px rgba(145,72,255,.26)}

#ai-song-page-transition{position:fixed;inset:0;z-index:999999;display:grid;place-items:center;overflow:hidden;pointer-events:none;opacity:0;background:#07050b;transition:opacity .30s ease}
#ai-song-page-transition.active{opacity:1}
#ai-song-page-transition .transition-bg{position:absolute;inset:-20%;background:radial-gradient(circle at 50% 45%,rgba(196,112,255,.34),transparent 22%),radial-gradient(circle at 20% 80%,rgba(87,197,255,.15),transparent 25%),radial-gradient(circle at 84% 20%,rgba(239,69,165,.16),transparent 28%),linear-gradient(135deg,#08060e,#160b24 48%,#08060f);transform:scale(.92);animation:aiHomeCinemaBg 2.55s ease forwards}
#ai-song-page-transition .transition-orb{position:absolute;width:66vmax;height:66vmax;border-radius:50%;background:radial-gradient(circle at 50% 47%,rgba(255,255,255,.92) 0 2%,rgba(221,171,255,.72) 6%,rgba(170,87,255,.43) 19%,rgba(98,38,160,.12) 43%,transparent 66%);filter:blur(1px);transform:scale(.08);animation:aiHomeCinemaOrb 2.55s cubic-bezier(.18,.78,.19,1) forwards}
#ai-song-page-transition .transition-ring{position:absolute;width:40vmax;height:40vmax;border:1px solid rgba(255,255,255,.18);border-radius:50%;box-shadow:0 0 80px rgba(170,88,255,.24),inset 0 0 50px rgba(255,255,255,.05);transform:scale(.15);opacity:0;animation:aiHomeCinemaRing 2.25s .08s ease forwards}
#ai-song-page-transition .transition-content{position:relative;z-index:2;text-align:center;padding:24px;transform:translateY(16px);opacity:0;animation:aiHomeCinemaText 1.9s .26s cubic-bezier(.2,.8,.2,1) forwards}
#ai-song-page-transition .transition-kicker{margin:0 0 10px;color:rgba(255,255,255,.45);font-size:8px;font-weight:900;letter-spacing:.22em;text-transform:uppercase}
#ai-song-page-transition .transition-label{margin:0;color:#fff;font-size:clamp(31px,9vw,48px);line-height:1;letter-spacing:-.055em;font-weight:950;text-shadow:0 12px 40px rgba(0,0,0,.40)}
#ai-song-page-transition .transition-line{width:74px;height:2px;margin:15px auto 0;border-radius:999px;background:linear-gradient(90deg,transparent,#fff,transparent);opacity:.75}
#ai-song-page-transition .transition-pulse{position:absolute;width:12px;height:12px;left:50%;top:50%;margin:-6px;border-radius:50%;background:#fff;box-shadow:0 0 34px 12px rgba(214,153,255,.65);animation:aiHomeCinemaPulse 1.2s ease-in-out infinite alternate}
@keyframes aiHomeCinemaBg{0%{opacity:.35;transform:scale(.92) rotate(0deg)}45%{opacity:1;transform:scale(1.02) rotate(5deg)}100%{opacity:1;transform:scale(1.08) rotate(-3deg)}}
@keyframes aiHomeCinemaOrb{0%{opacity:0;transform:scale(.08)}18%{opacity:.95;transform:scale(.20)}62%{opacity:.82;transform:scale(.72)}100%{opacity:0;transform:scale(1.70)}}
@keyframes aiHomeCinemaRing{0%{opacity:0;transform:scale(.15)}38%{opacity:.7;transform:scale(.62)}100%{opacity:0;transform:scale(2.0)}}
@keyframes aiHomeCinemaText{0%{opacity:0;transform:translateY(16px) scale(.96)}18%{opacity:1;transform:translateY(0) scale(1)}78%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-4px) scale(1.015)}}
@keyframes aiHomeCinemaPulse{0%{transform:scale(.72);opacity:.65}100%{transform:scale(1.45);opacity:1}}
@media(prefers-reduced-motion:reduce){#ai-song-page-transition .transition-bg,#ai-song-page-transition .transition-orb,#ai-song-page-transition .transition-ring,#ai-song-page-transition .transition-content,#ai-song-page-transition .transition-pulse{animation:none}#ai-song-page-transition .transition-bg{opacity:1;transform:none}#ai-song-page-transition .transition-content{opacity:1;transform:none}}
</style>
`;

const extraScript = `
<script id="ai-home-account-script">
(function(){
  if(window.__AI_HOME_ACCOUNT_PATCH__)return;
  window.__AI_HOME_ACCOUNT_PATCH__=true;

  function textOf(selector,fallback){
    const el=document.querySelector(selector);
    const value=el?.textContent?.trim();
    return value||fallback;
  }

  function syncAccount(){
    const name=textOf('#user-name','Пользователь MAX');
    const balance=textOf('#balance-value','0 ₽');
    const nameEl=document.getElementById('ai-home-account-name');
    const balanceEl=document.getElementById('ai-home-account-balance-value');
    const avatarEl=document.getElementById('ai-home-account-avatar');
    if(nameEl)nameEl.textContent=name;
    if(balanceEl)balanceEl.textContent=balance;
    if(avatarEl)avatarEl.textContent=(name.charAt(0)||'П').toUpperCase();
  }

  function openTopup(){
    try{
      if(typeof window.openTopup==='function'){window.openTopup();return}
      document.getElementById('balance-button')?.click();
    }catch(error){console.warn('[AI HOME ACCOUNT] topup',error)}
  }

  function ensureAccount(){
    const home=document.getElementById('ai-gifts-home');
    const mount=document.getElementById('ai-home-account');
    if(!home||!mount)return false;
    if(!document.querySelector('#ai-home-account .ai-home-account-profile')){
      mount.innerHTML='<div class="ai-home-account"><div class="ai-home-account-profile"><div id="ai-home-account-avatar" class="ai-home-account-avatar">П</div><div class="ai-home-account-info"><p class="ai-home-account-label">Ваш MAX аккаунт</p><p id="ai-home-account-name" class="ai-home-account-name">Загрузка...</p><p class="ai-home-account-subtitle">Имя берётся из вашего профиля MAX</p></div></div><button id="ai-home-balance-button" class="ai-home-account-balance" type="button" aria-label="Пополнить баланс"><div><span class="ai-home-account-balance-label">Баланс</span><span id="ai-home-account-balance-value" class="ai-home-account-balance-value">0 ₽</span></div><span class="ai-home-account-plus">+</span></button></div>';
    }
    const button=document.getElementById('ai-home-balance-button');
    if(button&&!button.dataset.bound){button.dataset.bound='1';button.addEventListener('click',openTopup)}
    syncAccount();
    const sourceName=document.getElementById('user-name');
    const sourceBalance=document.getElementById('balance-value');
    if(sourceName&&!sourceName.dataset.homeAccountObserved){sourceName.dataset.homeAccountObserved='1';new MutationObserver(syncAccount).observe(sourceName,{subtree:true,childList:true,characterData:true})}
    if(sourceBalance&&!sourceBalance.dataset.homeAccountObserved){sourceBalance.dataset.homeAccountObserved='1';new MutationObserver(syncAccount).observe(sourceBalance,{subtree:true,childList:true,characterData:true})}
    return true;
  }

  function ensureTransition(){
    if(document.getElementById('ai-song-page-transition'))return;
    const overlay=document.createElement('div');
    overlay.id='ai-song-page-transition';
    overlay.innerHTML='<div class="transition-bg"></div><div class="transition-orb"></div><div class="transition-ring"></div><div class="transition-pulse"></div><div class="transition-content"><p class="transition-kicker">Персональная музыка</p><h2 class="transition-label">Песня под заказ</h2><div class="transition-line"></div></div>';
    document.body.appendChild(overlay);
  }

  function startTransition(){
    const button=document.getElementById('ai-home-song');
    if(!button||button.dataset.transitionBound==='1')return;
    button.dataset.transitionBound='1';
    button.addEventListener('click',function(event){
      event.preventDefault();
      event.stopPropagation();
      ensureTransition();
      const overlay=document.getElementById('ai-song-page-transition');
      if(!overlay)return;
      if(window.__AI_HOME_TRANSITION_BUSY__)return;
      window.__AI_HOME_TRANSITION_BUSY__=true;
      overlay.classList.remove('active');
      void overlay.offsetWidth;
      overlay.classList.add('active');
      setTimeout(function(){
        try{if(typeof window.__AI_HOME_PREPARE_SONG__==='function')window.__AI_HOME_PREPARE_SONG__();else{document.getElementById('ai-gifts-home').style.display='none';document.querySelector('.app').style.display='block';window.__AI_SONG_SCREEN__=true}}
        finally{
          setTimeout(function(){overlay.classList.remove('active');window.__AI_HOME_TRANSITION_BUSY__=false},180)
        }
      },2450);
    });
  }

  function boot(){
    ensureAccount();
    startTransition();
    setTimeout(ensureAccount,350);
    setTimeout(ensureAccount,900);
    setTimeout(startTransition,350);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
</script>
`;

function inject(body){
  if(typeof body!=='string' || !body.includes('<body'))return body;
  if(body.includes('ai-home-account-script'))return body;
  return body.replace(/<\/body>/i,extraCss+'\n'+extraScript+'\n</body>');
}

express.response.sendFile=function patchedSendFile(filePath,...args){
  const isIndex=typeof filePath==='string' && /(?:^|[\\/])index\.html$/i.test(filePath);
  if(!isIndex)return originalSendFile.call(this,filePath,...args);

  const response=this;
  const originalSend=response.send;
  response.send=function aiHomeAccountSend(body){
    try{return originalSend.call(this,inject(body))}
    catch(error){console.error('[AI HOME ACCOUNT]',error.message);return originalSend.call(this,body)}
  };

  try{return originalSendFile.call(this,filePath,...args)}
  finally{response.send=originalSend}
};

console.log('[AI HOME ACCOUNT] redesigned account/transition module loaded');
