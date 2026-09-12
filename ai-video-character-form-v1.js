const express = require('express');

const originalSend = express.response.send;

const style = `<style id="ai-video-character-form-v1-style">
#ai-video-flow-sheet .character-form-note{margin-top:8px;color:rgba(255,255,255,.36);font-size:7.5px;line-height:1.45}
#ai-video-flow-sheet .character-scenario{margin-top:12px;padding:12px;border-radius:15px;background:linear-gradient(180deg,rgba(145,72,255,.10),rgba(239,61,154,.05));border:1px solid rgba(190,126,255,.16);color:rgba(255,255,255,.70);font-size:8.5px;line-height:1.55}
#ai-video-flow-sheet .character-scenario-title{display:block;margin-bottom:7px;color:#f6eefe;font-size:9px;font-weight:950}
#ai-video-flow-sheet .character-scenario-text{display:block}
#ai-video-flow-sheet .character-fixed{padding:11px 12px;border-radius:14px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.07);color:#fff;font-size:9px;line-height:1.45}
#ai-video-flow-sheet .character-fixed strong{display:block;font-size:10px}
#ai-video-flow-sheet .character-fixed span{display:block;margin-top:4px;color:rgba(255,255,255,.42);font-size:7.5px}
</style>`;

const script = `<script id="ai-video-character-form-v1-script">
(function(){
  if(window.__AI_VIDEO_CHARACTER_FORM_V1__)return;
  window.__AI_VIDEO_CHARACTER_FORM_V1__=true;

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

  function buildScenario(form){
    var recipient=((form.querySelector('#vf-recipient')||{}).value||'').trim();
    var occasion=((form.querySelector('#vf-occasion')||{}).value||'').trim();
    var wishes=((form.querySelector('#vf-wishes')||{}).value||'').trim();
    var prompt=form.querySelector('#vf-prompt');
    var output=form.querySelector('.character-scenario-text');
    if(!prompt||!output)return;
    if(!recipient || !occasion){output.textContent='Заполните имя друга и повод — готовый смешной сценарий появится автоматически.';prompt.value='';return;}
    var occasionPhrase=normalizeOccasion(occasion);
    var wishLine=wishes || 'здоровья, денег, удачи, хорошего настроения и чтобы проблем было меньше, чем денег';
    var scenario=[
      'Короткая комедийная сценка на городской улице.',
      'Один харизматичный бездомный поздравитель обращается прямо в камеру и говорит: «А, брат, '+recipient+'! С '+occasionPhrase+' тебя!»',
      'Герой делает смешную паузу, шутливо осматривается и продолжает: «Я человек, конечно, простой, но пожелание у меня серьёзное: '+wishLine+'.»',
      'После этого он улыбается, поднимает бутылку как тост и говорит: «Живи красиво, брат! С праздником!»',
      'Подача: дружеская, абсурдная, смешная, но добрая; без унижения, оскорблений и жёсткой брани.',
      'Речь: естественная русская разговорная речь, чёткая артикуляция, синхронный звук.'
    ].join(' ');
    if(output.textContent===scenario && prompt.value===scenario)return;
    output.textContent=scenario; prompt.value=scenario;
  }

  function patch(){
    var sheet=document.getElementById('ai-video-flow-sheet');
    if(!sheet || sheet.dataset.type!=='character')return;
    var lead=sheet.querySelector('.lead');
    if(lead)lead.textContent='Один фиксированный персонаж — Бомж-поздравитель. Укажите имя друга, повод и пожелания, а смешной сценарий сформируется автоматически.';
    var form=sheet.querySelector('.form');
    if(!form)return;
    if(form.dataset.characterFormV1==='1')return;
    form.innerHTML=''
      +'<div class="field"><span class="label">Кого поздравить?</span><input id="vf-recipient" type="text" maxlength="120" placeholder="Например: Серёга"></div>'
      +'<div class="field"><span class="label">Повод</span><input id="vf-occasion" type="text" maxlength="160" placeholder="Например: день рождения, 30 лет"></div>'
      +'<div class="field"><span class="label">Что пожелать?</span><textarea id="vf-wishes" maxlength="900" placeholder="Например: здоровья, денег, удачи, кайфа от жизни и чтобы работа не доставала."></textarea></div>'
      +'<div class="character-fixed"><strong>Бомж-поздравитель</strong><span>Единственный персонаж в этом формате: забавный уличный герой с бутылками. Персонаж, локация и стиль сцены фиксированы.</span></div>'
      +'<div class="character-scenario"><span class="character-scenario-title">Автоматический смешной сценарий</span><span class="character-scenario-text">Заполните имя друга и повод — готовый смешной сценарий появится автоматически.</span></div>'
      +'<p class="character-form-note">Ваши три ответа превращаются в готовый текст для Wan 2.6. Ничего дополнительно выбирать или придумывать не нужно.</p>'
      +'<input id="vf-prompt" type="hidden"><input id="vf-character" type="hidden" value="homeless"><input id="vf-location" type="hidden" value="street">';
    form.dataset.characterFormV1='1';
    ['#vf-recipient','#vf-occasion','#vf-wishes'].forEach(function(selector){var field=form.querySelector(selector);field.addEventListener('input',function(){buildScenario(form)});field.addEventListener('change',function(){buildScenario(form)});});
    buildScenario(form);
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
console.log('[AI VIDEO CHARACTER FORM V1] loaded');
