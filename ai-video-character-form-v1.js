const express = require('express');

const originalSendFile = express.response.sendFile;

const style = `<style id="ai-video-character-form-v2-style">
#ai-video-gift-page .tool[data-type="photos"],#ai-video-gift-page .tool[data-type="singing"]{display:none !important}
#ai-video-flow-sheet .character-form-note{margin-top:8px;color:rgba(255,255,255,.36);font-size:8px;line-height:1.45}
#ai-video-flow-sheet .character-catalog{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
#ai-video-flow-sheet .character-card{position:relative;min-height:190px;padding:0;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,.08);background:#140d1b;color:#fff;text-align:left;cursor:pointer;box-shadow:0 14px 32px rgba(0,0,0,.20)}
#ai-video-flow-sheet .character-card.active{border-color:rgba(192,112,255,.58);box-shadow:0 14px 36px rgba(116,59,188,.23)}
#ai-video-flow-sheet .character-image{height:138px;background-position:center;background-size:cover;background-repeat:no-repeat;position:relative}
#ai-video-flow-sheet .character-image:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 45%,rgba(4,2,9,.88) 100%);pointer-events:none}
#ai-video-flow-sheet .character-card-copy{padding:9px 10px 11px}
#ai-video-flow-sheet .character-card-title{display:block;font-size:10px;font-weight:950;line-height:1.2}
#ai-video-flow-sheet .character-card-description{display:block;margin-top:4px;color:rgba(255,255,255,.43);font-size:7.5px;line-height:1.35}
#ai-video-flow-sheet .character-check{position:absolute;right:9px;top:9px;width:25px;height:25px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#8241ff,#ef409e);font-size:12px;opacity:0;z-index:3}
#ai-video-flow-sheet .character-card.active .character-check{opacity:1}
@media(max-width:390px){#ai-video-flow-sheet .character-card{min-height:176px}#ai-video-flow-sheet .character-image{height:124px}}
</style>`;

const script = `<script id="ai-video-character-form-v1-script">
(function(){
  if(window.__AI_VIDEO_CHARACTER_FORM_V1__)return;
  window.__AI_VIDEO_CHARACTER_FORM_V1__=true;

  var characters=[
    {id:'homeless',title:'Бомж-поздравитель',description:'Харизматичный, дерзкий и добрый уличный юмор.',image:encodeURI('/assets/video-gifts/characters/бомж поздравитель.jpg')},
    {id:'baby-boss',title:'Босс-малокосос',description:'Серьёзный малыш-босс в роскошном офисе.',image:encodeURI('/assets/video-gifts/characters/босс малокосос поздравитель.jpg')},
    {id:'girl',title:'Молодая девушка',description:'Привлекательная, современная и обаятельная.',image:encodeURI('/assets/video-gifts/characters/девушка поздравитель.jpg')},
    {id:'grandpa',title:'Старенький дедушка',description:'Тёплый, мудрый и немного юморной.',image:encodeURI('/assets/video-gifts/characters/дедушка поздравитель.jpg')},
    {id:'agent',title:'Тайный агент',description:'Серьёзный спецагент с сухим чувством юмора.',image:encodeURI('/assets/video-gifts/characters/агент поздравитель.jpg')},
    {id:'host',title:'Эстрадный ведущий',description:'Энергичный, харизматичный ведущий шоу.',image:encodeURI('/assets/video-gifts/characters/ведущий поздравитель.jpg')}
  ];

  function getSheet(){return document.getElementById('ai-video-flow-sheet');}
  function getForm(){var s=getSheet();return s?s.querySelector('.form'):null;}
  function selectedId(form){return String((form.querySelector('#vf-character')||{}).value||'homeless').trim();}

  function renderCatalog(form){
    var wrap=form.querySelector('.character-catalog');
    if(!wrap)return;
    var selected=selectedId(form);
    wrap.innerHTML=characters.map(function(c){
      var active=c.id===selected?' active':'';
      return '<button class="character-card'+active+'" type="button" data-character-id="'+c.id+'">'
        +'<div class="character-image" style="background-image:url(\''+c.image+'\')"></div>'
        +'<span class="character-check">✓</span>'
        +'<div class="character-card-copy"><span class="character-card-title">'+c.title+'</span><span class="character-card-description">'+c.description+'</span></div>'
        +'</button>';
    }).join('');
  }

  function syncPrompt(form){
    var recipient=String((form.querySelector('#vf-recipient')||{}).value||'').trim();
    var occasion=String((form.querySelector('#vf-occasion')||{}).value||'').trim();
    var wishes=String((form.querySelector('#vf-wishes')||{}).value||'').trim();
    var prompt=form.querySelector('#vf-prompt');
    if(!prompt)return;
    if(!recipient||!occasion){prompt.value='';return;}
    prompt.value='Персональное поздравление для '+recipient+'. Повод: '+occasion+'. Пожелания: '+(wishes||'здоровья, счастья, удачи и отличного настроения')+'. Использовать строго профессиональный профиль выбранного персонажа, его фиксированный мир, характер и манеру общения.';
  }

  function bindCards(form){
    var wrap=form.querySelector('.character-catalog');
    if(!wrap||wrap.dataset.bound==='1')return;
    wrap.dataset.bound='1';
    wrap.addEventListener('click',function(e){
      var card=e.target.closest('.character-card');
      if(!card)return;
      var hidden=form.querySelector('#vf-character');
      if(hidden)hidden.value=card.dataset.characterId;
      wrap.querySelectorAll('.character-card').forEach(function(x){x.classList.remove('active')});
      card.classList.add('active');
      syncPrompt(form);
    });
  }

  function patch(){
    var sheet=getSheet();
    if(!sheet||sheet.dataset.type!=='character')return;
    var form=getForm();
    if(!form)return;
    var lead=sheet.querySelector('.lead');
    if(lead)lead.textContent='Выберите одного из шести персонажей и укажите только имя, повод и пожелания. Для каждого героя используется свой фиксированный мир, характер и стиль речи.';
    if(form.dataset.characterFormV2!=='1'){
      form.innerHTML=''
        +'<div class="field"><span class="label">Выберите персонажа</span><div class="character-catalog"></div></div>'
        +'<div class="field"><span class="label">Кого поздравить?</span><input id="vf-recipient" type="text" maxlength="120" placeholder="Например: Иван"></div>'
        +'<div class="field"><span class="label">С чем поздравить?</span><input id="vf-occasion" type="text" maxlength="160" placeholder="Например: день рождения, 30 лет"></div>'
        +'<div class="field"><span class="label">Что пожелать?</span><textarea id="vf-wishes" maxlength="900" placeholder="Например: здоровья, денег, удачи и больше ярких моментов."></textarea></div>'
        +'<p class="character-form-note">После выбора персонажа его фиксированный профессиональный профиль автоматически используется сервером.</p>'
        +'<input id="vf-prompt" type="hidden"><input id="vf-character" type="hidden" value="homeless"><input id="vf-location" type="hidden" value="fixed">';
      form.dataset.characterFormV2='1';
    }
    renderCatalog(form);
    bindCards(form);
    ['#vf-recipient','#vf-occasion','#vf-wishes'].forEach(function(sel){
      var field=form.querySelector(sel);
      if(field&&field.dataset.bound!=='1'){
        field.dataset.bound='1';
        field.addEventListener('input',function(){syncPrompt(form)});
      }
    });
    var submit=sheet.querySelector('.submit');
    if(submit)submit.textContent='Создать видео — 327 ₽';
    syncPrompt(form);
  }

  function schedulePatch(){
    requestAnimationFrame(function(){patch();requestAnimationFrame(patch)});
  }

  function start(){
    schedulePatch();
    document.addEventListener('click',function(e){
      var inSheet=e.target.closest&&e.target.closest('#ai-video-flow-sheet');
      var charTool=e.target.closest&&e.target.closest('#ai-video-gift-page .tool[data-type="character"]');
      if(inSheet||charTool)schedulePatch();
    },true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
</script>`;

function inject(body){
  if(typeof body!=='string'||!body.includes('<body'))return body;
  if(body.includes('ai-video-character-form-v1-script'))return body;
  return body.replace(/<\/body>/i,style+'\n'+script+'\n</body>');
}

express.response.sendFile=function patchedSendFile(filePath,...args){
  var isIndex=typeof filePath==='string'&&/(?:^|[\\/])index\.html$/i.test(filePath);
  if(!isIndex)return originalSendFile.call(this,filePath,...args);
  var response=this,originalSend=response.send;
  response.send=function aiVideoCharacterSend(body){return originalSend.call(this,inject(body));};
  try{return originalSendFile.call(this,filePath,...args)}finally{response.send=originalSend;}
};

console.log('[AI VIDEO CHARACTER FORM V2] six fixed characters loaded');
