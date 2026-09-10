const express = require('express');

// Bridges the current top-up button to a Robokassa payment page with SBP as the selected method.
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
    // Replacing the DOM node removes that old listener cleanly.
    var payButton=originalButton.cloneNode(true);
    originalButton.replaceWith(payButton);

    payButton.textContent='Оплатить через СБП';

    var emailInput=document.querySelector('#robokassa-sbp-email');
    if(!emailInput){
      emailInput=document.createElement('input');
      emailInput.id='robokassa-sbp-email';
      emailInput.type='email';
      emailInput.autocomplete='email';
      emailInput.inputMode='email';
      emailInput.placeholder='Ваш e-mail для оплаты';
      emailInput.style.width='100%';
      emailInput.style.boxSizing='border-box';
      emailInput.style.marginBottom='10px';
      emailInput.style.padding='12px 14px';
      emailInput.style.borderRadius='12px';
      emailInput.style.border='1px solid rgba(255,255,255,.18)';
      emailInput.style.background='rgba(255,255,255,.06)';
      emailInput.style.color='inherit';
      emailInput.style.fontSize='16px';
      payButton.parentNode.insertBefore(emailInput,payButton);
    }

    var description=document.querySelector('.topup-description');
    if(description)description.textContent='Выберите сумму и оплатите через СБП. Вы сможете выбрать банк для подтверждения платежа.';
    var note=document.querySelector('.test-note');
    if(note)note.textContent='СБП: без ввода номера карты.';

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

        var email=String(emailInput&&emailInput.value||'').trim();
        if(!email||!emailInput.checkValidity()){
          if(emailInput)emailInput.focus();
          throw new Error('Укажите корректный e-mail для оплаты.');
        }

        var data=await window.apiFetch('/api/robokassa/create',{
          method:'POST',
          body:JSON.stringify({amount:amount})
        },20000);

        if(!data.ok||!data.paymentUrl){
          throw new Error(data.error||'Не удалось создать платёж.');
        }

        // Use the already validated server-side signature and simply add
        // the optional email + preferred SBP method to the payment URL.
        var paymentUrl=new URL(data.paymentUrl);
        paymentUrl.searchParams.set('Email',email);
        paymentUrl.searchParams.set('IncCurrLabel','SBP');

        var finalUrl=paymentUrl.toString();
        var webApp=window.WebApp||null;
        if(webApp&&typeof webApp.openLink==='function'){
          webApp.openLink(finalUrl);
        }else{
          window.location.href=finalUrl;
        }
      }catch(error){
        console.error('[ROBOKASSA SBP UI]',error);
        if(typeof window.showStatus==='function')window.showStatus(error.message||'Ошибка оплаты.','error');
        else alert(error.message||'Ошибка оплаты.');
      }finally{
        window.__robokassaTopupBusy=false;
        payButton.disabled=false;
      }
    };

    window.processTopup=handler;
    window.processTestTopup=handler;
    payButton.addEventListener('click',handler);

    window.__robokassaUiFixInstalled=true;
    console.log('[ROBOKASSA SBP UI] installed');
    return true;
  }catch(error){
    console.warn('[ROBOKASSA SBP UI] install failed',error);
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
      !body.includes('[ROBOKASSA SBP UI] installed')
    ) {
      body = body.replace('</body>', frontendFixScript() + '</body>');
    }
  } catch (error) {
    console.error('[ROBOKASSA SBP UI INJECT]', error.message);
  }
  return originalSend.call(this, body);
};

console.log('[ROBOKASSA SBP UI] module loaded');
