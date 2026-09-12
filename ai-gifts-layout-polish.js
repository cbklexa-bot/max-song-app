const express = require('express');
const originalSendFile = express.response.sendFile;

const injection = `
<style id="ai-gifts-layout-final-style">
#ai-gifts-home{min-height:100vh!important;padding:4px 10px 18px!important}
#ai-gifts-home .wrap{width:100%!important;max-width:560px!important;margin:0 auto!important}
#ai-gifts-home .ai-home-top,#ai-gifts-home .ai-home-hero{display:none!important}
#ai-gifts-home .ai-home-account{margin:0 0 12px!important}
#ai-gifts-home .home-types{display:grid!important;grid-template-columns:1fr 1fr!important;gap:10px!important;margin:0 0 15px!important}
#ai-gifts-home .home-section-head{display:flex!important}
#ai-gifts-home .home-types+.home-section-head{margin:0 2px 8px!important}
#ai-gifts-home .home-types+.home-section-head .home-section-badge{display:none!important}
#ai-gifts-home .home-types+.home-section-head .home-section-subtitle{display:block!important}
#ai-gifts-home .home-types .home-card.ai-gift-home-final{position:relative!important;display:block!important;width:100%!important;height:clamp(150px,24vh,205px)!important;min-height:0!important;padding:0!important;overflow:hidden!important;border-radius:24px!important;background:#0b0711!important;cursor:pointer!important;border:1px solid rgba(255,255,255,.14)!important;box-shadow:0 18px 48px rgba(0,0,0,.34),0 0 36px rgba(145,72,255,.11)!important}
#ai-gifts-home .home-types .home-card.ai-gift-home-final:nth-child(2){box-shadow:0 18px 48px rgba(0,0,0,.34),0 0 36px rgba(64,180,255,.12)!important}
#ai-gifts-home .home-card.ai-gift-home-final:after{content:"";position:absolute;inset:0;border-radius:24px;pointer-events:none;border:1px solid rgba(255,255,255,.04);box-shadow:inset 0 1px 0 rgba(255,255,255,.10)}
#ai-gifts-home .ai-gift-final-image{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important;object-position:center!important;display:block!important}
#ai-gifts-home .ai-gift-final-overlay{position:absolute!important;inset:0!important;padding:12px!important;display:flex!important;flex-direction:column!important;justify-content:space-between!important;background:linear-gradient(180deg,rgba(4,2,10,.48) 0%,rgba(4,2,10,0) 42%,rgba(4,2,10,.70) 100%)!important}
#ai-gifts-home .ai-gift-final-title{align-self:flex-start!important;max-width:88%!important;color:#fff!important;font-size:13px!important;line-height:1.05!important;font-weight:950!important;letter-spacing:-.02em!important;text-shadow:0 3px 16px rgba(0,0,0,.60)!important}
#ai-gifts-home .ai-gift-final-cta{align-self:flex-start!important;display:flex!important;align-items:center!important;gap:7px!important;color:#fff!important;font-size:11px!important;line-height:1!important;font-weight:950!important;text-shadow:0 3px 16px rgba(0,0,0,.58)!important}
#ai-gifts-home .ai-gift-final-arrow{width:30px!important;height:30px!important;display:grid!important;place-items:center!important;border-radius:10px!important;background:rgba(10,5,18,.34)!important;border:1px solid rgba(255,255,255,.23)!important;backdrop-filter:blur(9px)!important;font-size:14px!important;font-weight:950!important}
#ai-gifts-home .home-showcase{margin-top:0!important;margin-bottom:10px!important;padding:11px!important;border-radius:20px!important}
#ai-gifts-home .home-showcase:before{content:none!important}
#ai-gifts-home .home-section-head+.home-showcase{margin-top:0!important}
#ai-gifts-home .home-footer{padding-top:12px!important}
@media(max-width:390px){
  #ai-gifts-home{padding-left:8px!important;padding-right:8px!important}
  #ai-gifts-home .home-types{gap:8px!important}
  #ai-gifts-home .home-types .home-card.ai-gift-home-final{height:clamp(145px,22vh,185px)!important}
  #ai-gifts-home .ai-gift-final-title{font-size:12px!important}
  #ai-gifts-home .ai-gift-final-cta{font-size:10px!important}
  #ai-gifts-home .ai-gift-final-arrow{width:28px!important;height:28px!important;font-size:13px!important}
}

#ai-video-flow-sheet .ai-character-final{position:relative!important}
#ai-video-flow-sheet .ai-character-final select{appearance:none!important;-webkit-appearance:none!important;width:100%!important;min-height:50px!important;padding:12px 42px 12px 13px!important;border:1px solid rgba(180,123,255,.30)!important;border-radius:14px!important;background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(145,72,255,.08)),rgba(4,2,8,.55)!important;color:#fff!important;font-size:11px!important;font-weight:900!important;outline:none!important}
#ai-video-flow-sheet .ai-character-final:after{content:"⌄";position:absolute;right:14px;top:15px;pointer-events:none;color:#d5bbff;font-size:17px;font-weight:900}
#ai-video-flow-sheet .ai-character-final-desc{margin-top:7px;padding:8px 10px;border-radius:12px;background:rgba(145,72,255,.06);border:1px solid rgba(180,123,255,.10);color:rgba(255,255,255,.46);font-size:8px;line-height:1.4}
</style>
<script id="ai-gifts-layout-final-script">
(function(){
  if(window.__AI_GIFTS_LAYOUT_FINAL__)return;
  window.__AI_GIFTS_LAYOUT_FINAL__=true;

  var root='/assets/video-gifts/';
  var characters=[
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

  function patchHome(){
    var home=document.getElementById('ai-gifts-home');
    if(!home)return;
    var wrap=home.querySelector('.wrap');
    var account=document.getElementById('ai-home-account');
    if(wrap&&account&&wrap.firstElementChild!==account)wrap.insertBefore(account,wrap.firstElementChild);

    var heads=[].slice.call(home.querySelectorAll('.home-section-head'));
    if(heads[0])heads[0].style.display='none';
    if(heads[1])heads[1].style.display='flex';

    [
      ['ai-home-song','песня в подарок.jpg','Песня в подарок','Создать песню'],
      ['ai-home-video','видео в подарок.jpg','Видео в подарок','Создать видео']
    ].forEach(function(def){
      var card=document.getElementById(def[0]);
      if(!card)return;
      if(card.dataset.aiGiftFinal==='1')return;
      card.dataset.aiGiftFinal='1';
      card.classList.add('ai-gift-home-final');
      card.innerHTML='';
      var img=document.createElement('img');
      img.className='ai-gift-final-image';
      img.src=root+encodeURIComponent(def[1].replace('.jpg',''))+'.jpg';
      img.alt=def[2];
      card.appendChild(img);
      var overlay=document.createElement('div');
      overlay.className='ai-gift-final-overlay';
      overlay.innerHTML='<div class="ai-gift-final-title"></div><div class="ai-gift-final-cta"><span></span><b class="ai-gift-final-arrow">→</b></div>';
      overlay.querySelector('.ai-gift-final-title').textContent=def[2];
      overlay.querySelector('.ai-gift-final-cta span').textContent=def[3];
      card.appendChild(overlay);
    });
  }

  function patchCharacters(){
    var sheet=document.getElementById('ai-video-flow-sheet');
    if(!sheet||!sheet.classList.contains('open'))return;
    var field=[].slice.call(sheet.querySelectorAll('.field')).find(function(el){
      var label=el.querySelector('.label');
      return label&&/выберите персонажа/i.test(label.textContent||'');
    });
    if(!field||field.dataset.aiCharacterFinal==='1')return;

    var old=field.querySelector('.chars');
    var charButtons=field.querySelectorAll('.char');
    if(!old&&!charButtons.length)return;

    field.dataset.aiCharacterFinal='1';
    if(old)old.remove();
    else charButtons.forEach(function(b){b.remove()});

    var wrapper=document.createElement('div');
    wrapper.className='ai-character-final';
    var select=document.createElement('select');
    select.id='vf-character';
    select.setAttribute('aria-label','Выберите персонажа');
    characters.forEach(function(item,index){
      var option=document.createElement('option');
      option.value=item[0];
      option.textContent=item[1];
      if(index===0)option.selected=true;
      select.appendChild(option);
    });
    var desc=document.createElement('div');
    desc.className='ai-character-final-desc';
    desc.textContent=characters[0][2];
    select.addEventListener('change',function(){
      var item=characters.find(function(x){return x[0]===select.value});
      desc.textContent=item?item[2]:'';
    });
    wrapper.appendChild(select);
    wrapper.appendChild(desc);
    field.appendChild(wrapper);
  }

  function patch(){
    try{patchHome();patchCharacters();}catch(error){console.warn('[AI GIFTS FINAL LAYOUT]',error)}
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
  if(typeof body!=='string'||!body.includes('<body')||body.includes('ai-gifts-layout-final-script'))return body;
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
    try{body=inject(body)}catch(error){console.error('[AI GIFTS FINAL LAYOUT]',error.message)}
    return originalSend.call(this,body);
  };
  try{return originalSendFile.call(this,filePath,...args)}finally{response.send=originalSend}
};

console.log('[AI GIFTS FINAL LAYOUT] module loaded');
