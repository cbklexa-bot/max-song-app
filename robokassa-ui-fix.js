const express = require('express');

// Bridges the current top-up button to the Robokassa create-payment endpoint.
// It is intentionally isolated from the main application files.

function frontendFixScript() {
  return `<script>(function(){
function installRobokassaUiFix(){
  try{
    if(window.__robokassaUiFixInstalled)return true;
    if(typeof window.apiFetch!=='function')return false;

    var originalButton=document.querySelector('#test-topup, .test-topup');
    if(!originalButton)return false;

    var selected=document.querySelector('.amount.selected');
    if(!selected)return false;

    // The page already attached processTestTopup() to the original button.
    // Replacing the DOM node removes that old listener cleanly and keeps all
    // existing classes, attributes and visual styling intact.
    var payButton=originalButton.cloneNode(true);
    originalButton.replaceWith(payButton);

    payButton.textContent='Перейти к оплате';

    var handler=async function(){
      if(window.__robokassaTopupBusy)return;
      window.__robokassaTopupBusy=true;
      payButton.disabled=true;

      try{
        var current=document.querySelector('.amount.selected');
        var amount=Number(current&&current.dataset?current.dataset.amount:0);
        if(amount!==200&&amount!==400&&amount!==800){
          throw new Error('Выберите сумму 200, 400 или 800 ₽.');
        }

        var data=await window.apiFetch('/api/robokassa/create',{
          method:'POST',
          body:JSON.stringify({amount:amount})
        },20000);

        if(!data.ok||!data.paymentUrl){
          throw new Error(data.error||'Не удалось создать платёж.');
        }

        var webApp=window.WebApp||null;
        if(webApp&&typeof webApp.openLink==='function'){
          webApp.openLink(data.paymentUrl);
        }else{
          window.location.href=data.paymentUrl;
        }
      }catch(error){
        console.error('[ROBOKASSA UI FIX]',error);
        if(typeof window.showStatus==='function')window.showStatus(error.message||'Ошибка оплаты.','error');
        else alert(error.message||'Ошибка оплаты.');
      }finally{
        window.__robokassaTopupBusy=false;
        payButton.disabled=false;
      }
    };

    // Support either function name used by the current/legacy markup.
    window.processTopup=handler;
    window.processTestTopup=handler;
    payButton.addEventListener('click',handler);

    var description=document.querySelector('.topup-description');
    if(description)description.textContent='Выберите сумму пополнения. Бонус начисляется автоматически после успешной оплаты.';
    var note=document.querySelector('.test-note');
    if(note)note.textContent='После оплаты баланс пополнится автоматически.';

    window.__robokassaUiFixInstalled=true;
    console.log('[ROBOKASSA UI FIX] installed');
    return true;
  }catch(error){
    console.warn('[ROBOKASSA UI FIX] install failed',error);
    return false;
  }
}

function boot(){
  if(installRobokassaUiFix())return;
  setTimeout(installRobokassaUiFix,300);
  setTimeout(installRobokassaUiFix,1000);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();</script>`;
}

const originalSend = express.response.send;
express.response.send = function(body) {
  try {
    if (
      typeof body === 'string' &&
      body.includes('test-topup') &&
      body.includes('</body>') &&
      !body.includes('[ROBOKASSA UI FIX] installed')
    ) {
      body = body.replace('</body>', frontendFixScript() + '</body>');
    }
  } catch (error) {
    console.error('[ROBOKASSA UI FIX INJECT]', error.message);
  }
  return originalSend.call(this, body);
};

console.log('[ROBOKASSA UI FIX] module loaded');
