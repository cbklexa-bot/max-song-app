const express = require('express');

// Bridges the current top-up button to a direct Robokassa SBP flow.
// It is intentionally isolated from the main application files.

function frontendFixScript() {
  return `<script>(function(){
function loadRobokassaSdk(){
  if(window.Robokassa&&window.Robokassa.pay&&typeof window.Robokassa.pay.startOp==='function')return Promise.resolve();
  return new Promise(function(resolve,reject){
    var existing=document.querySelector('script[data-robokassa-sdk="1"]');
    if(existing){
      existing.addEventListener('load',resolve,{once:true});
      existing.addEventListener('error',reject,{once:true});
      return;
    }
    var script=document.createElement('script');
    script.src='https://auth.robokassa.ru/merchant/bundle/robokassa-iframe-badge.js';
    script.async=true;
    script.setAttribute('data-robokassa-sdk','1');
    script.onload=resolve;
    script.onerror=function(){reject(new Error('Не удалось загрузить модуль СБП Robokassa.'));};
    document.head.appendChild(script);
  });
}

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

    var oldEmail=document.querySelector('#robokassa-sbp-email');
    if(!oldEmail){
      oldEmail=document.createElement('input');
      oldEmail.id='robokassa-sbp-email';
      oldEmail.type='email';
      oldEmail.autocomplete='email';
      oldEmail.inputMode='email';
      oldEmail.placeholder='Ваш e-mail для оплаты';
      oldEmail.style.width='100%';
      oldEmail.style.boxSizing='border-box';
      oldEmail.style.marginBottom='10px';
      oldEmail.style.padding='12px 14px';
      oldEmail.style.borderRadius='12px';
      oldEmail.style.border='1px solid rgba(255,255,255,.18)';
      oldEmail.style.background='rgba(255,255,255,.06)';
      oldEmail.style.color='inherit';
      oldEmail.style.fontSize='16px';
      payButton.parentNode.insertBefore(oldEmail,payButton);
    }

    var description=document.querySelector('.topup-description');
    if(description)description.textContent='Выберите сумму и оплатите через СБП. Банк откроется для подтверждения оплаты.';
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

        var emailInput=document.getElementById('robokassa-sbp-email');
        var email=String(emailInput&&emailInput.value||'').trim();
        if(!email||!emailInput.checkValidity()){
          if(emailInput)emailInput.focus();
          throw new Error('Укажите корректный e-mail для оплаты.');
        }

        await loadRobokassaSdk();
        if(!window.Robokassa||!window.Robokassa.pay||typeof window.Robokassa.pay.startOp!=='function'){
          throw new Error('СБП Robokassa недоступен.');
        }

        var data=await window.apiFetch('/api/robokassa/create',{
          method:'POST',
          body:JSON.stringify({amount:amount})
        },20000);

        if(!data.ok||!data.invoiceId||!data.signature){
          throw new Error(data.error||'Не удалось создать платёж.');
        }

        window.Robokassa.pay.startOp({
          paymentMethod:'SBP',
          email:email,
          merchantLogin:'maxsongapp',
          outSum:Number(data.outSum||amount),
          invId:Number(data.invoiceId),
          signature:data.signature,
          onpaymentlink:function(url){
            try{
              var webApp=window.WebApp||null;
              if(webApp&&typeof webApp.openLink==='function')webApp.openLink(url);
              else window.location.href=url;
            }catch(error){
              console.error('[ROBOKASSA SBP LINK]',error);
              window.location.href=url;
            }
            return url;
          }
        });
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
