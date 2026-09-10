const express = require('express');

// Production SBP UI for MAX Mini App.
// Uses Robokassa's official startOp. MAX WebView compatibility is handled by
// accepting every documented/observed return style: callback, direct value, or Promise.
function frontendFixScript() {
  return `<script>(function(){
var SDK_URL='https://auth.robokassa.ru/merchant/bundle/robokassa-iframe-badge.js';

function getPending(){try{return localStorage.getItem('robokassa_pending_invoice')||''}catch(e){return ''}}
function setPending(id){try{localStorage.setItem('robokassa_pending_invoice',String(id))}catch(e){}}
function clearPending(){try{localStorage.removeItem('robokassa_pending_invoice')}catch(e){}}

function show(msg,type){
  if(typeof window.showStatus==='function')window.showStatus(msg,type||'info');
  else console.log('[ROBOKASSA]',msg);
}

function loadSdk(){
  if(window.Robokassa&&window.Robokassa.pay&&typeof window.Robokassa.pay.startOp==='function')return Promise.resolve(window.Robokassa);
  return new Promise(function(resolve,reject){
    var existing=document.querySelector('script[data-robokassa-sbp-sdk="1"]');
    if(existing){
      var started=Date.now();
      var poll=setInterval(function(){
        if(window.Robokassa&&window.Robokassa.pay&&typeof window.Robokassa.pay.startOp==='function'){
          clearInterval(poll);resolve(window.Robokassa);
        }else if(Date.now()-started>15000){
          clearInterval(poll);reject(new Error('Не удалось загрузить модуль оплаты СБП Robokassa.'));
        }
      },100);
      return;
    }
    var script=document.createElement('script');
    script.src=SDK_URL;
    script.async=true;
    script.dataset.robokassaSbpSdk='1';
    script.onload=function(){
      if(window.Robokassa&&window.Robokassa.pay&&typeof window.Robokassa.pay.startOp==='function')resolve(window.Robokassa);
      else reject(new Error('Модуль оплаты Robokassa загрузился некорректно.'));
    };
    script.onerror=function(){reject(new Error('Не удалось загрузить модуль оплаты Robokassa.'))};
    document.head.appendChild(script);
  });
}

function normalizePaymentLink(value){
  if(typeof value==='string')return value;
  if(value&&typeof value.url==='string')return value.url;
  if(value&&typeof value.link==='string')return value.link;
  if(value&&typeof value.paymentUrl==='string')return value.paymentUrl;
  if(value&&typeof value.paymentLink==='string')return value.paymentLink;
  if(value&&value.data)return normalizePaymentLink(value.data);
  if(value&&value.detail)return normalizePaymentLink(value.detail);
  return '';
}

function openSbpLink(url){
  var value=String(url||'').trim();
  if(!value)throw new Error('Robokassa не вернула ссылку СБП.');

  var lower=value.toLowerCase();
  var isSbpDeepLink=(
    lower.indexOf('sberpay:')===0 ||
    lower.indexOf('sbolpay:')===0 ||
    lower.indexOf('intent:')===0 ||
    lower.indexOf('ios-app-smartonline:')===0 ||
    lower.indexOf('btripsexpenses:')===0 ||
    lower.indexOf('budgetonline-ios:')===0 ||
    lower.indexOf('https://qr.nspk.ru/')===0
  );

  if(isSbpDeepLink){
    // Robokassa documents these as Android/iOS bank-app navigation schemes.
    window.location.href=value;
    return;
  }

  var webApp=window.WebApp||null;
  if(webApp&&typeof webApp.openLink==='function')webApp.openLink(value);
  else window.location.href=value;
}

async function checkPayment(){
  var id=getPending();
  if(!id||typeof window.apiFetch!=='function')return;
  for(var i=0;i<8;i++){
    try{
      var r=await window.apiFetch('/api/robokassa/status?invoiceId='+encodeURIComponent(id),{method:'GET'},20000);
      if(r&&((r.status==='paid')||(r.status==='succeeded'))){
        if(typeof window.loadUser==='function')await window.loadUser();
        clearPending();
        show('Баланс успешно пополнен.','success');
        return;
      }
      if(r&&r.status==='expired'){clearPending();return;}
    }catch(e){console.warn('[ROBOKASSA STATUS]',e)}
    await new Promise(function(resolve){setTimeout(resolve,2000)});
  }
}

function startOpAndGetLink(Robokassa,options){
  return new Promise(function(resolve,reject){
    var settled=false;
    var timer=setTimeout(function(){
      if(!settled)reject(new Error('Robokassa не вернула ссылку СБП за отведённое время.'));
    },20000);

    function finish(raw){
      if(settled)return;
      var url=normalizePaymentLink(raw);
      if(!url)return;
      settled=true;
      clearTimeout(timer);
      console.log('[ROBOKASSA SBP LINK] received', url.indexOf('://')>0 ? url.split('?')[0] : '(non-url)');
      resolve(url);
    }

    var sdkOptions=Object.assign({},options,{onpaymentlink:finish});
    try{
      var returned=Robokassa.pay.startOp(sdkOptions);
      // Some WebViews do not propagate the callback but the SDK still returns
      // the generated link directly or as a Promise.
      var immediate=normalizePaymentLink(returned);
      if(immediate)finish(immediate);
      else if(returned&&typeof returned.then==='function')returned.then(finish).catch(function(error){if(!settled){clearTimeout(timer);reject(error)}});
    }catch(error){
      clearTimeout(timer);
      reject(error);
    }
  });
}

function install(){
  try{
    if(window.__robokassaDirectUiInstalled)return true;
    if(typeof window.apiFetch!=='function')return false;
    var original=document.querySelector('#test-topup,.test-topup');
    if(!original)return false;

    // Load the official SBP SDK while the app is idle, not after a click.
    loadSdk().catch(function(error){console.warn('[ROBOKASSA SBP SDK]',error.message)});

    var button=original.cloneNode(true);
    original.replaceWith(button);
    button.textContent='Оплатить через СБП';

    var email=document.getElementById('robokassa-sbp-email');
    if(!email){
      email=document.createElement('input');
      email.id='robokassa-sbp-email';
      email.type='email';
      email.autocomplete='email';
      email.inputMode='email';
      email.placeholder='E-mail для оплаты';
      email.style.cssText='width:100%;box-sizing:border-box;margin-bottom:10px;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:inherit;font-size:16px';
      button.parentNode.insertBefore(email,button);
    }

    var note=document.querySelector('.test-note');
    if(note)note.textContent='СБП без ввода данных карты. После подтверждения в банке баланс обновится автоматически.';

    button.addEventListener('click',async function(){
      if(window.__robokassaDirectBusy)return;
      window.__robokassaDirectBusy=true;
      button.disabled=true;
      try{
        var selected=document.querySelector('.amount.selected');
        var amount=Number(selected&&selected.dataset?selected.dataset.amount:0);
        if(![200,400,800].includes(amount))throw new Error('Выберите сумму 200, 400 или 800 ₽.');
        var mail=String(email.value||'').trim();
        if(!email.checkValidity()||!mail){email.focus();throw new Error('Укажите корректный e-mail для оплаты.');}

        var data=await window.apiFetch('/api/robokassa/start-sbp',{
          method:'POST',
          body:JSON.stringify({amount:amount,email:mail})
        },20000);
        if(!data||!data.ok||!data.invoiceId||!data.signature||!data.merchantLogin)throw new Error(data&&data.error?data.error:'Не удалось подготовить оплату СБП.');

        setPending(data.invoiceId);

        var Robokassa=window.Robokassa;
        if(!Robokassa||!Robokassa.pay||typeof Robokassa.pay.startOp!=='function')Robokassa=await loadSdk();

        var url=await startOpAndGetLink(Robokassa,{
          paymentMethod:'SBP',
          email:mail,
          merchantLogin:data.merchantLogin,
          outSum:Number(data.outSum),
          invId:Number(data.invoiceId),
          signature:data.signature
        });

        show('Открываем оплату через СБП…','info');
        openSbpLink(url);
      }catch(e){
        console.error('[ROBOKASSA SBP]',e);
        show(e.message||'Ошибка оплаты.','error');
      }finally{
        window.__robokassaDirectBusy=false;
        button.disabled=false;
      }
    });

    document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')setTimeout(checkPayment,500)});
    window.addEventListener('pageshow',function(){setTimeout(checkPayment,500)});
    setTimeout(checkPayment,700);

    window.__robokassaDirectUiInstalled=true;
    console.log('[ROBOKASSA DIRECT UI] installed');
    return true;
  }catch(e){console.warn('[ROBOKASSA DIRECT UI] install failed',e);return false}
}
function boot(){if(install())return;setTimeout(install,300);setTimeout(install,1000);setTimeout(install,2000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();</script>`;
}

const originalSend=express.response.send;
express.response.send=function(body){
  try{
    if(typeof body==='string'&&body.includes('test-topup')&&body.includes('</body>')&&!body.includes('[ROBOKASSA DIRECT UI] installed'))body=body.replace('</body>',frontendFixScript()+'</body>');
  }catch(e){console.error('[ROBOKASSA DIRECT UI INJECT]',e.message)}
  return originalSend.call(this,body);
};

console.log('[ROBOKASSA DIRECT UI] module loaded');
