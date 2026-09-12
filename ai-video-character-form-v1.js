const express = require('express');

const originalSend = express.response.send;

const style = `<style id="ai-video-character-form-v1-style">
#ai-video-gift-page .tool[data-type="photos"],#ai-video-gift-page .tool[data-type="singing"]{display:none !important}
#ai-video-flow-sheet .character-form-note{margin-top:8px;color:rgba(255,255,255,.36);font-size:7.5px;line-height:1.45}
#ai-video-flow-sheet .character-catalog{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
#ai-video-flow-sheet .character-card{position:relative;min-height:190px;padding:0;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,.08);background:linear-gradient(160deg,#24172f,#0e0916);color:#fff;text-align:left;cursor:pointer;box-shadow:0 14px 32px rgba(0,0,0,.20);transition:transform .16s ease,border-color .18s ease,box-shadow .18s ease}
#ai-video-flow-sheet .character-card:active{transform:scale(.98)}
#ai-video-flow-sheet .character-card.active{border-color:rgba(192,112,255,.58);box-shadow:0 14px 36px rgba(116,59,188,.23),inset 0 1px 0 rgba(255,255,255,.06)}
#ai-video-flow-sheet .character-image{position:relative;height:135px;background:radial-gradient(circle at 50% 20%,rgba(239,144,214,.34),transparent 42%),linear-gradient(160deg,#4d2b5f,#17101f 80%);background-position:center;background-size:cover}
#ai-video-flow-sheet .character-image:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 52%,rgba(4,2,9,.84) 100%);pointer-events:none}
#ai-video-flow-sheet .character-card-copy{padding:9px 10px 11px}
#ai-video-flow-sheet .character-card-title{display:block;font-size:10px;font-weight:950;line-height:1.2}
#ai-video-flow-sheet .character-card-description{display:block;margin-top:4px;color:rgba(255,255,255,.43);font-size:7.5px;line-height:1.35}
#ai-video-flow-sheet .character-check{position:absolute;right:9px;top:9px;width:25px;height:25px;border-radius:50%;display:grid;place-items:center;background:rgba(8,4,13,.55);border:1px solid rgba(255,255,255,.18);font-size:12px;opacity:.0;z-index:4}
#ai-video-flow-sheet .character-card.active .character-check{opacity:1;background:linear-gradient(135deg,#8241ff,#ef409e)}
@media(max-width:390px){#ai-video-flow-sheet .character-catalog{grid-template-columns:1fr 1fr}#ai-video-flow-sheet .character-card{min-height:176px}#ai-video-flow-sheet .character-image{height:124px}}
</style>`;

const script = `<script id="ai-video-character-form-v1-script">
(function(){
  if(window.__AI_VIDEO_CHARACTER_FORM_V1__)return;
  window.__AI_VIDEO_CHARACTER_FORM_V1__=true;

  var characters=[
    {id:'homeless',title:'Бомж-поздравитель',description:'Уличный, дерзкий и добрый юмор.',image:'/assets/video-gifts/поздоавление%20от%20персанажа.jpg'},
    {id:'girl',title:'Молодая девушка',description:'Тёплая, современная и обаятельная.',image:'/assets/video-gifts/characters/girl.jpg'},
    {id:'boss',title:'Строгий начальник',description:'Серьёзная подача с комедийным эффектом.',image:'/assets/video-gifts/characters/boss.jpg'},
    {id:'rapper',title:'Дерзкий рэпер',description:'Энергично, ритмично и с характером.',image:'/assets/video-gifts/characters/rapper.jpg'},
    {id:'santa',title:'Дед Мороз',description:'Празднично, сказочно и по-доброму.',image:'/assets/video-gifts/characters/santa.jpg'},
    {id:'grandpa',title:'Добрый дедушка',description:'Тёплое, душевное и семейное поздравление.',image:'/assets/video-gifts/characters/grandpa.jpg'}
  ];

  function normalizeOccasion(value){
    var text=String(value||'').trim().replace(/^[,.:;\-–—]+|[,.:;\-–—]+$/g,'').replace(/\s+/g,' ');
    var lower=text.toLowerCase();
    if(!text)return '';
    var exact={
      'день рождения':'днём рождения','день варенья':'днём варенья','юбилей':'юбилеем','свадьба':'свадьбой','годовщина':'годовщиной','новоселье':'новосельем','рождение ребёнка':'рождением ребёнка','рождение ребенка':'рождением ребёнка','защита диплома':'защитой диплома','выпускной':'выпускным','новый год':'Новым годом','23 февраля':'23 Февраля','8 марта':'8 Марта'
    };
    if(exact[lower])return exact[lower];
    var m=lower.match(/^(\d+)(?:-?летие)$/i); if(m)return m[1]+'-летием';
    m=lower.match(/^(\d+)\s*лет$/i); if(m)return m[1]+' годами';
    m=lower.match(/^(\d+)\s*летия$/i); if(m)return m[1]+'-летием';
    if(/ния$/.test(lower))return text.slice(0,-2)+'нем';
    if(/тие$/.test(lower))return text.slice(0,-2)+'тием';
    if(/ье$/.test(lower))return text.slice(0,-2)+'ьем';
    if(/а$/.test(lower))return text.slice(0,-1)+'ой';
    if(/я$/.test(lower))return text.slice(0,-1)+'ей';
    if(/о$/.test(lower))return text.slice(0,-1)+'ом';
    if(/й$/.test(lower))return text.slice(0,-1)+'ем';
    if(/ь$/.test(lower))return text+'ю';
    return text;
  }

  function selectedId(form){
    return ((form.querySelector('#vf-character')||{}).value||'homeless').trim();
  }

  function renderCatalog(form){
    var wrap=form.querySelector('.character-catalog');
    if(!wrap)return;
    var selected=selectedId(form);
    wrap.innerHTML=characters.map(function(character){
      var active=character.id===selected?' active':'';
      return '<button class="character-card'+active+'" type="button" data-character-id="'+character.id+'">'
        +'<div class="character-image" style="background-image:url(\''+character.image+'\')"></div>'
        +'<span class="character-check">✓</span>'
        +'<div class="character-card-copy"><span class="character-card-title">'+character.title+'</span><span class="character-card-description">'+character.description+'</span></div>'
        +'</button>';
    }).join('');

    wrap.querySelectorAll('.character-card').forEach(function(card){
      card.addEventListener('click',function(){
        form.querySelector('#vf-character').value=card.dataset.characterId;
        wrap.querySelectorAll('.character-card').forEach(function(item){item.classList.remove('active')});
        card.classList.add('active');
        syncPrompt(form);
      });
    });
  }

  function syncPrompt(form){
    var recipient=((form.querySelector('#vf-recipient')||{}).value||'').trim();
    var occasion=((form.querySelector('#vf-occasion')||{}).value||'').trim();
    var wishes=((form.querySelector('#vf-wishes')||{}).value||'').trim();
    var prompt=form.querySelector('#vf-prompt');
    if(!prompt)return;
    if(!recipient || !occasion){prompt.value='';return;}
    var occasionPhrase=normalizeOccasion(occasion);
    var wishLine=wishes || 'здоровья, денег, удачи и отличного настроения';
    prompt.value=[
      'Создать персональное поздравление для '+recipient+'.',
      'Повод: '+occasionPhrase+'.',
      'Пожелания пользователя: '+wishLine+'.',
      'Использовать строго профиль выбранного персонажа и его индивидуальную манеру общения.'
    ].join(' ');
  }

  function patch(){
    var sheet=document.getElementById('ai-video-flow-sheet');
    if(!sheet || sheet.dataset.type!=='character')return;
    var lead=sheet.querySelector('.lead');
    if(lead)lead.textContent='У каждого персонажа свой характер, голос, манера общения и профессиональный промпт. Вам нужно указать только имя, повод и пожелания.';
    var form=sheet.querySelector('.form');
    if(!form)return;
    if(form.dataset.characterFormV1==='1')return;
    form.innerHTML=''
      +'<div class="field"><span class="label">Выберите персонажа</span><div class="character-catalog"></div></div>'
      +'<div class="field"><span class="label">Кого поздравить?</span><input id="vf-recipient" type="text" maxlength="120" placeholder="Например: Иван"></div>'
      +'<div class="field"><span class="label">С чем поздравить?</span><input id="vf-occasion" type="text" maxlength="160" placeholder="Например: день рождения, 30 лет"></div>'
      +'<div class="field"><span class="label">Что пожелать?</span><textarea id="vf-wishes" maxlength="900" placeholder="Например: здоровья, денег, удачи и больше ярких моментов."></textarea></div>'
      +'<p class="character-form-note">После выбора персонажа его готовый профиль автоматически используется при создании видео.</p>'
      +'<input id="vf-prompt" type="hidden"><input id="vf-character" type="hidden" value="homeless"><input id="vf-location" type="hidden" value="street">';
    form.dataset.characterFormV1='1';
    renderCatalog(form);
    ['#vf-recipient','#vf-occasion','#vf-wishes'].forEach(function(selector){
      var field=form.querySelector(selector);
      field.addEventListener('input',function(){syncPrompt(form)});
      field.addEventListener('change',function(){syncPrompt(form)});
    });
    var submit=sheet.querySelector('.submit');
    if(submit)submit.textContent='Создать видео — 327 ₽';
    syncPrompt(form);
  }

  function start(){
    patch();
    document.addEventListener('click',function(event){
      var target=event.target && event.target.closest ? event.target.closest('#ai-video-flow-sheet') : null;
      var characterTool=event.target && event.target.closest ? event.target.closest('#ai-video-gift-page .tool[data-type="character"]') : null;
      if(!target && !characterTool)return;
      requestAnimationFrame(patch);
    },true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
</script>`;

function inject(body){
  if(typeof body!=='string'||!body.includes('<body'))return body;
  if(body.includes('ai-video-character-form-v1-script'))return body;
  return body.replace(/<\/body>/i,style+'\n'+script+'\n</body>');
}
express.response.send=function patchedSend(body){return originalSend.call(this,inject(body));};
console.log('[AI VIDEO CHARACTER FORM V1] simplified six-character order form loaded');
