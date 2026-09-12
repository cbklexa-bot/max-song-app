const express = require('express');

// Product layer: only two video products are exposed in the existing MAX Mini App.
// 1) Singing photo
// 2) Character congratulations — one fixed comedic street character.

const originalPost = express.application.post;

express.application.post = function patchedPost(pathname, ...handlers) {
  if (pathname === '/api/video/generate' && handlers.length) {
    const handler = handlers.pop();
    const wrapped = function productVideoGenerate(req, res, next) {
      if (req.body && req.body.type === 'photos') {
        return res.status(400).json({
          ok: false,
          error: 'Видео из фотографий больше не доступно. Доступны: «Поющее фото» и «Поздравление от персонажа».'
        });
      }
      return handler(req, res, next);
    };
    return originalPost.call(this, pathname, ...handlers, wrapped);
  }
  return originalPost.call(this, pathname, ...handlers);
};

const originalSend = express.response.send;

const style = `<style id="ai-video-product-v2-style">
/* Убираем неудачный формат «Видео из фотографий». */
#ai-video-gift-page .tool[data-type="photos"]{display:none !important}

/* Делаем «Поздравление от персонажа» отдельным узнаваемым продуктом. */
#ai-video-gift-page .tool[data-type="character"] .art.character{
  background-image:linear-gradient(180deg,rgba(0,0,0,.10),rgba(0,0,0,.42)),url("/assets/video-gifts/поздоавление%20от%20персанажа.jpg");
  background-size:cover;
  background-position:center;
}
#ai-video-gift-page .tool[data-type="character"] .orb{display:none}
#ai-video-gift-page .tool[data-type="character"] .status{color:#ffd2dd;background:rgba(255,119,159,.10);border-color:rgba(255,119,159,.18)}
#ai-video-gift-page .tool[data-type="character"] .link{color:#ffc3d5}

/* Только один персонаж — шуточный уличный поздравитель. */
#ai-video-flow-sheet .chars .char:not([data-char="homeless"]){display:none !important}
#ai-video-flow-sheet .chars .char[data-char="homeless"]{
  grid-column:1 / -1;
  min-height:120px;
}
</style>`;

const script = `<script id="ai-video-product-v2-script">
(function(){
  if(window.__AI_VIDEO_PRODUCT_V2__)return;
  window.__AI_VIDEO_PRODUCT_V2__=true;

  function setCharacterCardCopy(){
    var card=document.querySelector('#ai-video-gift-page .tool[data-type="character"]');
    if(!card)return;
    var name=card.querySelector('.name');
    var desc=card.querySelector('.desc');
    var link=card.querySelector('.link');
    if(name)name.textContent='Поздравление от персонажа';
    if(desc)desc.textContent='Шуточное поздравление от бездомного героя на улице — дерзко, смешно и по-доброму.';
    if(link)link.firstChild && (link.firstChild.textContent='Создать поздравление');
  }

  function simplifyCharacterSheet(){
    var sheet=document.getElementById('ai-video-flow-sheet');
    if(!sheet || sheet.dataset.type!=='character')return;

    var chars=sheet.querySelector('.chars');
    if(chars){
      chars.querySelectorAll('.char').forEach(function(item){
        if(item.dataset.char!=='homeless')item.remove();
      });
      var hero=chars.querySelector('.char[data-char="homeless"]');
      if(hero){
        var title=hero.querySelector('b');
        var text=hero.querySelector('span');
        if(title)title.textContent='Бомж-поздравитель';
        if(text)text.textContent='Шуточный уличный герой: немного ободранный, харизматичный и максимально нелепый.';
        hero.classList.add('active');
      }
    }

    var lead=sheet.querySelector('.lead');
    if(lead)lead.textContent='Здесь один персонаж: шуточный бездомный поздравитель на улице. Укажите имя друга, повод и пожелания — AI построит короткую комедийную сценку.';

    var prompt=sheet.querySelector('#vf-prompt');
    if(prompt)prompt.placeholder='Например: поздравить Серёгу с 30-летием. Два бездомных героя во дворе шумно поздравляют его, шутят, кричат «А, брат, с днюхой!», желают денег, здоровья и удачи. Без оскорблений и без жёсткой брани.';

    var summary=sheet.querySelector('.summary');
    if(summary)summary.textContent='15 секунд · 720p · шуточный «бомж-поздравитель» · естественная русская речь';
  }

  function bind(){
    var page=document.getElementById('ai-video-gift-page');
    if(!page || page.dataset.aiProductV2Bound==='1')return;
    page.dataset.aiProductV2Bound='1';
    setCharacterCardCopy();

    page.addEventListener('click',function(event){
      var tool=event.target.closest('.tool');
      if(!tool)return;
      var type=tool.dataset.type;
      if(type==='photos'){
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if(type==='character'){
        setTimeout(simplifyCharacterSheet,0);
        setTimeout(simplifyCharacterSheet,50);
      }
    },false);
  }

  function start(){
    bind();
    setTimeout(setCharacterCardCopy,300);
    setTimeout(setCharacterCardCopy,1000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
</script>`;

function inject(body){
  if(typeof body!=='string'||!body.includes('<body'))return body;
  if(body.includes('ai-video-product-v2-script'))return body;
  return body.replace(/<\/body>/i,style+'\n'+script+'\n</body>');
}

express.response.send = function patchedSend(body){
  return originalSend.call(this, inject(body));
};

console.log('[AI VIDEO PRODUCT V2] only singing + character products enabled');
