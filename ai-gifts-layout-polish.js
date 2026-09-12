const express = require('express');
const originalSendFile = express.response.sendFile;

const injection = `
<style id="ai-gifts-layout-polish-v2">
/* ===== MAIN HOME: full mobile viewport, account first ===== */
#ai-gifts-home{min-height:100vh!important;padding:4px 10px 18px!important}
#ai-gifts-home .wrap{max-width:560px!important;margin:0 auto!important}
#ai-gifts-home .ai-home-top,#ai-gifts-home .ai-home-hero,#ai-gifts-home .home-section-head{display:none!important}
#ai-gifts-home .ai-home-account{margin:0 0 10px!important}
#ai-gifts-home .home-types{display:grid!important;grid-template-columns:1fr!important;gap:10px!important;margin:0 0 12px!important}
#ai-gifts-home .home-card.ai-gift-v2{position:relative!important;display:block!important;width:100%!important;height:calc((100vh - 128px)/2)!important;min-height:255px!important;max-height:390px!important;padding:0!important;overflow:hidden!important;border-radius:26px!important;border:1px solid rgba(255,255,255,.14)!important;background:#0c0713!important;box-shadow:0 18px 46px rgba(0,0,0,.34)!important}
#ai-gifts-home .home-card.ai-gift-v2 .ai-gift-v2-image{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important;object-position:center!important;display:block!important}
#ai-gifts-home .home-card.ai-gift-v2 .ai-gift-v2-overlay{position:absolute!important;inset:0!important;padding:15px!important;display:flex!important;flex-direction:column!important;justify-content:space-between!important;background:linear-gradient(180deg,rgba(0,0,0,.48) 0%,rgba(0,0,0,0) 28%,rgba(0,0,0,.05) 58%,rgba(0,0,0,.72) 100%)!important}
#ai-gifts-home .ai-gift-v2-title{align-self:flex-end!important;max-width:72%!important;text-align:right!important;font-size:18px!important;line-height:1.06!important;font-weight:950!important;color:#fff!important;text-shadow:0 3px 16px rgba(0,0,0,.6)!important}
#ai-gifts-home .ai-gift-v2-cta{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:9px!important;font-size:13px!important;font-weight:950!important;color:#fff!important;text-shadow:0 3px 16px rgba(0,0,0,.6)!important}
#ai-gifts-home .ai-gift-v2-arrow{width:42px!important;height:42px!important;display:grid!important;place-items:center!important;border-radius:13px!important;background:rgba(5,2,10,.30)!important;border:1px solid rgba(255,255,255,.25)!important;backdrop-filter:blur(9px)!important;font-size:20px!important}
#ai-gifts-home .home-showcase{margin-top:0!important;padding:10px!important}
#ai-gifts-home .home-showcase:before{content:"Готовые работы"!important;display:block!important;margin:0 2px 8px!important;font-size:12px!important;font-weight:950!important;color:#fff!important}

/* ===== CHARACTER PICKER: robust replacement of any old character grid ===== */
#ai-video-flow-sheet .ai-character-v2{position:relative!important}
#ai-video-flow-sheet .ai-character-v2 select{appearance:none!important;-webkit-appearance:none!important;width:100%!important;min-height:52px!important;padding:12px 42px 12px 13px!important;border:1px solid rgba(180,123,255,.28)!important;border-radius:14px!important;background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(145,72,255,.07)),rgba(4,2,8,.55)!important;color:#fff!important;font-size:11px!important;font-weight:900!important;outline:none!important}
#ai-video-flow-sheet .ai-character-v2:after{content:"⌄"!important;position:absolute!important;right:14px!important;top:16px!important;pointer-events:none!important;color:#d1b1ff!important;font-size:17px!important;font-weight:900!important}
#ai-video-flow-sheet .ai-character-v2-desc{margin-top:7px!important;padding:9px 10px!important;border-radius:12px!important;background:rgba(145,72,255,.06)!important;border:1px solid rgba(180,123,255,.10)!important;color:rgba(255,255,255,.46)!important;font-size:8px!important;line-height:1.4!important}
@media(max-width:390px){
  #ai-gifts-home .home-card.ai-gift-v2{height:calc((100vh - 122px)/2)!important;min-height:235px!important}
  #ai-gifts-home .ai-gift-v2-title{font-size:16px!important}
  #ai-gifts-home .ai-gift-v2-cta{font-size:12px!important}
  #ai-gifts-home .ai-gift-v2-arrow{width:39px!important;height:39px!important}
}
</style>
<script id="ai-gifts-layout-polish-v2-script">
(function(){
  if(window.__AI_GIFTS_LAYOUT_POLISH_V2__)return;
  window.__AI_GIFTS_LAYOUT_POLISH_V2__=true;

  var root='/assets/video-gifts/';
  var characterOptions=[
    ['homeless','Уличный поздравитель','Нелепый, харизматичный, немного безумный персонаж на городской улице.'],
    ['artist','Весёлый артист','Яркий праздничный персонаж с энергичной подачей.'],
    ['santa','Дед Мороз','Зимнее праздничное поздравление.'],
    ['boss','Строгий начальник','Комедийное поздравление в деловом стиле.'],
    ['pirate','Пират','Шуточное поздравление в пиратском образе.'],
    ['cowboy','Ковбой','Поздравление в стиле Дикого Запада.'],
    ['rockstar','Рок-звезда','Энергичный сценический персонаж.'],
    ['rapper','Рэпер','Современное ритмичное поздравление.'],
    ['superhero','Супергерой','Эпичное героическое поздравление.'],
    ['detective','Детектив','Таинственное шуточное поздравление.'],
    ['doctor','Доктор','Комедийное поздравление от врача.'],
    ['teacher','Учитель','Поздравление в добром школьном стиле.'],
    ['chef','Шеф-повар','Весёлое поздравление от повара.'],
    ['grandpa','Весёлый дедушка','Доброе, тёплое и смешное поздравление.'],
    ['host','Телеведущий','Энергичная праздничная подача.'],
    ['custom','Другой персонаж','Персонаж и образ можно задать отдельно.']
  ];

  function imageUrl(name){return root+encodeURIComponent(name)+'.jpg'}

  function patchHome(){
    var home=document.getElementById('ai-gifts-home');
    if(!home)return;
    var wrap=home.querySelector('.wrap');
    var account=document.getElementById('ai-home-account');
    if(wrap&&account&&wrap.firstElementChild!==account)wrap.insertBefore(account,wrap.firstElementChild);

    var cards=[
      ['ai-home-song','песня в подарок.jpg','Песня в подарок','Создать песню'],
      ['ai-home-video','видео в подарок.jpg','Видео в подарок','Создать видео']
    ];
    cards.forEach(function(def){
      var card=document.getElementById(def[0]);
      if(!card||card.dataset.aiGiftV2==='1')return;
      card.dataset.aiGiftV2='1';
      card.classList.add('ai-gift-v2');
      card.innerHTML='';
      var img=document.createElement('img');
      img.className='ai-gift-v2-image';
      img.src=imageUrl(def[1].replace('.jpg',''));
      img.alt=def[2];
      card.appendChild(img);
      var overlay=document.createElement('div');
      overlay.className='ai-gift-v2-overlay';
      overlay.innerHTML='<div class="ai-gift-v2-title"></div><div class="ai-gift-v2-cta"><span></span><b class="ai-gift-v2-arrow">→</b></div>';
      overlay.querySelector('.ai-gift-v2-title').textContent=def[2];
      overlay.querySelector('.ai-gift-v2-cta span').textContent=def[3];
      card.appendChild(overlay);
    });
  }

  function patchCharacters(){
    var sheet=document.getElementById('ai-video-flow-sheet');
    if(!sheet||!sheet.classList.contains('open'))return;
    var fields=[].slice.call(sheet.querySelectorAll('.field'));
    var field=fields.find(function(el){
      var label=el.querySelector('.label');
      return label&&/выберите персонажа/i.test(label.textContent||'');
    });
    if(!field||field.dataset.aiCharacterV2==='1')return;

    var old=field.querySelector('.chars');
    if(!old)return;

    field.dataset.aiCharacterV2='1';
    var wrapper=document.createElement('div');
    wrapper.className='ai-character-v2';
    var select=document.createElement('select');
    select.id='vf-character';
    select.setAttribute('aria-label','Выберите персонажа');
    characterOptions.forEach(function(item,index){
      var option=document.createElement('option');
      option.value=item[0];
      option.textContent=item[1];
      if(index===0)option.selected=true;
      select.appendChild(option);
    });
    var desc=document.createElement('div');
    desc.className='ai-character-v2-desc';
    desc.textContent=characterOptions[0][2];
    select.addEventListener('change',function(){
      var item=characterOptions.find(function(x){return x[0]===select.value});
      desc.textContent=item?item[2]:'';
    });
    wrapper.appendChild(select);
    wrapper.appendChild(desc);
    old.replaceWith(wrapper);
  }

  function patch(){
    try{patchHome();patchCharacters();}catch(error){console.warn('[AI GIFTS LAYOUT POLISH V2]',error)}
  }

  function start(){
    patch();
    new MutationObserver(patch).observe(document.body,{subtree:true,childList:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
</script>`;

function inject(body){
  if(typeof body!=='string'||!body.includes('<body')||body.includes('ai-gifts-layout-polish-v2-script'))return body;
  var marker='</body>';
  var index=body.toLowerCase().lastIndexOf(marker);
  if(index<0)return body;
  return body.slice(0,index)+injection+'\n'+body.slice(index);
}

express.response.sendFile=function patchedSendFile(filePath,...args){
  var isIndex=typeof filePath==='string'&&/(?:^|[\\/])index\\.html$/i.test(filePath);
  if(!isIndex)return originalSendFile.call(this,filePath,...args);
  var response=this;
  var originalSend=response.send;
  response.send=function patchedHomeSend(body){
    try{body=inject(body)}catch(error){console.error('[AI GIFTS LAYOUT POLISH V2]',error.message)}
    return originalSend.call(this,body);
  };
  try{return originalSendFile.call(this,filePath,...args)}finally{response.send=originalSend}
};

console.log('[AI GIFTS LAYOUT POLISH V2] module loaded');
