const express = require('express');
const originalSendFile = express.response.sendFile;

const style = `<style id="ai-video-character-ui-v2-style">
#ai-video-flow-sheet{position:fixed;inset:0;z-index:1000004;display:none;align-items:flex-end;padding:12px 11px max(12px,env(safe-area-inset-bottom));background:rgba(0,0,0,.72);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
#ai-video-flow-sheet.open{display:flex}
#ai-video-flow-sheet .box{width:100%;max-width:560px;max-height:92vh;overflow:auto;margin:0 auto;padding:18px;border-radius:26px 26px 18px 18px;border:1px solid rgba(255,255,255,.10);background:linear-gradient(180deg,#1e172b,#0e0916);box-shadow:0 -20px 70px rgba(0,0,0,.52);color:#fff}
#ai-video-flow-sheet .head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
#ai-video-flow-sheet h3{margin:0;font-size:20px;line-height:1.08;font-weight:950}
#ai-video-flow-sheet .close{width:36px;height:36px;flex:0 0 36px;border-radius:50%;background:rgba(255,255,255,.06);color:#cfc5d8;font-size:20px}
#ai-video-flow-sheet .lead{margin:0 0 14px;color:rgba(255,255,255,.54);font-size:9px;line-height:1.55}
#ai-video-flow-sheet .field{margin-top:13px}
#ai-video-flow-sheet .label{display:block;margin-bottom:7px;font-size:10px;font-weight:900;color:#eee7f3}
#ai-video-flow-sheet textarea,#ai-video-flow-sheet input[type=text]{width:100%;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(4,2,8,.38);color:#eee8f4;padding:12px;font:inherit;font-size:10px;outline:none}
#ai-video-flow-sheet textarea{min-height:98px;resize:vertical;line-height:1.5}
#ai-video-flow-sheet .character-catalog{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
#ai-video-flow-sheet .character-card{position:relative;min-height:190px;padding:0;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,.08);background:#140d1b;color:#fff;text-align:left;cursor:pointer;box-shadow:0 14px 32px rgba(0,0,0,.20)}
#ai-video-flow-sheet .character-card:active{transform:scale(.98)}
#ai-video-flow-sheet .character-card.active{border-color:rgba(192,112,255,.58);box-shadow:0 14px 36px rgba(116,59,188,.23)}
#ai-video-flow-sheet .character-image{height:138px;background-position:center;background-size:cover;background-repeat:no-repeat;position:relative}
#ai-video-flow-sheet .character-image:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 45%,rgba(4,2,9,.88) 100%);pointer-events:none}
#ai-video-flow-sheet .character-card-copy{padding:9px 10px 11px}
#ai-video-flow-sheet .character-card-title{display:block;font-size:10px;font-weight:950;line-height:1.2}
#ai-video-flow-sheet .character-card-description{display:block;margin-top:4px;color:rgba(255,255,255,.43);font-size:7.5px;line-height:1.35}
#ai-video-flow-sheet .character-check{position:absolute;right:9px;top:9px;width:25px;height:25px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#8241ff,#ef409e);font-size:12px;opacity:0;z-index:3}
#ai-video-flow-sheet .character-card.active .character-check{opacity:1}
#ai-video-flow-sheet .character-form-note{margin-top:8px;color:rgba(255,255,255,.36);font-size:7.5px;line-height:1.45}
#ai-video-flow-sheet .summary{margin-top:13px;padding:11px 12px;border-radius:14px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);color:rgba(255,255,255,.48);font-size:8px;line-height:1.5}
#ai-video-flow-sheet .submit{width:100%;min-height:50px;margin-top:12px;border-radius:15px;background:linear-gradient(100deg,#8241ff,#c15bff 50%,#ef409e);color:#fff;font-size:11px;font-weight:950;box-shadow:0 14px 32px rgba(145,72,255,.24)}
@media(max-width:390px){#ai-video-flow-sheet .character-card{min-height:176px}#ai-video-flow-sheet .character-image{height:124px}}
</style>`;

const script = `<script id="ai-video-character-ui-v2-script">
(function(){
  if(window.__AI_VIDEO_CHARACTER_UI_V2__)return;
  window.__AI_VIDEO_CHARACTER_UI_V2__=true;

  var characters=[
    {id:'homeless',title:'Бомж-поздравитель',description:'Харизматичный, смешной, уличный и по-доброму дерзкий.',image:encodeURI('/assets/video-gifts/characters/бомж поздравитель.jpg')},
    {id:'baby-boss',title:'Босс-малокосос',description:'Серьёзный малыш-босс в большом кресле руководителя.',image:encodeURI('/assets/video-gifts/characters/босс малокосос поздравитель.jpg')},
    {id:'girl',title:'Молодая девушка',description:'Очень привлекательная, современная, обаятельная и игривая.',image:encodeURI('/assets/video-gifts/characters/девушка поздравитель.jpg')},
    {id:'grandpa',title:'Старенький дедушка',description:'Тёплый, мудрый, добрый и немного юморной.',image:encodeURI('/assets/video-gifts/characters/дедушка поздравитель.jpg')},
    {id:'agent',title:'Тайный агент',description:'Серьёзный спецагент с сухим юмором и спокойной подачей.',image:encodeURI('/assets/video-gifts/characters/агент поздравитель.jpg')},
    {id:'host',title:'Эстрадный ведущий',description:'Энергичный, харизматичный ведущий яркого шоу.',image:encodeURI('/assets/video-gifts/characters/ведущий поздравитель.jpg')}
  ];

  function removeLegacySheet(){
    var old=document.getElementById('ai-video-sheet');
    if(old)old.remove();
  }

  function sheet(){
    var el=document.getElementById('ai-video-flow-sheet');
    if(el)return el;
    el=document.createElement('div');
    el.id='ai-video-flow-sheet';
    el.innerHTML='<div class="box"><div class="head"><h3>Поздравление от персонажа</h3><button class="close" type="button">×</button></div><p class="lead">Выберите одного из шести персонажей и укажите только имя, повод и пожелания. Для каждого героя используется свой фиксированный мир, характер и стиль речи.</p><div class="form"></div><div class="summary">15 секунд · вертикальное видео 9:16 · 327 ₽</div><button class="submit" type="button">Создать видео — 327 ₽</button></div>';
    document.body.appendChild(el);
    el.addEventListener('click',function(e){if(e.target===el)el.classList.remove('open')});
    el.querySelector('.close').onclick=function(){el.classList.remove('open')};
    return el;
  }

  function syncPrompt(form){
    var character=((form.querySelector('#vf-character')||{}).value||'homeless');
    var recipient=((form.querySelector('#vf-recipient')||{}).value||'').trim();
    var occasion=((form.querySelector('#vf-occasion')||{}).value||'').trim();
    var wishes=((form.querySelector('#vf-wishes')||{}).value||'').trim();
    var characterName=(characters.find(function(c){return c.id===character})||characters[0]).title;
    var prompt=form.querySelector('#vf-prompt');
    if(!prompt)return;
    if(!recipient || !occasion){prompt.value='';return;}
    prompt.value=[
      'Персонаж: '+characterName+'.',
      'Персональное поздравление для '+recipient+'.',
      'Повод: '+occasion+'.',
      'Пожелания: '+(wishes||'здоровья, счастья, удачи и отличного настроения')+'.',
      'Персонаж сохраняет свой фиксированный мир, внешний вид, характер и индивидуальную манеру общения.'
    ].join(' ');
  }

  function render(){
    removeLegacySheet();
    var s=sheet();
    var form=s.querySelector('.form');
    form.innerHTML=''
      +'<div class="field"><span class="label">Выберите персонажа</span><div class="character-catalog"></div></div>'
      +'<div class="field"><span class="label">Кого поздравить?</span><input id="vf-recipient" type="text" maxlength="120" placeholder="Например: Иван"></div>'
      +'<div class="field"><span class="label">С чем поздравить?</span><input id="vf-occasion" type="text" maxlength="160" placeholder="Например: день рождения, 30 лет"></div>'
      +'<div class="field"><span class="label">Что пожелать?</span><textarea id="vf-wishes" maxlength="900" placeholder="Например: здоровья, денег, удачи и больше ярких моментов."></textarea></div>'
      +'<p class="character-form-note">После выбора персонажа его фиксированный профессиональный профиль автоматически используется сервером.</p>'
      +'<input id="vf-prompt" type="hidden"><input id="vf-character" type="hidden" value="homeless"><input id="vf-location" type="hidden" value="fixed">';

    var catalog=form.querySelector('.character-catalog');
    catalog.innerHTML=characters.map(function(c,i){
      return '<button class="character-card'+(i===0?' active':'')+'" type="button" data-character-id="'+c.id+'">'
        +'<div class="character-image" style="background-image:url(\''+c.image+'\')"></div>'
        +'<span class="character-check">✓</span>'
        +'<div class="character-card-copy"><span class="character-card-title">'+c.title+'</span><span class="character-card-description">'+c.description+'</span></div>'
        +'</button>';
    }).join('');

    catalog.addEventListener('click',function(e){
      var card=e.target.closest('.character-card');
      if(!card)return;
      form.querySelector('#vf-character').value=card.dataset.characterId;
      catalog.querySelectorAll('.character-card').forEach(function(x){x.classList.remove('active')});
      card.classList.add('active');
      syncPrompt(form);
    });

    ['#vf-recipient','#vf-occasion','#vf-wishes'].forEach(function(sel){
      form.querySelector(sel).addEventListener('input',function(){syncPrompt(form)});
    });
    syncPrompt(form);
    s.dataset.type='character';
    s.classList.add('open');
  }

  function handleCharacterClick(e){
    var tool=e.target&&e.target.closest?e.target.closest('#ai-video-gift-page .tool[data-type="character"]'):null;
    if(!tool)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    removeLegacySheet();
    render();
  }

  function bind(){
    if(document.documentElement.dataset.aiCharacterV2DocumentBound==='1')return;
    document.documentElement.dataset.aiCharacterV2DocumentBound='1';
    document.addEventListener('click',handleCharacterClick,true);
  }

  function start(){
    bind();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
</script>`;

function inject(body){
  if(typeof body!=='string'||!body.includes('<body'))return body;
  if(body.includes('ai-video-character-ui-v2-script'))return body;
  return body.replace(/<\/body>/i,style+'\n'+script+'\n</body>');
}

express.response.sendFile=function patchedSendFile(filePath,...args){
  var isIndex=typeof filePath==='string'&&/(?:^|[\\/])index\.html$/i.test(filePath);
  if(!isIndex)return originalSendFile.call(this,filePath,...args);
  var response=this,originalSend=response.send;
  response.send=function characterUiSend(body){return originalSend.call(this,inject(body));};
  try{return originalSendFile.call(this,filePath,...args)}finally{response.send=originalSend;}
};

console.log('[AI VIDEO CHARACTER UI V2] loaded: six fixed characters only');
