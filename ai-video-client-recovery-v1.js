const express = require('express');

// Client-side safety net for an existing video generation request.
// If the POST response is HTML/non-JSON after the order has already been created,
// recover the latest processing order instead of showing "Unexpected token".

const originalSend = express.response.send;

const script = `<script id="ai-video-client-recovery-v1">
(function(){
  if(window.__AI_VIDEO_CLIENT_RECOVERY_V1__)return;
  window.__AI_VIDEO_CLIENT_RECOVERY_V1__=true;

  function initData(){try{return window.WebApp&&window.WebApp.initData||window.MAX_WEB_APP&&window.MAX_WEB_APP.initData||''}catch(e){return ''}}
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

  function renameVideoLabels(){
    try{
      document.querySelectorAll('#ai-video-gift-page *').forEach(function(el){
        if(el.children&&el.children.length)return;
        var t=el.textContent||'';
        var n=t.replace(/Поздравление от персонажа/g,'Поздравления от персонажа')
               .replace(/Поздравление персонажа/g,'Поздравления от персонажа')
               .replace(/Поздравления персонажа/g,'Поздравления от персонажа');
        if(n!==t)el.textContent=n;
      });
    }catch(e){}
  }

  function ensureVideoHistory(){
    var page=document.getElementById('ai-video-gift-page');
    if(!page)return null;
    var existing=document.getElementById('ai-video-history-client-v1');
    if(existing)return existing;

    var section=document.createElement('section');
    section.id='ai-video-history-client-v1';
    section.style.cssText='margin:14px 0;padding:14px;border-radius:20px;border:1px solid rgba(255,255,255,.09);background:rgba(17,13,27,.78);box-shadow:0 18px 48px rgba(0,0,0,.22)';
    section.innerHTML='<h3 style="margin:0 0 11px;font-size:13px;font-weight:950">🎬 Мои видео</h3><div data-video-history-list style="color:rgba(255,255,255,.34);font-size:9px;text-align:center;padding:12px 8px">Здесь появятся созданные видео.</div>';

    var anchor=page.querySelector('.how')||page.querySelector('.wrap');
    if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(section,anchor.nextSibling);
    else page.appendChild(section);
    return section;
  }

  function videoTitle(order){
    return order&&order.type==='character'?'Поздравления от персонажа':'Видео в подарок';
  }

  function renderVideoHistory(orders){
    var section=ensureVideoHistory();
    if(!section)return;
    var list=section.querySelector('[data-video-history-list]');
    if(!list)return;

    if(!Array.isArray(orders)||!orders.length){
      list.textContent='Здесь появятся созданные видео.';
      return;
    }

    list.innerHTML=orders.map(function(order){
      var item=document.createElement('div');
      item.style.cssText='padding:11px;margin-top:8px;border-radius:15px;border:1px solid rgba(255,255,255,.06);background:rgba(5,3,10,.50);text-align:left';

      var head=document.createElement('div');
      head.style.cssText='display:flex;justify-content:space-between;gap:10px;align-items:flex-start';
      var title=document.createElement('div');
      title.style.cssText='font-size:10px;font-weight:900;color:#f2ebf7';
      title.textContent=videoTitle(order);
      var state=document.createElement('div');
      state.style.cssText='font-size:8px;font-weight:900;color:'+(order.status==='completed'?'#7be7c4':order.status==='failed'?'#ffb4bc':'#d9bdff');
      state.textContent=order.status==='completed'?'Готово':order.status==='failed'?'Ошибка':'Готовится';
      head.appendChild(title);head.appendChild(state);item.appendChild(head);

      if(order.status==='completed'&&order.video_url){
        var ok=document.createElement('div');
        ok.style.cssText='margin-top:8px;color:#7be7c4;font-size:8px;font-weight:900';
        ok.textContent='✅ Видео готово — можно смотреть';
        item.appendChild(ok);

        var video=document.createElement('video');
        video.controls=true;video.playsInline=true;video.preload='metadata';
        video.style.cssText='display:block;width:100%;max-height:420px;margin-top:9px;border-radius:13px;background:#000';
        video.src=order.video_url;
        item.appendChild(video);

        var link=document.createElement('a');
        link.href=order.video_url;link.target='_blank';link.rel='noopener';link.textContent='Открыть / скачать видео';
        link.style.cssText='display:inline-flex;margin-top:9px;padding:8px 11px;border-radius:10px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.08);color:#fff;text-decoration:none;font-size:8px;font-weight:900';
        item.appendChild(link);
      }else if(order.status==='failed'){
        var error=document.createElement('div');
        error.style.cssText='margin-top:8px;color:rgba(255,255,255,.42);font-size:8px;line-height:1.45';
        error.textContent=order.error||'Генерация завершилась ошибкой.';
        item.appendChild(error);
      }else{
        var waiting=document.createElement('div');
        waiting.style.cssText='margin-top:8px;color:rgba(255,255,255,.38);font-size:8px;line-height:1.45';
        waiting.textContent='Видео ещё готовится. Раздел автоматически проверяется снова.';
        item.appendChild(waiting);
      }

      list.appendChild(item);
      return '';
    }).join('');
  }

  async function loadVideoHistory(){
    var page=document.getElementById('ai-video-gift-page');
    if(!page)return;
    try{
      ensureVideoHistory();
      var response=await window.__aiVideoRecoveryNativeFetch('/api/video/orders',{headers:{'X-MAX-Init-Data':initData()}});
      var text=await response.text();
      var data;try{data=JSON.parse(text)}catch(e){return}
      if(!data||!data.ok||!Array.isArray(data.orders))return;
      renderVideoHistory(data.orders);
    }catch(error){
      console.warn('[AI VIDEO HISTORY CLIENT V1]',error.message);
    }
  }

  function startVideoHistory(){
    renameVideoLabels();
    ensureVideoHistory();
    loadVideoHistory();
    setInterval(loadVideoHistory,5000);
    setInterval(renameVideoLabels,1200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startVideoHistory,{once:true});
  else startVideoHistory();

  console.log('[AI VIDEO CLIENT RECOVERY V1] history UI enabled');
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
