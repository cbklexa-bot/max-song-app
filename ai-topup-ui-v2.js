const express = require('express');

const originalSendFile = express.response.sendFile;

const css = `<style id="ai-topup-v2-style">
#topup-modal .amounts{grid-template-columns:1fr}
#topup-modal .amount.ai-topup-featured{border-color:rgba(145,72,255,.28);background:linear-gradient(135deg,rgba(145,72,255,.08),rgba(255,255,255,.025))}
#topup-modal .amount .bonus{color:#ffd577}
</style>`;

const script = `<script id="ai-topup-v2-script">
(function(){
  if(window.__AI_TOPUP_V2__)return;
  window.__AI_TOPUP_V2__=true;

  var plans={
    100:{bonus:0,credit:100,label:'Для небольшого пополнения'},
    200:{bonus:0,credit:200,label:'1 песня или часть баланса'},
    300:{bonus:5,credit:315,label:'Бонус +15 ₽'},
    400:{bonus:10,credit:440,label:'Бонус +40 ₽'},
    500:{bonus:15,credit:575,label:'Максимальный бонус +75 ₽'}
  };

  function render(){
    var modal=document.getElementById('topup-modal');
    if(!modal)return false;
    var amounts=modal.querySelector('.amounts');
    var credit=modal.querySelector('#credit-value');
    if(!amounts||!credit)return false;

    var current=Number(window.selectedTopupAmount||200);
    if(!plans[current])current=200;
    amounts.innerHTML=Object.keys(plans).map(function(key){
      var amount=Number(key),p=plans[amount];
      return '<button class="amount'+(amount===current?' selected':'')+(amount===500?' ai-topup-featured':'')+'" data-amount="'+amount+'" type="button">'
        +'<span class="amount-left"><strong>'+amount+' ₽'+(p.bonus?' <span class="bonus">+'+p.bonus+'%</span>':'')+'</strong><small>'+p.label+'</small></span>'
        +'<span class="amount-right">'+p.credit+' ₽</span></button>';
    }).join('');

    window.selectedTopupAmount=current;
    credit.textContent=plans[current].credit+' ₽';

    window.selectTopup=function(amount,button){
      var value=Number(amount);
      if(!plans[value])return;
      window.selectedTopupAmount=value;
      amounts.querySelectorAll('.amount').forEach(function(item){item.classList.remove('selected')});
      if(button)button.classList.add('selected');
      credit.textContent=plans[value].credit+' ₽';
    };

    amounts.querySelectorAll('.amount').forEach(function(button){
      button.addEventListener('click',function(){window.selectTopup(Number(button.dataset.amount),button)});
    });

    var description=modal.querySelector('.topup-description');
    if(description)description.textContent='Пополнение баланса: 100, 200, 300, 400 или 500 ₽. Бонусы действуют для 300, 400 и 500 ₽.';
    return true;
  }

  function boot(){
    if(render())return;
    setTimeout(render,300);setTimeout(render,1000);setTimeout(render,2000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
</script>`;

function inject(body){
  if(typeof body!=='string'||!body.includes('<body'))return body;
  if(body.includes('ai-topup-v2-script'))return body;
  return body.replace(/<\/body>/i,css+'\n'+script+'\n</body>');
}

express.response.sendFile=function patchedSendFile(filePath,...args){
  var isIndex=typeof filePath==='string'&&/(?:^|[\\/])index\.html$/i.test(filePath);
  if(!isIndex)return originalSendFile.call(this,filePath,...args);
  var response=this,originalSend=response.send;
  response.send=function aiTopupSend(body){return originalSend.call(this,inject(body))};
  try{return originalSendFile.call(this,filePath,...args)}finally{response.send=originalSend}
};

console.log('[AI TOPUP V2] module loaded');
