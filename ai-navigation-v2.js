const express = require('express');
const originalSendFile = express.response.sendFile;

const css = `
<style id="ai-navigation-v2-style">
@keyframes aiNavIn{0%{transform:translate(-50%,-50%) scale(.05);opacity:.15;filter:blur(7px)}65%{opacity:1}100%{transform:translate(-50%,-50%) scale(1);opacity:1;filter:blur(0)}}
@keyframes aiNavOut{0%{transform:translate(-50%,-50%) scale(1);opacity:1}100%{transform:translate(-50%,-50%) scale(1.15);opacity:0}}
@keyframes aiNavText{0%{opacity:0;transform:translate(-50%,-50%) translateY(22px) scale(.93)}100%{opacity:1;transform:translate(-50%,-50%) translateY(0) scale(1)}}
@keyframes aiNavTextOut{0%{opacity:1;transform:translate(-50%,-50%)}100%{opacity:0;transform:translate(-50%,-50%) translateY(-8px) scale(1.04)}}
@keyframes aiNavRing{0%{transform:translate(-50%,-50%) scale(.22);opacity:0}25%{opacity:1}100%{transform:translate(-50%,-50%) scale(1.15);opacity:0}}
#ai-nav-v2{position:fixed;inset:0;z-index:1000000;display:none;pointer-events:none;overflow:hidden;background:rgba(4,2,10,.95)}
#ai-nav-v2.on{display:block}
#ai-nav-v2 .core{position:absolute;left:50%;top:50%;width:180vmax;height:180vmax;border-radius:50%;transform:translate(-50%,-50%) scale(.05);background:radial-gradient(circle at 50% 45%,rgba(255,255,255,.22),transparent 9%),radial-gradient(circle,#c977ff 0%,#9148ff 34%,#451f78 63%,#07030e 100%);box-shadow:0 0 150px rgba(174,90,255,.55);animation:aiNavIn 1.05s cubic-bezier(.13,.82,.18,1) both}
#ai-nav-v2.out .core{animation:aiNavOut .78s cubic-bezier(.42,0,.7,1) both}
#ai-nav-v2 .ring{position:absolute;left:50%;top:50%;width:62vmin;height:62vmin;border:1px solid rgba(255,255,255,.30);border-radius:50%;box-shadow:0 0 55px rgba(255,255,255,.10),inset 0 0 50px rgba(255,255,255,.05);animation:aiNavRing 2.45s ease-out .18s both}
#ai-nav-v2 .title{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);opacity:0;color:#fff;white-space:nowrap;font-size:24px;font-weight:950;letter-spacing:-.03em;text-shadow:0 12px 42px rgba(0,0,0,.38);animation:aiNavText .55s cubic-bezier(.2,.9,.2,1) .58s both}
#ai-nav-v2 .sub{position:absolute;left:50%;top:calc(50% + 38px);transform:translate(-50%,-50%);opacity:0;color:rgba(255,255,255,.62);font-size:9px;font-weight:850;letter-spacing:.18em;text-transform:uppercase;animation:aiNavText .5s ease .78s both}
#ai-nav-v2.out .title,#ai-nav-v2.out .sub{animation:aiNavTextOut .38s ease both}
#ai-video-gift-page{display:none;min-height:100vh;padding:10px 11px 24px;background:radial-gradient(560px 320px at 50% -70px,rgba(83,176,255,.18),transparent 70%),radial-gradient(450px 300px at 100% 30%,rgba(181,93,255,.13),transparent 72%),linear-gradient(180deg,#070610 0%,#0c0915 58%,#08060e 100%);color:#fff;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow-x:hidden}
#ai-video-gift-page .wrap{width:100%;max-width:560px;margin:0 auto}
#ai-video-gift-page .top,#ai-video-gift-page .hero,#ai-video-gift-page .tool,#ai-video-gift-page .how{border:1px solid rgba(255,255,255,.09);box-shadow:0 18px 48px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.04)}
#ai-video-gift-page .top{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 14px;margin-bottom:11px;border-radius:22px;background:linear-gradient(145deg,#1c283e,#0d0c17)}
#ai-video-gift-page h1{margin:0;font-size:23px;font-weight:950;background:linear-gradient(90deg,#9fe1ff,#c596ff);-webkit-background-clip:text;background-clip:text;color:transparent}
#ai-video-gift-page .badge{padding:6px 9px;border-radius:999px;background:rgba(99,219,255,.08);border:1px solid rgba(99,219,255,.14);color:#9de5ff;font-size:7px;font-weight:900}
#ai-video-gift-page .hero{position:relative;overflow:hidden;margin-bottom:12px;padding:17px;border-radius:25px;background:linear-gradient(145deg,#152640,#0d0b16)}
#ai-video-gift-page .hero h2{margin:9px 0 5px;font-size:21px;line-height:1.08;letter-spacing:-.03em}
#ai-video-gift-page .hero p{margin:0;color:rgba(255,255,255,.50);font-size:9px;line-height:1.5}
#ai-video-gift-page .tools{display:grid;gap:10px}
#ai-video-gift-page .tool{position:relative;overflow:hidden;width:100%;min-height:146px;padding:0;border-radius:24px;color:#fff;text-align:left;cursor:pointer;background:linear-gradient(145deg,#161125,#0b0912);transition:transform .17s ease,border-color .2s ease,box-shadow .2s ease}
#ai-video-gift-page .tool:active{transform:scale(.987)}
#ai-video-gift-page .art{position:absolute;inset:0 auto 0 0;width:40%;display:grid;place-items:center}
#ai-video-gift-page .photo{background:radial-gradient(circle at 50% 45%,rgba(89,198,255,.40),transparent 34%),linear-gradient(145deg,#173659,#111827)}
#ai-video-gift-page .sing{background:radial-gradient(circle at 50% 45%,rgba(214,121,255,.40),transparent 34%),linear-gradient(145deg,#39205b,#171221)}
#ai-video-gift-page .character{background:radial-gradient(circle at 50% 45%,rgba(255,150,179,.36),transparent 34%),linear-gradient(145deg,#54243d,#1c101c)}
#ai-video-gift-page .orb{width:68px;height:68px;display:grid;place-items:center;border-radius:22px;border:1px solid rgba(255,255,255,.20);background:rgba(255,255,255,.09);font-size:31px;box-shadow:0 15px 34px rgba(0,0,0,.23);animation:aiVideoFloat 3.4s ease-in-out infinite}
#ai-video-gift-page .body{margin-left:40%;min-height:146px;padding:16px;display:flex;flex-direction:column;justify-content:center}
#ai-video-gift-page .status{align-self:flex-start;padding:5px 7px;border-radius:999px;background:rgba(99,219,255,.08);border:1px solid rgba(99,219,255,.14);color:#a9e6ff;font-size:6px;font-weight:950;text-transform:uppercase}
#ai-video-gift-page .name{margin-top:9px;font-size:15px;font-weight:950}
#ai-video-gift-page .desc{margin-top:5px;color:rgba(255,255,255,.45);font-size:8.5px;line-height:1.42}
#ai-video-gift-page .link{display:flex;align-items:center;justify-content:space-between;margin-top:10px;color:#a9e2ff;font-size:8px;font-weight:950}
#ai-video-gift-page .arrow{width:26px;height:26px;border-radius:9px;display:grid;place-items:center;background:rgba(91,197,255,.12);border:1px solid rgba(91,197,255,.17)}
#ai-video-gift-page .how{margin-top:14px;padding:14px;border-radius:20px;background:rgba(17,13,27,.72)}
#ai-video-gift-page .how h3{margin:0 0 10px;font-size:11px}
#ai-video-gift-page .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
#ai-video-gift-page .step{padding:9px;border-radius:13px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);text-align:center}
#ai-video-gift-page .step b{display:block;font-size:9px}.step span{display:block;margin-top:4px;color:rgba(255,255,255,.31);font-size:6.5px;line-height:1.35}
#ai-video-sheet{position:fixed;inset:0;z-index:1000002;display:none;align-items:flex-end;padding:12px 11px max(12px,env(safe-area-inset-bottom));background:rgba(0,0,0,.70);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px)}
#ai-video-sheet.open{display:flex}#ai-video-sheet .sheet{width:100%;max-width:560px;margin:0 auto;padding:17px;border-radius:25px 25px 18px 18px;border:1px solid rgba(255,255,255,.10);background:linear-gradient(180deg,#1b1428,#0f0a17);box-shadow:0 -18px 65px rgba(0,0,0,.50)}
#ai-video-sheet .head{display:flex;align-items:center;justify-content:space-between}.sheet h3{margin:0;font-size:17px}.sheet .close{width:35px;height:35px;border-radius:50%;background:rgba(255,255,255,.06);color:#c8bdcf;font-size:18px}.sheet p{margin:7px 0 12px;color:rgba(255,255,255,.42);font-size:9px;line-height:1.5}.sheet input,.sheet textarea{width:100%;padding:12px;border-radius:15px;border:1px solid rgba(255,255,255,.07);background:rgba(4,2,8,.38);color:#eee8f4}.sheet textarea{min-height:92px;resize:vertical}.sheet .actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.sheet button{min-height:45px;border-radius:13px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:#ded5e5;font-size:9px;font-weight:900}.sheet .primary{background:linear-gradient(100deg,#8241ff,#c15bff 50%,#ef409e);border-color:transparent;color:#fff}.sheet .result{display:none;margin-top:10px;padding:10px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);color:rgba(255,255,255,.45);font-size:8px;line-height:1.45}
#ai-video-flow-sheet{position:fixed;inset:0;z-index:1000004;display:none;align-items:flex-end;padding:12px 11px max(12px,env(safe-area-inset-bottom));background:rgba(0,0,0,.72);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
#ai-video-flow-sheet.open{display:flex}
#ai-video-flow-sheet .box{width:100%;max-width:560px;max-height:92vh;overflow:auto;margin:0 auto;padding:18px;border-radius:26px 26px 18px 18px;border:1px solid rgba(255,255,255,.10);background:linear-gradient(180deg,#1e172b,#0e0916);box-shadow:0 -20px 70px rgba(0,0,0,.52);color:#fff}
#ai-video-flow-sheet .head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
#ai-video-flow-sheet h3{margin:0;font-size:20px;line-height:1.08;font-weight:950}
#ai-video-flow-sheet .close{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.06);color:#cfc5d8;font-size:20px}
#ai-video-flow-sheet .lead{margin:0 0 14px;color:rgba(255,255,255,.54);font-size:9px;line-height:1.55}
#ai-video-flow-sheet .field{margin-top:13px}.ai-char-label{display:block;margin-bottom:7px;font-size:10px;font-weight:900;color:#eee7f3}
#ai-video-flow-sheet input[type=text],#ai-video-flow-sheet textarea{width:100%;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(4,2,8,.38);color:#eee8f4;padding:12px;font:inherit;font-size:10px;outline:none}
#ai-video-flow-sheet textarea{min-height:98px;resize:vertical;line-height:1.5}
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
#ai-video-flow-sheet .character-form-note{margin-top:8px;color:rgba(255,255,255,.36);font-size:7.5px;line-height:1.45}
#ai-video-flow-sheet .summary{margin-top:13px;padding:11px 12px;border-radius:14px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);color:rgba(255,255,255,.48);font-size:8px;line-height:1.5}
#ai-video-flow-sheet .submit{width:100%;min-height:50px;margin-top:12px;border-radius:15px;background:linear-gradient(100deg,#8241ff,#c15bff 50%,#ef409e);color:#fff;font-size:11px;font-weight:950;box-shadow:0 14px 32px rgba(145,72,255,.24)}
@media(max-width:390px){#ai-video-gift-page .tool{min-height:132px}#ai-video-gift-page .art{width:37%}#ai-video-gift-page .body{margin-left:37%;min-height:132px;padding:13px}#ai-video-gift-page .orb{width:59px;height:59px;font-size:27px}#ai-video-gift-page .name{font-size:13px}#ai-video-flow-sheet .character-card{min-height:176px}#ai-video-flow-sheet .character-image{height:124px}}
</style>`;

const script = `<script id="ai-navigation-v2-script">
(function(){
 if(window.__AI_NAV_V2__)return;window.__AI_NAV_V2__=true;
 function q(s){return document.querySelector(s)}
 function home(){var h=document.getElementById('ai-gifts-home'),a=q('.app'),v=document.getElementById('ai-video-gift-page');if(v)v.style.display='none';if(a)a.style.display='none';if(h)h.style.display='block';try{if(window.WebApp&&window.WebApp.BackButton&&window.WebApp.BackButton.hide)window.WebApp.BackButton.hide()}catch(e){}window.scrollTo(0,0)}
 function song(){var h=document.getElementById('ai-gifts-home'),a=q('.app'),v=document.getElementById('ai-video-gift-page');if(v)v.style.display='none';if(h)h.style.display='none';if(a)a.style.display='block';try{if(window.WebApp&&window.WebApp.BackButton&&window.WebApp.BackButton.show)window.WebApp.BackButton.show();if(window.WebApp&&window.WebApp.BackButton&&window.WebApp.BackButton.onClick)window.WebApp.BackButton.onClick(home)}catch(e){}window.scrollTo(0,0)}
 function overlay(){var el=document.getElementById('ai-nav-v2');if(el)return el;el=document.createElement('div');el.id='ai-nav-v2';el.innerHTML='<div class="core"></div><div class="ring"></div><div class="title"></div><div class="sub"></div>';document.body.appendChild(el);return el}
 function go(title,sub,done){var el=overlay();el.querySelector('.title').textContent=title;el.querySelector('.sub').textContent=sub;el.classList.remove('out','on');void el.offsetWidth;el.classList.add('on');setTimeout(done,1750);setTimeout(function(){el.classList.add('out')},2550);setTimeout(function(){el.classList.remove('on','out')},3400)}
 var CHARACTER_DATA=[
  {id:'homeless',title:'Бомж-поздравитель',description:'Харизматичный, смешной, уличный и по-доброму дерзкий.',image:encodeURI('/assets/video-gifts/characters/бомж поздравитель.jpg')},
  {id:'baby-boss',title:'Босс-малокосос',description:'Серьёзный малыш-босс в большом кресле руководителя.',image:encodeURI('/assets/video-gifts/characters/босс малокосос поздравитель.jpg')},
  {id:'girl',title:'Молодая девушка',description:'Очень привлекательная, современная, обаятельная и игривая.',image:encodeURI('/assets/video-gifts/characters/девушка поздравитель.jpg')},
  {id:'grandpa',title:'Старенький дедушка',description:'Тёплый, мудрый, добрый и немного юморной.',image:encodeURI('/assets/video-gifts/characters/дедушка поздравитель.jpg')},
  {id:'agent',title:'Тайный агент',description:'Серьёзный спецагент с сухим юмором и спокойной подачей.',image:encodeURI('/assets/video-gifts/characters/агент поздравитель.jpg')},
  {id:'host',title:'Эстрадный ведущий',description:'Энергичный, харизматичный ведущий яркого шоу.',image:encodeURI('/assets/video-gifts/characters/ведущий поздравитель.jpg')}
 ];
 function syncCharacterPrompt(form){
  var id=((form.querySelector('#vf-character')||{}).value||'homeless').trim();
  var recipient=((form.querySelector('#vf-recipient')||{}).value||'').trim();
  var occasion=((form.querySelector('#vf-occasion')||{}).value||'').trim();
  var wishes=((form.querySelector('#vf-wishes')||{}).value||'').trim();
  var character=(CHARACTER_DATA.find(function(x){return x.id===id})||CHARACTER_DATA[0]).title;
  var prompt=form.querySelector('#vf-prompt');
  if(!prompt)return;
  if(!recipient||!occasion){prompt.value='';return;}
  prompt.value=['Персонаж: '+character+'.','Поздравить: '+recipient+'.','Повод: '+occasion+'.','Пожелания: '+(wishes||'здоровья, счастья, удачи и отличного настроения')+'.','Соблюдать фиксированный мир, характер, образ и манеру речи выбранного персонажа.'].join(' ');
 }
 function characterSheet(){
  var legacy=document.getElementById('ai-video-sheet');if(legacy)legacy.remove();
  var s=document.getElementById('ai-video-flow-sheet');
  if(!s){
   s=document.createElement('div');s.id='ai-video-flow-sheet';
   s.innerHTML='<div class="box"><div class="head"><h3>Поздравление от персонажа</h3><button class="close" type="button">×</button></div><p class="lead">Выберите одного из шести персонажей и укажите только имя, повод и пожелания.</p><div class="form"></div><div class="summary">15 секунд · вертикальное видео 9:16 · 327 ₽</div><button class="submit" type="button">Создать видео — 327 ₽</button></div>';
   document.body.appendChild(s);
   s.addEventListener('click',function(e){if(e.target===s)s.classList.remove('open')});
   s.querySelector('.close').onclick=function(){s.classList.remove('open')};
  }
  var form=s.querySelector('.form');
  form.innerHTML='<div class="field"><span class="ai-char-label">Выберите персонажа</span><div class="character-catalog"></div></div>'+
   '<div class="field"><span class="ai-char-label">Кого поздравить?</span><input id="vf-recipient" type="text" maxlength="120" placeholder="Например: Иван"></div>'+
   '<div class="field"><span class="ai-char-label">С чем поздравить?</span><input id="vf-occasion" type="text" maxlength="160" placeholder="Например: день рождения, 30 лет"></div>'+
   '<div class="field"><span class="ai-char-label">Что пожелать?</span><textarea id="vf-wishes" maxlength="900" placeholder="Например: здоровья, денег, удачи и больше ярких моментов."></textarea></div>'+
   '<p class="character-form-note">У каждого героя свой фиксированный мир, внешний вид, характер и профессиональная манера поздравления.</p>'+
   '<input id="vf-prompt" type="hidden"><input id="vf-character" type="hidden" value="homeless"><input id="vf-location" type="hidden" value="fixed">';
  var catalog=form.querySelector('.character-catalog');
  catalog.innerHTML=CHARACTER_DATA.map(function(c,i){return '<button class="character-card'+(i===0?' active':'')+'" type="button" data-character-id="'+c.id+'"><div class="character-image" style="background-image:url(\\''+c.image+'\\')"></div><span class="character-check">✓</span><div class="character-card-copy"><span class="character-card-title">'+c.title+'</span><span class="character-card-description">'+c.description+'</span></div></button>'}).join('');
  catalog.addEventListener('click',function(e){var card=e.target.closest('.character-card');if(!card)return;form.querySelector('#vf-character').value=card.dataset.characterId;catalog.querySelectorAll('.character-card').forEach(function(x){x.classList.remove('active')});card.classList.add('active');syncCharacterPrompt(form)});
  ['#vf-recipient','#vf-occasion','#vf-wishes'].forEach(function(sel){form.querySelector(sel).addEventListener('input',function(){syncCharacterPrompt(form)})});
  syncCharacterPrompt(form);s.dataset.type='character';s.classList.add('open');
 }
 function sheet(type){
  if(type==='character'){characterSheet();return;}
  var s=document.getElementById('ai-video-sheet');if(!s){s=document.createElement('div');s.id='ai-video-sheet';s.innerHTML='<div class="sheet"><div class="head"><h3></h3><button class="close" type="button">×</button></div><p></p><input class="file" type="file" accept="image/*" multiple><textarea placeholder=""></textarea><div class="actions"><button class="save" type="button">Сохранить</button><button class="primary" type="button">Подготовить</button></div><div class="result"></div></div>';document.body.appendChild(s);s.querySelector('.close').onclick=function(){s.classList.remove('open')};s.addEventListener('click',function(e){if(e.target===s)s.classList.remove('open')})}var titles={photos:'Видео из фотографий',singing:'Поющее фото'};var desc={photos:'Загрузите несколько фото и задайте настроение ролика. Подготовленные материалы сохраняются на экране до подключения AI-рендера.',singing:'Выберите портрет и напишите, что должен сказать или спеть герой. Это уже готовая основа будущего видео.'};s.querySelector('h3').textContent=titles[type];s.querySelector('p').textContent=desc[type];s.dataset.type=type;s.querySelector('.file').style.display='block';s.querySelector('textarea').placeholder=type==='photos'?'Например: семейная история, 30 секунд, тепло и красиво':'Например: поздравь Анну с юбилеем и спой короткий припев';s.querySelector('.result').style.display='none';s.classList.add('open');var input=s.querySelector('.file');input.onchange=function(){if(!input.files.length)return;s.querySelector('.result').textContent='Выбрано материалов: '+input.files.length+'. Можно переходить к подготовке заказа.';s.querySelector('.result').style.display='block'};s.querySelector('.primary').onclick=function(){var text=type==='photos'?'Материалы готовы к сборке ролика.':'Портрет и сценарий готовы к оживлению.';s.querySelector('.result').textContent=text+' Финальный AI-рендер будет подключён следующим этапом.';s.querySelector('.result').style.display='block'}}
 function video(){if(document.getElementById('ai-video-gift-page'))return;var el=document.createElement('section');el.id='ai-video-gift-page';el.innerHTML='<div class="wrap"><div class="top"><h1>Видео в подарок</h1><span class="badge">AI Video</span></div><section class="hero"><h2>Сохраните эмоцию в движении</h2><p>Подготовьте материалы, сценарий и персональный подарок в современном AI-формате.</p></section><div class="tools"><button class="tool" data-type="photos" type="button"><div class="art photo"><div class="orb">📸</div></div><div class="body"><span class="status">Подготовить</span><div class="name">Видео из фотографий</div><div class="desc">История из фото с музыкой, титрами и плавными переходами.</div><div class="link"><span>Загрузить фото</span><span class="arrow">→</span></div></div></button><button class="tool" data-type="singing" type="button"><div class="art sing"><div class="orb">🎤</div></div><div class="body"><span class="status">Подготовить</span><div class="name">Поющее фото</div><div class="desc">Оживление портрета с текстом, речью или песней.</div><div class="link"><span>Выбрать фото</span><span class="arrow">→</span></div></div></button><button class="tool" data-type="character" type="button"><div class="art character"><div class="orb">🎭</div></div><div class="body"><span class="status">Подготовить</span><div class="name">Поздравление от персонажа</div><div class="desc">Получатель, сценарий и образ — в одном заказе.</div><div class="link"><span>Создать поздравление</span><span class="arrow">→</span></div></div></button></div><section class="how"><h3>Как это работает</h3><div class="steps"><div class="step"><b>1. Материалы</b><span>Фото, текст или идея</span></div><div class="step"><b>2. Сценарий</b><span>Настраиваем настроение</span></div><div class="step"><b>3. Рендер</b><span>AI собирает подарок</span></div></div></section></div>';document.body.appendChild(el);el.querySelectorAll('.tool').forEach(function(b){b.onclick=function(){sheet(b.dataset.type)}})}
 function click(e){var c=e.target&&e.target.closest?e.target.closest('#ai-home-song,#ai-home-video'):null;if(!c)return;e.preventDefault();e.stopImmediatePropagation();if(c.id==='ai-home-song')go('Песня в подарок','AI Music',song);else go('Видео в подарок','AI Video',function(){video();var h=document.getElementById('ai-gifts-home'),a=q('.app'),v=document.getElementById('ai-video-gift-page');if(h)h.style.display='none';if(a)a.style.display='none';if(v)v.style.display='block';try{if(window.WebApp&&window.WebApp.BackButton&&window.WebApp.BackButton.show)window.WebApp.BackButton.show();if(window.WebApp&&window.WebApp.BackButton&&window.WebApp.BackButton.onClick)window.WebApp.BackButton.onClick(home)}catch(x){}window.scrollTo(0,0)})}
 function start(){video();document.addEventListener('click',click,true)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();</script>`;
function inject(body){if(typeof body!=='string'||!body.includes('<body')||body.includes('ai-navigation-v2-style'))return body;var m='</body>',i=body.toLowerCase().lastIndexOf(m);if(i<0)return body;return body.slice(0,i)+css+'\n'+script+'\n'+body.slice(i)}
express.response.sendFile=function(filePath,...args){var n=typeof filePath==='string'?filePath.replace(/\\/g,'/').toLowerCase():'';if(!(n.endsWith('/index.html')||n==='index.html'))return originalSendFile.call(this,filePath,...args);var r=this,s=r.send;r.send=function(body){try{return s.call(this,inject(body))}catch(e){console.error('[AI NAV V2]',e.message);return s.call(this,body)}};try{return originalSendFile.call(this,filePath,...args)}finally{r.send=s}};
console.log('[AI NAVIGATION V2] module loaded');
