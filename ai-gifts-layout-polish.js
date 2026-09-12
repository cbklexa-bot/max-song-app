const express = require('express');
const originalSendFile = express.response.sendFile;

const style = `<style id="ai-gifts-layout-polish-style">
/* Use the available lower viewport space to make the two main gift cards more prominent. */
.ai-gift-home-card-final{aspect-ratio:.68!important}
@media(max-width:390px){.ai-gift-home-card-final{aspect-ratio:.63!important}}
.ai-gifts-home .home-types{align-items:stretch}
.ai-gifts-home .home-card{height:100%}

/* Compact character picker: one dropdown instead of a large character grid. */
#ai-video-flow-sheet .character-picker select{min-height:48px;padding-right:42px;font-size:11px;font-weight:850;background:linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.018)),rgba(4,2,8,.38);border-color:rgba(180,123,255,.20);box-shadow:0 8px 24px rgba(0,0,0,.16)}
#ai-video-flow-sheet .character-picker{position:relative}
#ai-video-flow-sheet .character-picker:after{content:"⌄";position:absolute;right:14px;bottom:14px;pointer-events:none;color:#cba9ff;font-size:16px;font-weight:900}
#ai-video-flow-sheet .character-description{margin-top:7px;padding:9px 10px;border-radius:12px;background:rgba(145,72,255,.06);border:1px solid rgba(180,123,255,.10);color:rgba(255,255,255,.44);font-size:8px;line-height:1.4}
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

  function watch(){
    try{
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
    watch();
    new MutationObserver(watch).observe(document.body,{subtree:true,childList:true});
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
