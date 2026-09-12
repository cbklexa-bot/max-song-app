const express = require('express');

const originalSendFile = express.response.sendFile;

const style = `<style id="ai-video-flow-ui-style">
#ai-video-flow-sheet{position:fixed;inset:0;z-index:1000004;display:none;align-items:flex-end;padding:12px 11px max(12px,env(safe-area-inset-bottom));background:rgba(0,0,0,.72);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
#ai-video-flow-sheet.open{display:flex}
#ai-video-flow-sheet .box{width:100%;max-width:560px;max-height:92vh;overflow:auto;margin:0 auto;padding:18px;border-radius:26px 26px 18px 18px;border:1px solid rgba(255,255,255,.10);background:linear-gradient(180deg,#1e172b,#0e0916);box-shadow:0 -20px 70px rgba(0,0,0,.52);color:#fff}
#ai-video-flow-sheet .head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
#ai-video-flow-sheet h3{margin:0;font-size:20px;line-height:1.08;font-weight:950}
#ai-video-flow-sheet .close{width:36px;height:36px;flex:0 0 36px;border-radius:50%;background:rgba(255,255,255,.06);color:#cfc5d8;font-size:20px}
#ai-video-flow-sheet .lead{margin:0 0 14px;color:rgba(255,255,255,.54);font-size:9px;line-height:1.55}
#ai-video-flow-sheet .field{margin-top:13px}
#ai-video-flow-sheet .label{display:block;margin-bottom:7px;font-size:10px;font-weight:900;color:#eee7f3}
#ai-video-flow-sheet .hint{margin:5px 0 0;color:rgba(255,255,255,.32);font-size:7.5px;line-height:1.45}
#ai-video-flow-sheet .upload{position:relative;display:flex;align-items:center;justify-content:center;min-height:94px;padding:14px;border-radius:16px;border:1px dashed rgba(180,123,255,.32);background:rgba(145,72,255,.06);color:#d9c0ff;text-align:center;cursor:pointer}
#ai-video-flow-sheet .upload strong{display:block;font-size:11px}.upload span{display:block;margin-top:5px;color:rgba(255,255,255,.42);font-size:8px}
#ai-video-flow-sheet input[type=file]{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}
#ai-video-flow-sheet textarea,#ai-video-flow-sheet input[type=text],#ai-video-flow-sheet select{width:100%;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(4,2,8,.38);color:#eee8f4;padding:12px;font:inherit;font-size:10px;outline:none}
#ai-video-flow-sheet textarea{min-height:98px;resize:vertical;line-height:1.5}
#ai-video-flow-sheet select{appearance:none}
#ai-video-flow-sheet .chips{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
#ai-video-flow-sheet .chip{min-height:40px;padding:8px 9px;border-radius:12px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025);color:#c7bdce;font-size:8.5px;font-weight:850;cursor:pointer}
#ai-video-flow-sheet .chip.active{border-color:rgba(190,126,255,.44);background:linear-gradient(135deg,rgba(145,72,255,.30),rgba(239,61,154,.12));color:#fff}
#ai-video-flow-sheet .chars{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
#ai-video-flow-sheet .char{position:relative;min-height:94px;padding:11px;border-radius:15px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025);color:#fff;text-align:left;cursor:pointer;overflow:hidden}
#ai-video-flow-sheet .char b{display:block;font-size:10px;line-height:1.18}.char span{display:block;margin-top:5px;color:rgba(255,255,255,.40);font-size:7.5px;line-height:1.35}.char.active{border-color:rgba(191,121,255,.48);background:linear-gradient(145deg,rgba(145,72,255,.28),rgba(239,61,154,.10));box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}
#ai-video-flow-sheet .summary{margin-top:13px;padding:11px 12px;border-radius:14px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);color:rgba(255,255,255,.48);font-size:8px;line-height:1.5}
#ai-video-flow-sheet .submit{width:100%;min-height:50px;margin-top:12px;border-radius:15px;background:linear-gradient(100deg,#8241ff,#c15bff 50%,#ef409e);color:#fff;font-size:11px;font-weight:950;box-shadow:0 14px 32px rgba(145,72,255,.24)}
@media(max-width:390px){#ai-video-flow-sheet .chips,#ai-video-flow-sheet .chars{grid-template-columns:1fr 1fr}#ai-video-flow-sheet h3{font-size:19px}}
</style>`;

const script = `<script id="ai-video-flow-ui-script">
(function(){
  if(window.__AI_VIDEO_FLOW_UI__)return; window.__AI_VIDEO_FLOW_UI__=true;

  var root='/assets/video-gifts/';
  var files={
    'photos':encodeURI(root+'видео из фото.jpg'),
    'singing':encodeURI(root+'поющие фото.jpg'),
    'character':encodeURI(root+'поздоавление от персанажа.jpg')
  };

  function sheet(){
    var el=document.getElementById('ai-video-flow-sheet');
    if(el)return el;
    el=document.createElement('div'); el.id='ai-video-flow-sheet';
    el.innerHTML='<div class="box"><div class="head"><h3></h3><button class="close" type="button">×</button></div><p class="lead"></p><div class="form"></div><div class="summary"></div><button class="submit" type="button">Создать видео</button></div>';
    document.body.appendChild(el);
    el.addEventListener('click',function(e){if(e.target===el)el.classList.remove('open')});
    el.querySelector('.close').onclick=function(){el.classList.remove('open')};
    return el;
  }

  function bindFiles(input,box){
    input.onchange=function(){
      var names=[].slice.call(input.files||[]).map(function(f){return f.name});
      box.innerHTML=names.length?'<strong>Выбрано файлов: '+names.length+'</strong><span>'+names.join(', ')+'</span>':'<strong>Выбрать фотографии</strong><span>Откроется галерея устройства</span>';
    };
  }

  function render(type){
    var s=sheet(), form=s.querySelector('.form');
    var titles={photos:'Видео из фотографий',singing:'Поющее фото',character:'Поздравление от персонажа'};
    var leads={
      photos:'Загрузите фотографии, выберите настроение и опишите, каким должен получиться ролик.',
      singing:'Загрузите фотографию человека и напишите, что он должен сказать, спеть или кому передать поздравление.',
      character:'Выберите персонажа, а затем укажите, кого и с чем он должен поздравить. Эти данные станут основой сценария для AI-видео.'
    };
    s.querySelector('h3').textContent=titles[type];
    s.querySelector('.lead').textContent=leads[type];

    var html='';
    if(type==='photos'){
      html+='<div class="field"><span class="label">Фотографии</span><label class="upload"><div><strong>Выбрать фотографии</strong><span>Можно выбрать несколько фото из галереи</span></div><input id="vf-files" type="file" accept="image/*" multiple></label></div>';
      html+='<div class="field"><span class="label">Стиль видео</span><div class="chips"><button class="chip active" data-style="cinematic" type="button">Кинематографично</button><button class="chip" data-style="warm" type="button">Тёплые воспоминания</button><button class="chip" data-style="romantic" type="button">Романтично</button><button class="chip" data-style="party" type="button">Празднично</button></div></div>';
      html+='<div class="field"><span class="label">Что должно получиться?</span><textarea id="vf-prompt" placeholder="Например: семейный ролик ко дню рождения, плавные переходы, душевная атмосфера, показать фотографии последовательно и красиво."></textarea></div>';
    }else if(type==='singing'){
      html+='<div class="field"><span class="label">Фотография</span><label class="upload"><div><strong>Выбрать фото</strong><span>Выберите один портрет человека из галереи</span></div><input id="vf-files" type="file" accept="image/*"></label></div>';
      html+='<div class="field"><span class="label">Что должен сделать герой?</span><select id="vf-action"><option value="sing">Спеть песню</option><option value="greet">Поздравить</option><option value="speak">Сказать текст</option></select></div>';
      html+='<div class="field"><span class="label">Текст и пожелания</span><textarea id="vf-prompt" placeholder="Например: девушка поздравляет маму с юбилеем, говорит тёплые слова и исполняет короткий припев о любви к маме."></textarea><p class="hint">Опишите человека, кому адресовано видео, повод и желаемое содержание. Дальше эти данные будут преобразованы сервером в запрос для выбранного AI-видеосервиса.</p></div>';
    }else{
      html+='<div class="field"><span class="label">Выберите персонажа</span><div class="chars"><button class="char active" data-char="homeless" type="button"><b>Уличный поздравитель</b><span>Нелепый, харизматичный, немного безумный персонаж на улице.</span></button><button class="char" data-char="singer" type="button"><b>Весёлый артист</b><span>Яркий праздничный персонаж в образе артиста.</span></button><button class="char" data-char="santa" type="button"><b>Дед Мороз</b><span>Праздничное зимнее поздравление.</span></button><button class="char" data-char="boss" type="button"><b>Строгий начальник</b><span>Комедийное деловое поздравление.</span></button></div></div>';
      html+='<div class="field"><span class="label">Кого поздравить?</span><input id="vf-recipient" type="text" placeholder="Например: Вован, 30 лет"></div>';
      html+='<div class="field"><span class="label">Повод и пожелание</span><textarea id="vf-prompt" placeholder="Например: поздравить Вована с 30-летием. Пожелать здоровья, денег, удачи и весёлой жизни. Поздравление должно быть дерзким и смешным."></textarea></div>';
      html+='<div class="field"><span class="label">Локация</span><select id="vf-location"><option value="street">Городская улица</option><option value="courtyard">Двор</option><option value="party">Праздничная площадка</option><option value="office">Офис</option><option value="custom">Своя локация</option></select></div>';
    }
    form.innerHTML=html;

    var file=s.querySelector('#vf-files');
    if(file)bindFiles(file,file.closest('.upload').querySelector('div'));
    s.querySelectorAll('.chip').forEach(function(b){b.onclick=function(){s.querySelectorAll('.chip').forEach(function(x){x.classList.remove('active')});b.classList.add('active')}});
    s.querySelectorAll('.char').forEach(function(b){b.onclick=function(){s.querySelectorAll('.char').forEach(function(x){x.classList.remove('active')});b.classList.add('active')}});
    s.dataset.type=type;
    s.classList.add('open');
    updateSummary(s);
  }

  function updateSummary(s){
    var type=s.dataset.type;
    var summary=s.querySelector('.summary');
    if(!summary)return;
    summary.textContent=type==='photos'?'После выбора API мы автоматически подставим доступную длительность и технические ограничения провайдера.':type==='singing'?'Видео будет строиться по фотографии + выбранному действию + вашему тексту и пожеланиям.':'На стороне сервера запрос будет собран из персонажа, получателя, повода, локации и текста поздравления.';
  }

  function bind(){
    var page=document.getElementById('ai-video-gift-page');
    if(!page||page.dataset.aiFlowBound==='1')return;
    page.dataset.aiFlowBound='1';
    page.addEventListener('click',function(e){
      var b=e.target.closest('.tool'); if(!b)return;
      var type=b.dataset.type; if(type){e.preventDefault();e.stopImmediatePropagation();render(type);}
    },true);
  }

  function start(){bind();new MutationObserver(bind).observe(document.body,{subtree:true,childList:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
</script>`;

express.response.sendFile=function patchedSendFile(filePath,...args){
  var isIndex=typeof filePath==='string'&&/(?:^|[\\/])index\.html$/i.test(filePath);
  if(!isIndex)return originalSendFile.call(this,filePath,...args);
  var response=this,originalSend=response.send;
  response.send=function aiVideoFlowSend(body){
    try{
      if(typeof body==='string'&&body.includes('<body')&&!body.includes('ai-video-flow-ui-style')){
        var m='</body>',i=body.toLowerCase().lastIndexOf(m);
        if(i>=0)body=body.slice(0,i)+style+'\n'+script+'\n'+body.slice(i);
      }
    }catch(error){console.error('[AI VIDEO FLOW UI]',error.message)}
    return originalSend.call(this,body);
  };
  try{return originalSendFile.call(this,filePath,...args)}finally{response.send=originalSend}
};

console.log('[AI VIDEO FLOW UI] module loaded');
