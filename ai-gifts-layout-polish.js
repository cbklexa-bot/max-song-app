const express = require('express');

const originalSend = express.response.send;

const injection = `
<style id="ai-gifts-layout-final-style">
#ai-gifts-home .ai-home-top,#ai-gifts-home .ai-home-hero{display:none!important}
#ai-gifts-home{min-height:100vh!important;padding:4px 9px 14px!important}
#ai-gifts-home .wrap{width:100%!important;max-width:560px!important;margin:0 auto!important}
#ai-gifts-home .ai-home-account{margin:0 0 10px!important}

/* Main gift cards */
#ai-gifts-home .home-types{display:grid!important;grid-template-columns:1fr 1fr!important;gap:9px!important;margin:0 0 12px!important}
#ai-gifts-home .home-types .home-card.ai-gift-home-final{position:relative!important;display:block!important;width:100%!important;height:clamp(270px,44vh,390px)!important;min-height:270px!important;padding:0!important;overflow:hidden!important;border-radius:24px!important;background:#0b0711!important;cursor:pointer!important;border:1px solid rgba(255,255,255,.16)!important;box-shadow:0 18px 52px rgba(0,0,0,.38),0 0 38px rgba(145,72,255,.13)!important}
#ai-gifts-home .home-types .home-card.ai-gift-home-final:nth-child(2){box-shadow:0 18px 52px rgba(0,0,0,.38),0 0 38px rgba(64,180,255,.13)!important}
#ai-gifts-home .ai-gift-final-image{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important;object-position:center!important;display:block!important}
#ai-gifts-home .ai-gift-final-overlay{position:absolute!important;inset:0!important;padding:15px!important;display:flex!important;flex-direction:column!important;justify-content:space-between!important;align-items:flex-start!important;pointer-events:none!important;background:linear-gradient(180deg,rgba(4,2,10,.52) 0%,rgba(4,2,10,0) 38%,rgba(4,2,10,.84) 100%)!important}
#ai-gifts-home .ai-gift-final-title{display:block!important;max-width:90%!important;color:#fff!important;font-size:15px!important;line-height:1.08!important;font-weight:950!important;letter-spacing:-.025em!important;text-shadow:0 3px 18px rgba(0,0,0,.72)!important}
#ai-gifts-home .ai-gift-final-cta{display:flex!important;align-items:center!important;gap:8px!important;color:#fff!important;font-size:12px!important;font-weight:950!important;text-shadow:0 3px 18px rgba(0,0,0,.72)!important}
#ai-gifts-home .ai-gift-final-arrow{width:34px!important;height:34px!important;display:grid!important;place-items:center!important;border-radius:11px!important;background:rgba(10,5,18,.42)!important;border:1px solid rgba(255,255,255,.25)!important;backdrop-filter:blur(10px)!important;font-size:15px!important;font-weight:950!important}

/* Hide the old format heading and the old direction badge */
#ai-gifts-home .home-types+.home-section-head{display:none!important}
#ai-gifts-home .home-section-badge{display:none!important}

/* Showcase / vitrine */
#ai-gifts-home .home-showcase{position:relative!important;margin-top:0!important;margin-bottom:9px!important;padding:14px 10px 10px!important;border-radius:22px!important;min-height:176px!important;overflow:hidden!important}
#ai-gifts-home .home-showcase:before{content:'Примеры готовых работ';display:block!important;margin:0 2px 10px!important;color:#fff!important;font-size:13px!important;font-weight:950!important;letter-spacing:-.02em!important}
#ai-gifts-home .home-marquee-viewport{height:132px!important;overflow:hidden!important;border-radius:16px!important}
#ai-gifts-home .home-marquee{gap:10px!important;height:132px!important;align-items:stretch!important}
#ai-gifts-home .home-sample{width:212px!important;min-height:132px!important;height:132px!important;padding:12px!important;border-radius:18px!important;display:flex!important;align-items:center!important;gap:11px!important}
#ai-gifts-home .home-sample-art{width:68px!important;height:68px!important;flex:0 0 68px!important;border-radius:18px!important;font-size:26px!important}
#ai-gifts-home .home-sample-text strong{font-size:11px!important;line-height:1.2!important}
#ai-gifts-home .home-sample-text span{font-size:7px!important}
#ai-gifts-home .home-sample-text small{font-size:7px!important;line-height:1.25!important}
#ai-gifts-home .home-footer{padding-top:9px!important}

/* 16 character selector for video flow */
#ai-video-flow-sheet .ai-character-final{position:relative!important}
#ai-video-flow-sheet .ai-character-final select{appearance:none!important;-webkit-appearance:none!important;width:100%!important;min-height:50px!important;padding:12px 42px 12px 13px!important;border:1px solid rgba(180,123,255,.30)!important;border-radius:14px!important;background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(145,72,255,.08)),rgba(4,2,8,.55)!important;color:#fff!important;font-size:11px!important;font-weight:900!important;outline:none!important}
#ai-video-flow-sheet .ai-character-final:after{content:"⌄";position:absolute;right:14px;top:15px;pointer-events:none;color:#d5bbff;font-size:17px;font-weight:900}
#ai-video-flow-sheet .ai-character-final-desc{margin-top:7px;padding:8px 10px;border-radius:12px;background:rgba(145,72,255,.06);border:1px solid rgba(180,123,255,.10);color:rgba(255,255,255,.46);font-size:8px;line-height:1.4}

@media(max-width:390px){
  #ai-gifts-home{padding-left:7px!important;padding-right:7px!important}
  #ai-gifts-home .home-types{gap:7px!important}
  #ai-gifts-home .home-types .home-card.ai-gift-home-final{height:clamp(235px,40vh,330px)!important;min-height:235px!important}
  #ai-gifts-home .ai-gift-final-title{font-size:13px!important}
  #ai-gifts-home .ai-gift-final-cta{font-size:10px!important}
  #ai-gifts-home .ai-gift-final-arrow{width:30px!important;height:30px!important;font-size:13px!important}
  #ai-gifts-home .home-showcase{min-height:158px!important;padding-top:12px!important}
  #ai-gifts-home .home-showcase:before{font-size:12px!important;margin-bottom:8px!important}
  #ai-gifts-home .home-marquee-viewport,#ai-gifts-home .home-marquee{height:116px!important}
  #ai-gifts-home .home-sample{width:190px!important;height:116px!important;min-height:116px!important;padding:10px!important}
  #ai-gifts-home .home-sample-art{width:56px!important;height:56px!important;flex-basis:56px!important;font-size:22px!important}
}
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

    var heads=home.querySelectorAll('.home-section-head');
    if(heads[0])heads[0].style.display='none';

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
      img.src=root+encodeURIComponent(def[1]);
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
    var fields=sheet.querySelectorAll('.field');
    for(var i=0;i<fields.length;i++){
      var label=fields[i].querySelector('.label');
      if(!label||!/выберите персонажа/i.test(label.textContent||''))continue;
      var field=fields[i];
      if(field.dataset.aiCharacterFinal==='1')return;

      var old=field.querySelector('.chars');
      var oldButtons=field.querySelectorAll('.char');
      if(!old&&!oldButtons.length)return;

      field.dataset.aiCharacterFinal='1';
      if(old)old.remove();else oldButtons.forEach(function(b){b.remove()});

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
      return;
    }
  }

  function patch(){
    try{patchHome();patchCharacters()}catch(error){console.warn('[AI GIFTS FINAL LAYOUT]',error)}
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
  if(typeof body!=='string'||body.indexOf('ai-gifts-layout-final-script')!==-1||body.indexOf('<html')===-1)return body;
  var at=body.toLowerCase().lastIndexOf('</body>');
  if(at<0)return body;
  return body.slice(0,at)+injection+'\n'+body.slice(at);
}

express.response.send=function patchedSend(body){
  try{body=inject(body)}catch(error){console.error('[AI GIFTS FINAL LAYOUT]',error.message)}
  return originalSend.call(this,body);
};

console.log('[AI GIFTS FINAL LAYOUT] module loaded');
