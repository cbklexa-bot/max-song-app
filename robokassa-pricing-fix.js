const express = require('express');

const originalSend = express.response.send;

const clientPatch = `
<style id="robokassa-pricing-fix-style">
.amount-right{display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:2px}
.amount-left small{display:none!important}
.bonus-side{margin:0!important;padding:0!important;background:none!important;border:0!important;font-size:7px!important;font-weight:900!important;color:#ffd577!important}
.bonus-orange{color:#ff9d3b!important}
</style>
<script id="robokassa-pricing-fix-client">
(function(){
  function plans(){
    return {200:{total:200,bonus:'',bonusText:'Без бонуса'},400:{total:420,bonus:'+5% бонус',bonusText:'При пополнении +5%'},800:{total:880,bonus:'+10% бонус',bonusText:'При пополнении +10%'}};
  }
  function fixPlans(){
    var map=plans();
    document.querySelectorAll('.amount').forEach(function(el){
      var amount=Number(el.dataset.amount||0);
      var normalized=amount===700?800:amount;
      if(!map[normalized])return;
      el.dataset.amount=String(normalized);
      var strong=el.querySelector('.amount-left strong');
      var small=el.querySelector('.amount-left small');
      var right=el.querySelector('.amount-right');
      if(strong)strong.textContent=normalized+' ₽';
      if(small)small.textContent='';
      if(right){
        if(normalized===200) right.innerHTML='200 ₽';
        if(normalized===400) right.innerHTML='420 ₽ <span class="bonus bonus-side">+5% бонус</span>';
        if(normalized===800) right.innerHTML='880 ₽ <span class="bonus bonus-side bonus-orange">+10% бонус</span>';
      }
    });
    fixCredit();
  }
  function fixCredit(){
    var selected=document.querySelector('.amount.selected');
    var value=selected?Number(selected.dataset.amount||0):0;
    if(value===700)value=800;
    var credit=document.querySelector('.credit-value');
    if(!credit)return;
    credit.textContent=(value===200?'200 ₽':value===400?'420 ₽':value===800?'880 ₽':'200 ₽');
  }
  function install(){
    fixPlans();
    document.addEventListener('click',function(e){
      var amount=e.target.closest&&e.target.closest('.amount');
      if(amount)setTimeout(function(){fixPlans();fixCredit()},30);
    },true);
    setTimeout(fixPlans,100);
    setTimeout(fixPlans,400);
    setTimeout(fixPlans,1000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
</script>`;

express.response.send = function pricingUiSend(body) {
  try {
    if (typeof body === 'string' && body.includes('</body>') && body.includes('test-topup') && !body.includes('robokassa-pricing-fix-client')) {
      body = body.replace('</body>', clientPatch + '</body>');
    }
  } catch (error) {
    console.error('[ROBOKASSA PRICING FIX] client inject failed', error.message);
  }
  return originalSend.call(this, body);
};

console.log('[ROBOKASSA PRICING FIX] UI math 200/400(+5%)/800(+10%) active');
