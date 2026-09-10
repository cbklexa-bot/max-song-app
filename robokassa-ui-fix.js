const express = require('express');

// Production Robokassa UI adapter.
// Uses Robokassa's documented SBP startOp flow and refreshes the MAX balance
// after the user returns from the external payment/bank app.

function frontendFixScript() {
  return `<script>(function(){
function loadRobokassaSdk(){
  return new Promise(function(resolve,reject){
    if(window.Robokassa&&window.Robokassa.pay&&typeof window.Robokassa.pay.startOp==='function')return resolve(window.Robokassa);
    var existing=document.querySelector('script[data-robokassa-sdk="1"]');
    if(existing){
      var started=Date.now();
      var timer=setInterval(function(){
        if(window.Robokassa&&window.Robokassa.pay&&typeof window.Robokassa.pay.startOp==='function'){
          clearInterval(timer);resolve(window.Robokassa);
        }else if(Date.now()-started>12000){
          clearInterval(timer);reject(new Error('Не удалось загрузить платёжный модуль Robokassa.'));
        }
      },100);
      return;
    }
    var script=document.createElement('script');
    script.src='https://auth.robokassa.ru/merchant/bundle/robokassa-iframe-badge.js';
    script.async=true;
    script.dataset.robokassaSdk='1';
    script.onload=function(){
      if(window.Robokassa&&window.Robokassa.pay&&typeof window.Robokassa.pay.startOp==='function')resolve(window.Robokassa);
      else reject(new Error('Платёжный модуль Robokassa загрузился некорректно.'));
    };
    script.onerror=function(){reject(new Error('Не удалось загрузить платёжный модуль Robokassa.'))};
    document.head.appendChild(script);
  });
}

function getInitData(){
  var webApp=window.WebApp||null;
  if(webApp&&typeof webApp.initData==='string'&&webApp.initData)return webApp.initData;
  var match=location.search.match(/[?&]initData=([^&]+)/);
  return match?decodeURIComponent(match[1]):'';
}

async function verifyPayment(invoiceId, attempts){
  if(!invoiceId||typeof window.apiFetch!=='function')return null;
  for(var i=0;i<attempts;i++){
    try{
      var result=await window.apiFetch('/api/robokassa/status?invoiceId='+encodeURIComponent(invoiceId),{method:'GET'},20000);
      if(result&&result.ok&&result.status==='paid'){
        if(typeof window.loadUser==='function')await window.loadUser();
        if(typeof window.showStatus==='function')window.showStatus('Баланс успешно пополнен.','success');
        try{localStorage.removeItem('robokassa_pending_invoice');}catch(_e){}
        return result;
      }
      if(result&&result.status==='expired')return result;
    }catch(error){
      console.warn('[ROBOKASSA STATUS]',error);
    }
    await new Promise(function(resolve){setTimeout(resolve,2000);});
  }
  return null;
}

function installRobokassaUiFix(){
  try{
    if(window.__robokassaUiFixInstalled)return true;
    if(typeof window.apiFetch!=='function')return false;

    var originalButton=document.querySelector('#test-topup, .test-topup');
    if(!originalButton)return false;
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
      emailInput.placeholder='E-mail для оплаты';
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
    if(description)description.textContent='Оплата через СБП — без ввода данных банковской карты.';
    var note=document.querySelector('.test-note');
    if(note)note.textContent='После подтверждения в приложении банка баланс обновится автоматически.';

    payButton.addEventListener('click',async function(){
      if(window.__robokassaTopupBusy)return;
      window.__robokassaTopupBusy=true;
      payButton.disabled=true;
      try{
        var current=document.querySelector('.amount.selected');
        var amount=Number(current&&current.dataset?current.dataset.amount:0);
        if(amount!==200&&amount!==400&&amount!==800)throw new Error('Выберите сумму 200, 400 или 800 ₽.');

        var email=String(emailInput&&emailInput.value||'').trim();
        if(!email||!emailInput.checkValidity()){
          if(emailInput)emailInput.focus();
          throw new Error('Укажите корректный e-mail для оплаты.');
        }

        var data=await window.apiFetch('/api/robokassa/create',{
          method:'POST',
          body:JSON.stringify({amount:amount})
        },20000);
        if(!data.ok||!data.paymentUrl)throw new Error(data.error||'Не удалось создать платёж.');

        var Robokassa=await loadRobokassaSdk();
        var paymentLink=null;
        var linkPromise=new Promise(function(resolve,reject){
          var timer=setTimeout(function(){reject(new Error('Robokassa не вернула ссылку на оплату.'));},15000);
          try{
            Robokassa.pay.startOp({
              paymentMethod:'SBP',
              email:email,
              merchantLogin:data.merchantLogin||'maxsongapp',
              outSum:Number(data.outSum||amount),
              invId:Number(data.invoiceId),
              signature:data.signature,
              onpaymentlink:function(url){clearTimeout(timer);paymentLink=url;resolve(url);return url;}
            });
          }catch(error){clearTimeout(timer);reject(error);}
        });

        var url=await linkPromise;
        if(!url)throw new Error('Не удалось получить SBP-ссылку.');
        try{localStorage.setItem('robokassa_pending_invoice',String(data.invoiceId));}catch(_e){}

        var webApp=window.WebApp||null;
        if(webApp&&typeof webApp.openLink==='function')webApp.openLink(url);
        else window.location.href=url;

        if(typeof window.showStatus==='function')window.showStatus('Откройте приложение банка и подтвердите платёж через СБП.','info');
      }catch(error){
        console.error('[ROBOKASSA SBP UI]',error);
        if(typeof window.showStatus==='function')window.showStatus(error.message||'Ошибка оплаты.','error');
        else alert(error.message||'Ошибка оплаты.');
      }finally{
        window.__robokassaTopupBusy=false;
        payButton.disabled=false;
      }
    });

    function resumePendingPayment(){
      var invoiceId=null;
      try{invoiceId=localStorage.getItem('robokassa_pending_invoice');}catch(_e){}
      if(!invoiceId)return;
      verifyPayment(invoiceId,5).catch(function(){});
    }

    document.addEventListener('visibilitychange',function(){
      if(document.visibilityState==='visible')setTimeout(resumePendingPayment,500);
    });

    window.addEventListener('pageshow',function(){setTimeout(resumePendingPayment,500);});

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
  setTimeout(installRobokassaUiFix,2000);
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
