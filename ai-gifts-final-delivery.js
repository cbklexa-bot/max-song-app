const express = require('express');

const originalSendFile = express.response.sendFile;
const marker = 'ai-gifts-final-delivery-script';

const injection = `
<style id="ai-gifts-final-delivery-style">
#ai-gifts-home .ai-home-top,#ai-gifts-home .ai-home-hero{display:none!important}
#ai-gifts-home{min-height:100vh!important;padding:4px 10px 18px!important}
#ai-gifts-home .wrap{width:100%!important;max-width:560px!important;margin:0 auto!important}
#ai-gifts-home .ai-home-account{margin:0 0 12px!important}
#ai-gifts-home .home-types{display:grid!important;grid-template-columns:1fr 1fr!important;gap:10px!important;margin:0 0 14px!important}
#ai-gifts-home .home-types .home-card.ai-gift-delivery-final{position:relative!important;width:100%!important;height:clamp(160px,25vh,210px)!important;min-height:0!important;padding:0!important;overflow:hidden!important;border-radius:24px!important;background:#09060e!important;border:1px solid rgba(255,255,255,.16)!important;box-shadow:0 16px 44px rgba(0,0,0,.38),0 0 34px rgba(145,72,255,.14)!important;cursor:pointer!important}
#ai-gifts-home .home-types .home-card.ai-gift-delivery-final:nth-child(2){box-shadow:0 16px 44px rgba(0,0,0,.38),0 0 34px rgba(64,180,255,.14)!important}
#ai-gifts-home .ai-gift-delivery-image{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;display:block!important;object-fit:cover!important;object-position:center!important}
#ai-gifts-home .ai-gift-delivery-overlay{position:absolute!important;inset:0!important;padding:12px!important;display:flex!important;flex-direction:column!important;justify-content:space-between!important;background:linear-gradient(180deg,rgba(4,2,10,.48),rgba(4,2,10,0) 44%,rgba(4,2,10,.76))!important;pointer-events:none!important}
#ai-gifts-home .ai-gift-delivery-title{color:#fff!important;font-size:13px!important;line-height:1.05!important;font-weight:950!important;text-shadow:0 3px 16px rgba(0,0,0,.65)!important}
#ai-gifts-home .ai-gift-delivery-cta{display:flex!important;align-items:center!important;gap:7px!important;color:#fff!important;font-size:11px!important;font-weight:950!important;text-shadow:0 3px 16px rgba(0,0,0,.65)!important}
#ai-gifts-home .ai-gift-delivery-arrow{width:30px!important;height:30px!important;display:grid!important;place-items:center!important;border-radius:10px!important;background:rgba(10,5,18,.40)!important;border:1px solid rgba(255,255,255,.25)!important;backdrop-filter:blur(9px)!important}
#ai-gifts-home .home-types+.home-section-head{display:flex!important;margin:0 2px 8px!important}
#ai-gifts-home .home-types+.home-section-head .home-section-badge{display:none!important}
#ai-gifts-home .home-showcase{margin-top:0!important}
#ai-video-flow-sheet .ai-character-delivery{position:relative!important}
#ai-video-flow-sheet .ai-character-delivery select{appearance:none!important;-webkit-appearance:none!important;width:100%!important;min-height:50px!important;padding:12px 42px 12px 13px!important;border:1px solid rgba(180,123,255,.30)!important;border-radius:14px!important;background:rgba(4,2,8,.65)!important;color:#fff!important;font-size:11px!important;font-weight:900!important;outline:none!important}
#ai-video-flow-sheet .ai-character-delivery:after{content:"⌄";position:absolute;right:14px;top:15px;pointer-events:none;color:#d5bbff;font-size:17px;font-weight:900}
#ai-video-flow-sheet .ai-character-delivery-desc{margin-top:7px;padding:8px 10px;border-radius:12px;background:rgba(145,72,255,.06);border:1px solid rgba(180,123,255,.10);color:rgba(255,255,255,.46);font-size:8px;line-height:1.4}
@media(max-width:390px){#ai-gifts-home{padding-left:8px!important;padding-right:8px!important}#ai-gifts-home .home-types{gap:8px!important}#ai-gifts-home .home-types .home-card.ai-gift-delivery-final{height:clamp(145px,23vh,190px)!important}}
</style>
<script id="${marker}">
(function(){
  if(window.__AI_GIFTS_FINAL_DELIVERY__) return;
  window.__AI_GIFTS_FINAL_DELIVERY__=true;
  var root='/assets/video-gifts/';
  var chars=[
    ['Уличный поздравитель','Нелепый, харизматичный, немного безумный персонаж на городской улице.'],
    ['Весёлый артист','Яркий праздничный персонаж с энергичной подачей.'],
    ['Дед Мороз','Зимнее праздничное поздравление.'],
    ['Строгий начальник','Комедийное поздравление в деловом стиле.'],
    ['Пират','Шуточное поздравление в пиратском образе.'],
    ['Ковбой','Поздравление в стиле Дикого Запада.'],
    ['Рок-звезда','Энергичный сценический персонаж.'],
    ['Рэпер','Современное ритмичное поздравление.'],
    ['Супергерой','Эпичное героическое поздравление.'],
    ['Детектив','Таинственное шуточное поздравление.'],
    ['Доктор','Комедийное поздравление от врача.'],
    ['Учитель','Поздравление в добром школьном стиле.'],
    ['Шеф-повар','Весёлое поздравление от повара.'],
    ['Весёлый дедушка','Доброе, тёплое и смешное поздравление.'],
    ['Телеведущий','Энергичная праздничная подача.'],
    ['Другой персонаж','Персонаж и образ можно задать отдельно.']
  ];
  function patchHome(){
    var home=document.getElementById('ai-gifts-home'); if(!home) return;
    var wrap=home.querySelector('.wrap'), account=document.getElementById('ai-home-account');
    if(wrap&&account&&wrap.firstElementChild!==account) wrap.insertBefore(account,wrap.firstElementChild);
    var heads=home.querySelectorAll('.home-section-head');
    if(heads[0]) heads[0].style.display='none';
    var cards=[
      ['ai-home-song','песня в подарок.jpg','Песня в подарок','Создать песню'],
      ['ai-home-video','видео в подарок.jpg','Видео в подарок','Создать видео']
    ];
    cards.forEach(function(def){
      var card=document.getElementById(def[0]); if(!card) return;
      if(card.dataset.deliveryFinal==='1') return;
      card.dataset.deliveryFinal='1';
      card.classList.add('ai-gift-delivery-final');
      card.innerHTML='';
      var img=document.createElement('img');
      img.className='ai-gift-delivery-image';
      img.src=root+encodeURIComponent(def[1]);
      img.alt=def[2];
      card.appendChild(img);
      var overlay=document.createElement('div');
      overlay.className='ai-gift-delivery-overlay';
      var title=document.createElement('div');
      title.className='ai-gift-delivery-title';
      title.textContent=def[2];
      var cta=document.createElement('div');
      cta.className='ai-gift-delivery-cta';
      var label=document.createElement('span');
      label.textContent=def[3];
      var arrow=document.createElement('b');
      arrow.className='ai-gift-delivery-arrow';
      arrow.textContent='→';
      cta.appendChild(label); cta.appendChild(arrow);
      overlay.appendChild(title); overlay.appendChild(cta);
      card.appendChild(overlay);
    });
  }
  function patchCharacters(){
    var sheet=document.getElementById('ai-video-flow-sheet');
    if(!sheet || !sheet.classList.contains('open')) return;
    var fields=sheet.querySelectorAll('.field');
    for(var i=0;i<fields.length;i++){
      var label=fields[i].querySelector('.label');
      if(!label || !/выберите персонажа/i.test(label.textContent||'')) continue;
      var field=fields[i];
      if(field.dataset.deliveryCharacter==='1') return;
      var old=field.querySelector('.chars');
      var oldButtons=field.querySelectorAll('.char');
      if(!old && !oldButtons.length) return;
      field.dataset.deliveryCharacter='1';
      if(old) old.remove(); else oldButtons.forEach(function(b){b.remove()});
      var box=document.createElement('div'); box.className='ai-character-delivery';
      var select=document.createElement('select'); select.id='vf-character-delivery'; select.setAttribute('aria-label','Выберите персонажа');
      chars.forEach(function(item,index){var o=document.createElement('option');o.value=String(index);o.textContent=item[0];if(index===0)o.selected=true;select.appendChild(o)});
      var desc=document.createElement('div'); desc.className='ai-character-delivery-desc'; desc.textContent=chars[0][1];
      select.addEventListener('change',function(){var item=chars[Number(select.value)];desc.textContent=item?item[1]:''});
      box.appendChild(select); box.appendChild(desc); field.appendChild(box); return;
    }
  }
  function patch(){try{patchHome();patchCharacters()}catch(e){console.warn('[AI GIFTS FINAL DELIVERY]',e.message)}}
  function start(){patch();new MutationObserver(patch).observe(document.body,{subtree:true,childList:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
</script>`;

function inject(body){
  if(typeof body!=='string' || body.indexOf(marker)!==-1) return body;
  var at=body.toLowerCase().lastIndexOf('</body>');
  if(at<0) return body;
  return body.slice(0,at)+injection+'\n'+body.slice(at);
}

express.response.sendFile=function finalDeliverySendFile(filePath,...args){
  var isIndex=typeof filePath==='string' && /(?:^|[\\/])index\\.html$/i.test(filePath);
  if(!isIndex) return originalSendFile.call(this,filePath,...args);

  var res=this;
  res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma','no-cache');
  res.setHeader('Expires','0');

  var originalWrite=res.write;
  var originalEnd=res.end;
  var chunks=[];
  var restored=false;
  var restore=function(){if(restored)return;restored=true;res.write=originalWrite;res.end=originalEnd};

  res.write=function(chunk,encoding,callback){
    if(chunk) chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(String(chunk),encoding));
    if(typeof callback==='function') callback();
    return true;
  };

  res.end=function(chunk,encoding,callback){
    if(chunk) chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(String(chunk),encoding));
    var body=Buffer.concat(chunks).toString('utf8');
    var patched=inject(body);
    restore();
    return originalEnd.call(res,patched,'utf8',typeof callback==='function'?callback:undefined);
  };

  try{return originalSendFile.call(res,filePath,...args)}catch(error){restore();throw error}
};

console.log('[AI GIFTS FINAL DELIVERY] module loaded');
