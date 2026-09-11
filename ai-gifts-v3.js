const express = require('express');
const originalSendFile = express.response.sendFile;

const css = `<style id="ai-gifts-v3-style">
@keyframes v3Glow{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:1;transform:scale(1.04)}}
@keyframes v3Float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes v3Shine{0%,58%{transform:translateX(-150%)}74%,100%{transform:translateX(150%)}}
@keyframes v3Eq{0%,100%{height:20%}50%{height:80%}}
body.ai-gifts-song-v3{background:radial-gradient(560px 300px at 50% -90px,rgba(151,83,255,.30),transparent 70%),radial-gradient(420px 300px at 100% 34%,rgba(239,65,164,.10),transparent 72%),linear-gradient(180deg,#080611 0%,#0d0816 58%,#08060f 100%)}
body.ai-gifts-song-v3 .app{animation:fadeIn .48s ease both}
body.ai-gifts-song-v3 .header{border-radius:22px;background:linear-gradient(145deg,rgba(43,23,68,.98),rgba(14,8,24,.98));box-shadow:0 18px 50px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.06)}
body.ai-gifts-song-v3 .hero{border-radius:26px;background:linear-gradient(145deg,rgba(54,29,83,.98),rgba(16,9,28,.98));box-shadow:0 22px 56px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.05)}
body.ai-gifts-song-v3 .card{border-radius:25px;background:linear-gradient(145deg,rgba(30,17,46,.97),rgba(12,7,20,.99));box-shadow:0 20px 54px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.045)}
body.ai-gifts-song-v3 .section-label{font-size:12px;font-weight:950}
body.ai-gifts-song-v3 .section-number{width:24px;height:24px;border-radius:8px;background:linear-gradient(135deg,rgba(145,72,255,.24),rgba(239,61,154,.12));box-shadow:0 6px 16px rgba(145,72,255,.12)}
body.ai-gifts-song-v3 .choice{min-height:52px;border-radius:16px;background:linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.012));transition:transform .16s ease,box-shadow .18s ease,border-color .18s ease}
body.ai-gifts-song-v3 .choice:active{transform:scale(.97)}
body.ai-gifts-song-v3 .choice.selected{background:linear-gradient(145deg,rgba(145,72,255,.42),rgba(239,61,154,.16));border-color:rgba(198,128,255,.62);box-shadow:0 12px 28px rgba(124,63,207,.16),inset 0 1px 0 rgba(255,255,255,.08)}
body.ai-gifts-song-v3 .prompt{border-radius:18px;background:linear-gradient(160deg,rgba(5,3,11,.72),rgba(20,10,31,.68));box-shadow:inset 0 1px 0 rgba(255,255,255,.03)}
body.ai-gifts-song-v3 .generate{border-radius:18px;box-shadow:0 17px 38px rgba(145,72,255,.28),inset 0 1px 0 rgba(255,255,255,.14);overflow:hidden}
body.ai-gifts-song-v3 .generate:after{content:"";position:absolute;top:0;bottom:0;width:90px;left:-110px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);transform:skewX(-18deg);animation:v3Shine 3.8s ease-in-out infinite}
body.ai-gifts-song-v3 .orders-head{position:relative;padding:14px 15px;margin-bottom:11px;border-radius:20px;background:linear-gradient(145deg,rgba(39,21,59,.98),rgba(12,7,20,.98));border:1px solid rgba(255,255,255,.09);box-shadow:0 16px 42px rgba(0,0,0,.27)}
body.ai-gifts-song-v3 .orders-head:before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:4px;border-radius:4px;background:linear-gradient(180deg,#bd73ff,#ef4aa5);animation:v3Glow 2.6s ease-in-out infinite}
body.ai-gifts-song-v3 .orders-title{font-size:16px;font-weight:950;letter-spacing:-.02em}
body.ai-gifts-song-v3 .orders-count{padding:6px 9px;border-radius:999px;background:linear-gradient(135deg,rgba(145,72,255,.22),rgba(239,61,154,.10));border-color:rgba(192,112,255,.22)}
body.ai-gifts-song-v3 .order{border-radius:20px;background:linear-gradient(145deg,rgba(28,17,43,.98),rgba(10,6,15,.99));border-color:rgba(255,255,255,.075);box-shadow:0 17px 44px rgba(0,0,0,.26),inset 0 1px 0 rgba(255,255,255,.04)}
body.ai-gifts-song-v3 .order-icon{width:48px;height:48px;flex-basis:48px;border-radius:16px;animation:v3Glow 3.5s ease-in-out infinite}
body.ai-gifts-song-v3 .variant{padding:12px;border-radius:17px;background:linear-gradient(145deg,rgba(255,255,255,.04),rgba(255,255,255,.012));border-color:rgba(255,255,255,.065)}
body.ai-gifts-song-v3 .completed-player{padding:9px;border-radius:16px;background:rgba(3,2,7,.35);border:1px solid rgba(255,255,255,.045)}
body.ai-gifts-song-v3 audio{height:43px;filter:drop-shadow(0 8px 16px rgba(0,0,0,.22))}
body.ai-gifts-song-v3 .actions{gap:8px;margin-top:10px}
body.ai-gifts-song-v3 .action{position:relative;overflow:hidden;min-height:47px;border-radius:14px;font-size:9px;font-weight:950;transition:transform .16s ease,box-shadow .18s ease}
body.ai-gifts-song-v3 .action:active{transform:scale(.97)}
body.ai-gifts-song-v3 .action.primary{background:linear-gradient(145deg,rgba(127,58,205,.32),rgba(48,22,75,.72));border-color:rgba(192,112,255,.24);box-shadow:0 11px 26px rgba(105,52,168,.13)}
body.ai-gifts-song-v3 .action:not(.primary){background:linear-gradient(145deg,rgba(23,133,104,.18),rgba(7,36,30,.46));border-color:rgba(91,218,183,.17);box-shadow:0 11px 26px rgba(24,201,150,.09)}
body.ai-gifts-song-v3 .action:after{content:"";position:absolute;top:0;bottom:0;width:75px;left:-95px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.14),transparent);transform:skewX(-18deg);animation:v3Shine 5s ease-in-out infinite}
body.ai-gifts-song-v3 .unlock{min-height:46px;border-radius:14px;background:linear-gradient(100deg,#0d9b77,#2bd1a6);box-shadow:0 10px 25px rgba(24,201,150,.13)}
/* Video scenes: replace plain emoji with rich mini-posters. */
#ai-video-gift-page .orb{display:none}
#ai-video-gift-page .scene{position:relative;width:108px;height:92px;border-radius:24px;overflow:hidden;border:1px solid rgba(255,255,255,.20);box-shadow:0 18px 34px rgba(0,0,0,.30);animation:v3Float 3.8s ease-in-out infinite}
#ai-video-gift-page .scene:before,#ai-video-gift-page .scene:after{content:"";position:absolute;pointer-events:none}
#ai-video-gift-page .scene.photo-scene{background:linear-gradient(160deg,#6abde9 0%,#244c72 47%,#0c1727 100%)}
#ai-video-gift-page .photo-scene:before{width:70px;height:52px;right:8px;top:10px;border-radius:8px;background:linear-gradient(145deg,#d8f3ff,#8cc8e8);box-shadow:0 0 0 2px rgba(255,255,255,.20),0 12px 25px rgba(0,0,0,.20);transform:rotate(7deg)}
#ai-video-gift-page .photo-scene:after{width:68px;height:50px;left:10px;bottom:10px;border-radius:8px;background:linear-gradient(145deg,#f2c7af,#8c5c48);box-shadow:0 0 0 2px rgba(255,255,255,.18),0 12px 24px rgba(0,0,0,.20);transform:rotate(-8deg)}
#ai-video-gift-page .scene-center{position:absolute;left:50%;top:50%;width:30px;height:30px;transform:translate(-50%,-50%);border-radius:50%;background:rgba(255,255,255,.20);border:1px solid rgba(255,255,255,.36);backdrop-filter:blur(5px);z-index:3}
#ai-video-gift-page .scene-center:before{content:"▶";position:absolute;left:50%;top:50%;transform:translate(-45%,-50%);color:#fff;font-size:12px}
#ai-video-gift-page .scene.singer-scene{background:radial-gradient(circle at 55% 34%,rgba(248,182,255,.30),transparent 22%),linear-gradient(160deg,#623278 0%,#2e173b 52%,#100b18 100%)}
#ai-video-gift-page .singer-head{position:absolute;width:24px;height:24px;left:44px;top:16px;border-radius:50%;background:linear-gradient(145deg,#f2c0ad,#ad6e63);z-index:2}
#ai-video-gift-page .singer-body{position:absolute;width:48px;height:44px;left:32px;top:37px;border-radius:18px 18px 10px 10px;background:linear-gradient(145deg,#eac8f4,#8b4fa8);z-index:2}
#ai-video-gift-page .mic-line{position:absolute;width:3px;height:40px;left:74px;top:28px;background:#dbe8ef;border-radius:3px;transform:rotate(-12deg);z-index:3}
#ai-video-gift-page .mic-head{position:absolute;width:14px;height:20px;left:69px;top:18px;border-radius:8px;background:linear-gradient(145deg,#f5f9ff,#7b8798);z-index:3;box-shadow:0 5px 13px rgba(0,0,0,.25)}
#ai-video-gift-page .sing-bars{position:absolute;left:8px;right:8px;bottom:7px;height:16px;display:flex;align-items:flex-end;gap:3px;z-index:4}.sing-bars i{display:block;width:3px;background:rgba(255,255,255,.66);border-radius:3px;animation:v3Eq 1.1s ease-in-out infinite}.sing-bars i:nth-child(2){animation-delay:.14s}.sing-bars i:nth-child(3){animation-delay:.28s}.sing-bars i:nth-child(4){animation-delay:.42s}.sing-bars i:nth-child(5){animation-delay:.18s}.sing-bars i:nth-child(6){animation-delay:.33s}
#ai-video-gift-page .scene.character-scene{background:linear-gradient(160deg,#e68ca0 0%,#8d3d68 47%,#201020 100%)}
#ai-video-gift-page .character-face{position:absolute;width:40px;height:48px;left:34px;top:19px;border-radius:48% 48% 42% 42%;background:linear-gradient(145deg,#ffd1bc,#ae675d);z-index:2;box-shadow:0 8px 18px rgba(0,0,0,.20)}
#ai-video-gift-page .character-hair{position:absolute;width:50px;height:30px;left:29px;top:14px;border-radius:50% 50% 38% 38%;background:linear-gradient(145deg,#3d233f,#120c18);z-index:3}
#ai-video-gift-page .character-hair:after{content:"";position:absolute;right:-4px;top:10px;width:14px;height:32px;border-radius:0 12px 14px 0;background:#241327}
#ai-video-gift-page .character-card{position:absolute;left:12px;bottom:10px;right:12px;height:23px;border-radius:11px;background:rgba(4,2,10,.34);border:1px solid rgba(255,255,255,.20);z-index:4;display:grid;place-items:center;color:#fff;font-size:7px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
@media(max-width:390px){#ai-video-gift-page .scene{width:88px;height:78px}#ai-video-gift-page .singer-head{left:35px}#ai-video-gift-page .singer-body{left:26px}.mic-line{left:60px!important}.mic-head{left:56px!important}#ai-video-gift-page .character-face{left:25px}#ai-video-gift-page .character-hair{left:20px}}
</style>`;

const script = `<script id="ai-gifts-v3-script">
(function(){
 if(window.__AI_GIFTS_V3__)return;window.__AI_GIFTS_V3__=true;
 function qs(s){return document.querySelector(s)}
 function songMode(){var h=qs('#ai-gifts-home'),a=qs('.app');var active=a&&getComputedStyle(a).display!=='none'&&(!h||getComputedStyle(h).display==='none');if(active)document.body.classList.add('ai-gifts-song-v3');else document.body.classList.remove('ai-gifts-song-v3')}
 function scenes(){var p=qs('#ai-video-gift-page');if(!p||p.dataset.v3Scenes==='1')return;if(p.querySelector('.photo .orb')){p.querySelector('.photo .orb').outerHTML='<div class="scene photo-scene"><div class="scene-center"></div></div>'}if(p.querySelector('.sing .orb')){p.querySelector('.sing .orb').outerHTML='<div class="scene singer-scene"><div class="singer-head"></div><div class="singer-body"></div><div class="mic-line"></div><div class="mic-head"></div><div class="sing-bars"><i></i><i></i><i></i><i></i><i></i><i></i></div></div>'}if(p.querySelector('.character .orb')){p.querySelector('.character .orb').outerHTML='<div class="scene character-scene"><div class="character-hair"></div><div class="character-face"></div><div class="character-card">AI character</div></div>'}p.dataset.v3Scenes='1'}
 function watch(){songMode();scenes()}
 function start(){watch();var mo=new MutationObserver(function(){watch()});mo.observe(document.body,{subtree:true,childList:true});window.addEventListener('resize',watch);setInterval(watch,650)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
</script>`;

function inject(body){if(typeof body!=='string'||!body.includes('<body')||body.includes('ai-gifts-v3-style'))return body;var m='</body>',i=body.toLowerCase().lastIndexOf(m);if(i<0)return body;return body.slice(0,i)+css+'\n'+script+'\n'+body.slice(i)}

express.response.sendFile=function(filePath,...args){var n=typeof filePath==='string'?filePath.replace(/\\/g,'/').toLowerCase():'';if(!(n.endsWith('/index.html')||n==='index.html'))return originalSendFile.call(this,filePath,...args);var r=this,s=r.send;r.send=function(body){try{return s.call(this,inject(body))}catch(e){console.error('[AI GIFTS V3]',e.message);return s.call(this,body)}};try{return originalSendFile.call(this,filePath,...args)}finally{r.send=s}};
console.log('[AI GIFTS V3] module loaded');
