const express = require('express');

// Fixes the payment button adapter for the current index.html markup.
// The original Robokassa module looks for old test-topup selectors.
// This small adapter uses the current processTopup() button instead.

function frontendFixScript() {
  return `<script>(function(){
function installRobokassaUiFix(){
  try{
    if(window.__robokassaUiFixInstalled)return true;
    if(typeof window.apiFetch!=='function')return false;
    if(typeof window.processTopup!=='function')return false;

    var payButton=document.querySelector('button[onclick="processTopup()"]');
    if(!payButton)return false;

    payButton.textContent='Перейти к оплате';

    window.processTopup=async function(){
      if(window.__robokassaTopupBusy)return;
      window.__robokassaTopupBusy=true;
      payButton.disabled=true;

      try{
        var creditedText=document.getElementById('modal-credited-calc')?.textContent||'200';
        var credited=Number(String(creditedText).replace(/[^0-9.]/g,''));
        var amount=200;
        if(credited===440)amount=400;
        else if(credited===960)amount=800;

        var data=await window.apiFetch('/api/robokassa/create',{
          method:'POST',
          body:JSON.stringify({amount:amount})
        });

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
        alert(error.message||'Ошибка оплаты.');
      }finally{
        window.__robokassaTopupBusy=false;
        payButton.disabled=false;
      }
    };

    window.__robokassaUiFixInstalled=true;
    console.log('[ROBOKASSA UI FIX] installed');
    return true;
  }catch(error){
    console.warn('[ROBOKASSA UI FIX] install failed',error);
    return false;
  }
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',function(){
    if(!installRobokassaUiFix())setTimeout(installRobokassaUiFix,500);
  });
}else{
  if(!installRobokassaUiFix())setTimeout(installRobokassaUiFix,500);
}
})();</script>`;
}

const originalSend = express.response.send;
express.response.send = function(body) {
  try {
    if (
      typeof body === 'string' &&
      body.includes('onclick="processTopup()"') &&
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
