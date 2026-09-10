const express = require('express');

// Production SBP UI for MAX Mini App.
// MAX WebView only creates the payment and opens our one-time launch page.
// The launch page itself runs Robokassa's official SBP SDK in a normal browser.
function frontendFixScript() {
  return `<script>(function(){
function getPending(){try{return localStorage.getItem('robokassa_pending_invoice')||''}catch(e){return ''}}
function setPending(id){try{localStorage.setItem('robokassa_pending_invoice',String(id))}catch(e){}}
function clearPending(){try{localStorage.removeItem('robokassa_pending_invoice')}catch(e){}}

function show(msg,type){
  if(typeof window.showStatus==='function')window.showStatus(msg,type||'info');
  else console.log('[ROBOKASSA]',msg);
}

function openPaymentLink(url){
  var value=String(url||'').trim();
  if(!value)throw new Error('Не удалось получить ссылку для оплаты.');
  var webApp=window.WebApp||null;
  if(webApp&&typeof webApp.openLink==='function'){
    webApp.openLink(value);
    return;
  }
  window.location.href=value;
}

async function checkPayment(){
  var id=getPending();
  if(!id||typeof window.apiFetch!=='function')return;
  for(var i=0;i<10;i++){
    try{
      var r=await window.apiFetch('/api/robokassa/status?invoiceId='+encodeURIComponent(id),{method:'GET'},20000);
      if(r&&((r.status==='paid')||(r.status==='succeeded'))){
        if(typeof window.loadUser==='function')await window.loadUser();
        clearPending();
        show('Баланс успешно пополнен.','success');
        return;
      }
      if(r&&r.status==='canceled'){clearPending();return;}
    }catch(e){console.warn('[ROBOKASSA STATUS]',e)}
    await new Promise(function(resolve){setTimeout(resolve,2000)});
  }
}

function install(){
  try{
    if(window.__robokassaDirectUiInstalled)return true;
    if(typeof window.apiFetch!=='function')return false;
    var original=document.querySelector('#test-topup,.test-topup');
    if(!original)return false;

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
    if(note)note.textContent='СБП без ввода данных карты. Откроется переход к банковскому приложению.';

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
        if(!data||!data.ok||!data.invoiceId||!data.launchUrl)throw new Error(data&&data.error?data.error:'Не удалось подготовить оплату СБП.');

        setPending(data.invoiceId);
        show('Переходим к оплате через СБП…','info');
        openPaymentLink(data.launchUrl);
      }catch(e){
        console.error('[ROBOKASSA SBP]',e);
        show(e.message||'Ошибка оплаты.','error');
      }finally{
        window.__robokassaDirectBusy=false;
        button.disabled=false;
      }
    });

    document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')setTimeout(checkPayment,700)});
    window.addEventListener('pageshow',function(){setTimeout(checkPayment,700)});
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
