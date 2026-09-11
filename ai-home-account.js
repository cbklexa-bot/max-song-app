const express = require('express');

const originalSendFile = express.response.sendFile;

const extraCss = `
<style id="ai-home-account-style">
  #ai-gifts-home .ai-home-account{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:-2px 0 12px;padding:10px;border-radius:18px;border:1px solid rgba(255,255,255,.09);background:linear-gradient(135deg,rgba(35,20,51,.94),rgba(17,10,27,.94));box-shadow:0 12px 34px rgba(0,0,0,.22)}
  #ai-gifts-home .ai-home-account-profile{display:flex;align-items:center;gap:9px;min-width:0}
  #ai-gifts-home .ai-home-account-avatar{width:38px;height:38px;flex:0 0 38px;border-radius:12px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#9148ff,#ef3d9a);font-size:14px;font-weight:900;box-shadow:0 8px 24px rgba(145,72,255,.24)}
  #ai-gifts-home .ai-home-account-info{min-width:0}
  #ai-gifts-home .ai-home-account-name{margin:0;font-size:11px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #ai-gifts-home .ai-home-account-subtitle{margin:3px 0 0;color:rgba(255,255,255,.35);font-size:7px}
  #ai-gifts-home .ai-home-account-balance{appearance:none;display:flex;align-items:center;gap:7px;flex:0 0 auto;min-height:36px;padding:6px 8px;border-radius:12px;background:rgba(8,4,14,.72);border:1px solid rgba(145,72,255,.28);color:#fff;cursor:pointer}
  #ai-gifts-home .ai-home-account-balance-value{color:#63e4bc;font-size:10px;font-weight:900}
  #ai-gifts-home .ai-home-account-plus{width:19px;height:19px;border-radius:50%;display:grid;place-items:center;background:#9148ff;color:#fff;font-size:14px;font-weight:900}
  #ai-gifts-home .ai-home-account-balance:active{transform:scale(.985)}
  #ai-gifts-home .home-card{border-width:1.5px;box-shadow:0 16px 40px rgba(0,0,0,.28),inset 0 0 0 1px rgba(255,255,255,.018)}
  #ai-gifts-home .home-card.ai-home-song-card{border-color:rgba(194,131,255,.42);background:linear-gradient(160deg,rgba(45,22,70,.96),rgba(20,12,31,.94));box-shadow:0 18px 46px rgba(0,0,0,.30),0 0 30px rgba(166,97,255,.10),inset 0 1px 0 rgba(255,255,255,.05)}
  #ai-gifts-home .home-card.ai-home-video-card{border-color:rgba(88,188,255,.36);background:linear-gradient(160deg,rgba(21,39,72,.96),rgba(14,14,30,.94));box-shadow:0 18px 46px rgba(0,0,0,.30),0 0 30px rgba(72,177,255,.09),inset 0 1px 0 rgba(255,255,255,.05)}
  #ai-gifts-home .home-card.ai-home-song-card .home-art{box-shadow:inset 0 0 0 1px rgba(209,153,255,.10),inset 0 -20px 40px rgba(143,72,255,.08)}
  #ai-gifts-home .home-card.ai-home-video-card .home-art{box-shadow:inset 0 0 0 1px rgba(105,205,255,.10),inset 0 -20px 40px rgba(60,163,255,.08)}
  #ai-gifts-home .home-card.ai-home-song-card .home-link{color:#e0c4ff}
  #ai-gifts-home .home-card.ai-home-video-card .home-link{color:#9adfff}
  #ai-gifts-home .home-card.ai-home-song-card .home-arrow{background:rgba(180,123,255,.18);border-color:rgba(203,156,255,.24)}
  #ai-gifts-home .home-card.ai-home-video-card .home-arrow{background:rgba(86,195,255,.15);border-color:rgba(108,207,255,.22)}
  #ai-gifts-home .home-footer{padding-top:13px}
  .app .legal-footer{display:none !important}
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

  function ensureHomeFooter(){
    const footer=document.querySelector('#ai-gifts-home .home-footer');
    if(!footer)return;
    footer.innerHTML='<strong>ИП Титаренко Алексей Викторович</strong><br>ИНН 384908759582 · <a href="/oferta.html" target="_blank" rel="noopener">Публичная оферта</a><br><a class="mail" href="mailto:cbklexa@gmail.com">cbklexa@gmail.com</a>';
  }

  function moveTopupModal(){
    const modal=document.getElementById('topup-modal');
    if(modal && modal.parentElement!==document.body)document.body.appendChild(modal);
    return modal;
  }

  function bindTopup(){
    const button=document.getElementById('ai-home-balance-button');
    if(!button || button.dataset.bound==='1')return;
    button.dataset.bound='1';
    button.addEventListener('click',function(){
      moveTopupModal();
      if(typeof window.openTopup==='function'){
        window.openTopup();
      }else{
        const fallback=document.getElementById('balance-button');
        fallback?.click();
      }
    });
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

  function styleCards(){
    document.querySelectorAll('#ai-gifts-home .home-card').forEach(function(card){
      if(card.querySelector('.home-song-art'))card.classList.add('ai-home-song-card');
      if(card.querySelector('.home-video-art'))card.classList.add('ai-home-video-card');
    });
  }

  function ensureHome(){
    const home=document.getElementById('ai-gifts-home');
    if(!home)return false;
    const wrap=home.querySelector('.wrap');
    if(!wrap)return false;

    if(!document.getElementById('ai-home-account')){
      const top=home.querySelector('.ai-home-top');
      const account=document.createElement('div');
      account.id='ai-home-account';
      account.className='ai-home-account';
      account.innerHTML='<div class="ai-home-account-profile"><div id="ai-home-account-avatar" class="ai-home-account-avatar">П</div><div class="ai-home-account-info"><p id="ai-home-account-name" class="ai-home-account-name">Загрузка...</p><p class="ai-home-account-subtitle">MAX аккаунт</p></div></div><button id="ai-home-balance-button" class="ai-home-account-balance" type="button"><span id="ai-home-account-balance-value" class="ai-home-account-balance-value">0 ₽</span><span class="ai-home-account-plus">+</span></button>';
      if(top && top.parentElement===wrap)top.insertAdjacentElement('afterend',account);else wrap.prepend(account);
    }

    ensureHomeFooter();
    styleCards();
    bindTopup();
    syncAccount();

    const sourceName=document.getElementById('user-name');
    const sourceBalance=document.getElementById('balance-value');
    if(sourceName && !sourceName.dataset.homeAccountObserved){
      sourceName.dataset.homeAccountObserved='1';
      new MutationObserver(syncAccount).observe(sourceName,{subtree:true,childList:true,characterData:true});
    }
    if(sourceBalance && !sourceBalance.dataset.homeAccountObserved){
      sourceBalance.dataset.homeAccountObserved='1';
      new MutationObserver(syncAccount).observe(sourceBalance,{subtree:true,childList:true,characterData:true});
    }
    return true;
  }

  function start(){
    ensureHome();
    moveTopupModal();
    const observer=new MutationObserver(function(){
      if(ensureHome())syncAccount();
      moveTopupModal();
    });
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
    setTimeout(ensureHome,250);
    setTimeout(ensureHome,900);
    setTimeout(syncAccount,1800);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
</script>
`;

function inject(body){
  if(typeof body!=='string' || !body.includes('<body'))return body;
  if(body.includes('ai-home-account-script'))return body;
  const addition=extraCss+'\n'+extraScript;
  return body.replace(/<\/body>/i,addition+'\n</body>');
}

express.response.sendFile=function patchedSendFile(filePath,...args){
  const isIndex=typeof filePath==='string' && /(?:^|[\\/])index\.html$/i.test(filePath);
  if(!isIndex)return originalSendFile.call(this,filePath,...args);

  const response=this;
  const originalSend=response.send;
  response.send=function aiHomeAccountSend(body){
    try{return originalSend.call(this,inject(body));}
    catch(error){console.error('[AI HOME ACCOUNT]',error.message);return originalSend.call(this,body)}
  };

  try{return originalSendFile.call(this,filePath,...args)}
  finally{response.send=originalSend}
};

console.log('[AI HOME ACCOUNT] module loaded');
