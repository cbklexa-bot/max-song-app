const express = require('express');
const originalSendFile = express.response.sendFile;

const style = `<style id="ai-gifts-layout-polish-style">
/* Main screen: account first, then two dominant gift choices, then examples. */
#ai-gifts-home{padding-top:4px!important}
#ai-gifts-home .wrap{max-width:560px!important}
#ai-gifts-home .ai-home-top{display:none!important}
#ai-gifts-home .ai-home-hero{display:none!important}
#ai-gifts-home .home-section-head{display:none!important}
#ai-gifts-home .ai-home-account{margin:0 0 12px!important}
#ai-gifts-home .home-types{grid-template-columns:1fr!important;gap:12px!important;margin-bottom:14px!important}
#ai-gifts-home .home-card.ai-gift-home-card-final{
  position:relative!important;
  width:100%!important;
  height:auto!important;
  aspect-ratio:1.12!important;
  min-height:0!important;
  padding:0!important;
  border-radius:28px!important;
  overflow:hidden!important;
  transform:none;
}
#ai-gifts-home .home-card.ai-gift-home-card-final .ai-gift-full-visual{
  position:absolute!important;
  inset:0!important;
  overflow:hidden!important;
  background:#0c0713!important;
}
#ai-gifts-home .home-card.ai-gift-home-card-final .ai-gift-full-visual img{
  width:100%!important;
  height:100%!important;
  object-fit:cover!important;
  object-position:center center!important;
  transform:scale(1.015)!important;
}
#ai-gifts-home .home-card.ai-gift-home-card-final.ai-home-song-card{
  border:1px solid rgba(220,169,255,.34)!important;
  box-shadow:0 22px 58px rgba(0,0,0,.34),0 0 42px rgba(163,91,255,.16)!important;
}
#ai-gifts-home .home-card.ai-gift-home-card-final.ai-home-video-card{
  border:1px solid rgba(111,205,255,.32)!important;
  box-shadow:0 22px 58px rgba(0,0,0,.34),0 0 42px rgba(68,170,255,.14)!important;
}
#ai-gifts-home .home-card.ai-gift-home-card-final .ai-gift-home-overlay{
  inset:0!important;
  padding:16px!important;
  display:flex!important;
  flex-direction:column!important;
  justify-content:space-between!important;
  align-items:stretch!important;
  background:linear-gradient(180deg,rgba(2,1,7,.62) 0%,rgba(2,1,7,0) 22%,rgba(2,1,7,0) 54%,rgba(2,1,7,.78) 100%)!important;
}
#ai-gifts-home .ai-gift-home-copy{align-self:flex-end!important;max-width:75%!important;text-align:right!important}
#ai-gifts-home .ai-gift-home-title{font-size:19px!important;line-height:1.05!important;font-weight:950!important;letter-spacing:-.025em!important;text-shadow:0 3px 18px rgba(0,0,0,.58)!important}
#ai-gifts-home .ai-gift-home-sub{display:none!important}
#ai-gifts-home .ai-gift-home-cta{margin-top:auto!important;width:100%!important;justify-content:flex-end!important;gap:10px!important;align-items:center!important;font-size:13px!important;font-weight:950!important;text-shadow:0 3px 15px rgba(0,0,0,.58)!important}
#ai-gifts-home .ai-gift-home-cta span{font-size:13px!important;font-weight:950!important}
#ai-gifts-home .ai-gift-home-cta b{width:42px!important;height:42px!important;border-radius:14px!important;font-size:19px!important;background:rgba(8,4,16,.34)!important;border:1px solid rgba(255,255,255,.22)!important;backdrop-filter:blur(10px)!important;box-shadow:0 8px 22px rgba(0,0,0,.22)!important}
#ai-gifts-home .home-showcase{margin-top:2px!important}
#ai-gifts-home .home-showcase:before{content:"Примеры готовых работ";display:block;margin:0 2px 9px;font-size:12px;font-weight:950;color:#fff}

/* Character picker stays compact. */
#ai-video-flow-sheet .character-picker select{min-height:48px;padding-right:42px;font-size:11px;font-weight:850;background:linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.018)),rgba(4,2,8,.38);border-color:rgba(180,123,255,.20);box-shadow:0 8px 24px rgba(0,0,0,.16)}
#ai-video-flow-sheet .character-picker{position:relative}
#ai-video-flow-sheet .character-picker:after{content:"⌄";position:absolute;right:14px;bottom:14px;pointer-events:none;color:#cba9ff;font-size:16px;font-weight:900}
#ai-video-flow-sheet .character-description{margin-top:7px;padding:9px 10px;border-radius:12px;background:rgba(145,72,255,.06);border:1px solid rgba(180,123,255,.10);color:rgba(255,255,255,.44);font-size:8px;line-height:1.4}

@media(max-width:390px){
  #ai-gifts-home .home-types{gap:10px!important}
  #ai-gifts-home .home-card.ai-gift-home-card-final{aspect-ratio:1.05!important}
  #ai-gifts-home .home-card.ai-gift-home-card-final .ai-gift-home-overlay{padding:14px!important}
  #ai-gifts-home .ai-gift-home-title{font-size:17px!important}
  #ai-gifts-home .ai-gift-home-cta,#ai-gifts-home .ai-gift-home-cta span{font-size:12px!important}
  #ai-gifts-home .ai-gift-home-cta b{width:39px!important;height:39px!important;font-size:17px!important}
}
</style>`;

const script = `<script id="ai-gifts-layout-polish-script">
(function(){
  if(window.__AI_GIFTS_LAYOUT_POLISH__)return;
  window.__AI_GIFTS_LAYOUT_POLISH__=true;

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
    ['custom','Другой персонаж','Персонаж и образ можно будет задать отдельно.']
  ];

  function ensureAccountFirst(){
    var home=document.getElementById('ai-gifts-home');
    if(!home)return;
    var wrap=home.querySelector('.wrap');
    var account=document.getElementById('ai-home-account');
    if(wrap&&account&&wrap.firstElementChild!==account)wrap.insertBefore(account,wrap.firstElementChild);
  }

  function buildCharacterPicker(sheet){
    if(!sheet||sheet.dataset.aiCharacterPicker==='1')return;
    var field=[].slice.call(sheet.querySelectorAll('.field')).find(function(el){
      var label=el.querySelector('.label');
      return label&&label.textContent.trim()==='Выберите персонажа';
    });
    if(!field)return;
    var old=field.querySelector('.chars');
    if(!old)return;

    var wrapper=document.createElement('div');
    wrapper.className='character-picker';
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
    desc.className='character-description';
    desc.textContent=characterOptions[0][2];

    select.addEventListener('change',function(){
      var item=characterOptions.find(function(x){return x[0]===select.value});
      desc.textContent=item?item[2]:'';
    });

    wrapper.appendChild(select);
    wrapper.appendChild(desc);
    old.replaceWith(wrapper);
    sheet.dataset.aiCharacterPicker='1';
  }

  function patch(){
    try{
      ensureAccountFirst();
      var sheet=document.getElementById('ai-video-flow-sheet');
      if(sheet&&sheet.classList.contains('open'))buildCharacterPicker(sheet);
    }catch(error){console.warn('[AI GIFTS LAYOUT POLISH]',error)}
  }

  function injectStyle(){
    if(document.getElementById('ai-gifts-layout-polish-style'))return;
    document.head.insertAdjacentHTML('beforeend',${JSON.stringify(style)});
  }

  function start(){
    injectStyle();
    patch();
    new MutationObserver(patch).observe(document.body,{subtree:true,childList:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
</script>`;

function inject(body){
  if(typeof body!=='string'||!body.includes('<body')||body.includes('ai-gifts-layout-polish-script'))return body;
  var marker='</body>';
  var index=body.toLowerCase().lastIndexOf(marker);
  if(index<0)return body;
  return body.slice(0,index)+style+'\n'+script+'\n'+body.slice(index);
}

express.response.sendFile=function patchedSendFile(filePath,...args){
  var isIndex=typeof filePath==='string'&&/(?:^|[\\/])index\\.html$/i.test(filePath);
  if(!isIndex)return originalSendFile.call(this,filePath,...args);
  var response=this;
  var originalSend=response.send;
  response.send=function aiGiftsLayoutPolishSend(body){
    try{body=inject(body)}catch(error){console.error('[AI GIFTS LAYOUT POLISH]',error.message)}
    return originalSend.call(this,body);
  };
  try{return originalSendFile.call(this,filePath,...args)}finally{response.send=originalSend}
};

console.log('[AI GIFTS LAYOUT POLISH] module loaded');
