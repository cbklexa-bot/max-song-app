const express = require('express');

// Client-side safety net for an existing video generation request.
// If the POST response is HTML/non-JSON after the order has already been created,
// recover the latest processing order instead of showing "Unexpected token".

const originalSend = express.response.send;

const script = `<script id="ai-video-client-recovery-v1">
(function(){
  if(window.__AI_VIDEO_CLIENT_RECOVERY_V1__)return;
  window.__AI_VIDEO_CLIENT_RECOVERY_V1__=true;

  function initData(){try{return window.WebApp&&window.WebApp.initData||''}catch(e){return ''}}
  function isGenerate(input,init){
    try{
      var url=typeof input==='string'?input:(input&&input.url)||'';
      return /\\/api\\/video\\/generate(?:$|\\?)/.test(url) && String((init&&init.method)||'GET').toUpperCase()==='POST';
    }catch(e){return false}
  }
  async function recoverOrder(){
    try{
      var h={'X-MAX-Init-Data':initData()};
      var r=await window.__aiVideoRecoveryNativeFetch('/api/video/orders',{headers:h});
      var text=await r.text();
      var data;try{data=JSON.parse(text)}catch(e){return null}
      if(!data||!Array.isArray(data.orders))return null;
      return data.orders.find(function(o){return o&&String(o.status)==='processing'})||null;
    }catch(e){return null}
  }

  window.__aiVideoRecoveryNativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    var response=await window.__aiVideoRecoveryNativeFetch(input,init);
    if(!isGenerate(input,init))return response;

    try{
      var clone=response.clone();
      var text=await clone.text();
      try{JSON.parse(text);return response}catch(jsonError){}

      var order=await recoverOrder();
      if(order){
        return new Response(JSON.stringify({
          ok:true,
          recovered:true,
          order:order,
          task_id:order.task_id||null,
          provider:'Wan 2.6',
          duration:15
        }),{status:200,headers:{'Content-Type':'application/json'}});
      }
    }catch(e){
      console.warn('[AI VIDEO CLIENT RECOVERY V1]',e.message);
    }
    return response;
  };

  console.log('[AI VIDEO CLIENT RECOVERY V1] loaded');
})();
</script>`;

express.response.send = function patchedSend(body){
  try{
    if(typeof body==='string'&&body.includes('<body')&&!body.includes('ai-video-client-recovery-v1')){
      body=body.replace('</body>',script+'\n</body>');
    }
  }catch(error){console.error('[AI VIDEO CLIENT RECOVERY V1 INJECT]',error.message)}
  return originalSend.call(this,body);
};

console.log('[AI VIDEO CLIENT RECOVERY V1] module loaded');
