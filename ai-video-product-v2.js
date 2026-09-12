const express = require('express');

// Product layer: only one video product is exposed in the existing MAX Mini App.
// Character congratulations is the single entry point for video gifts.

const originalPost = express.application.post;

express.application.post = function patchedPost(pathname, ...handlers) {
  if (pathname === '/api/video/generate' && handlers.length) {
    const handler = handlers.pop();
    const wrapped = function productVideoGenerate(req, res, next) {
      if (req.body && (req.body.type === 'photos' || req.body.type === 'singing')) {
        return res.status(400).json({
          ok: false,
          error: 'Этот формат видео больше не доступен. Доступно: «Поздравление от персонажа».'
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
/* В разделе «Видео в подарок» остаётся только «Поздравление от персонажа». */
#ai-video-gift-page .tool[data-type="photos"],
#ai-video-gift-page .tool[data-type="singing"]{display:none !important}

/* Делаем «Поздравление от персонажа» единственной узнаваемой карточкой продукта. */
#ai-video-gift-page .tool[data-type="character"] .art.character{
  background-image:linear-gradient(180deg,rgba(0,0,0,.10),rgba(0,0,0,.42)),url("/assets/video-gifts/поздоавление%20от%20персанажа.jpg");
  background-size:cover;
  background-position:center;
}
#ai-video-gift-page .tool[data-type="character"] .orb{display:none}
#ai-video-gift-page .tool[data-type="character"] .status{color:#ffd2dd;background:rgba(255,119,159,.10);border-color:rgba(255,119,159,.18)}
#ai-video-gift-page .tool[data-type="character"] .link{color:#ffc3d5}
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
    if(desc)desc.textContent='Персональное поздравление от выбранного персонажа — с вашим именем, поводом и пожеланиями.';
    if(link)link.firstChild && (link.firstChild.textContent='Создать поздравление');
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
      if(type==='photos' || type==='singing'){
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
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

console.log('[AI VIDEO PRODUCT V2] only character congratulations product enabled');
