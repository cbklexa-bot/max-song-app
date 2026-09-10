const express = require('express');

function frontendFixScript() {
  return `<script>(function(){
function getPending(){try{return localStorage.getItem('robokassa_pending_invoice')||''}catch(e){return ''}}
function setPending(id){try{localStorage.setItem('robokassa_pending_invoice',String(id))}catch(e){}}
function clearPending(){try{localStorage.removeItem('robokassa_pending_invoice')}catch(e){}}
async function checkPayment(){
  var id=getPending();
  if(!id||typeof window.apiFetch!=='function')return;
  for(var i=0;i<8;i++){
    try{
      var r=await window.apiFetch('/api/robokassa/status?invoiceId='+encodeURIComponent(id),{method:'GET'},20000);
      if(r&&r.ok&&r.status==='paid'){
        if(typeof window.loadUser==='function')await window.loadUser();
        clearPending();
        if(typeof window.showStatus==='function')window.showStatus('Баланс успешно пополнен.','success');
        return;
      }
      if(r&&r.status==='expired'){clearPending();return;}
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
    button.textContent='Перейти к оплате';
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
    if(note)note.textContent='Оплата через СБП без ввода данных карты. После подтверждения баланс обновится автоматически.';
    button.addEventListener('click',async function(){
      if(window.__robokassaDirectBusy)return;
      window.__robokassaDirectBusy=true;button.disabled=true;
      try{
        var selected=document.querySelector('.amount.selected');
        var amount=Number(selected&&selected.dataset?selected.dataset.amount:0);
        if(![200,400,800].includes(amount))throw new Error('Выберите сумму 200, 400 или 800 ₽.');
        var mail=String(email.value||'').trim();
        if(!email.checkValidity()||!mail)throw new Error('Укажите корректный e-mail для оплаты.');
        var data=await window.apiFetch('/api/robokassa/create-sbp',{method:'POST',body:JSON.stringify({amount:amount,email:mail})},20000);
        if(!data||!data.ok||!data.paymentUrl)throw new Error(data&&data.error?data.error:'Не удалось создать оплату СБП.');
        setPending(data.invoiceId);
        var webApp=window.WebApp;
        if(webApp&&typeof webApp.openLink==='function'){
          webApp.openLink(data.paymentUrl);
        }else{
          window.location.href=data.paymentUrl;
        }
      }catch(e){
        console.error('[ROBOKASSA DIRECT UI]',e);
        if(typeof window.showStatus==='function')window.showStatus(e.message||'Ошибка оплаты.','error');else alert(e.message||'Ошибка оплаты.');
      }finally{window.__robokassaDirectBusy=false;button.disabled=false}
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
