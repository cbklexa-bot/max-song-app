const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const LOGIN = String(process.env.ROBOKASSA_MERCHANT_LOGIN || '').trim();
const PASS1 = String(process.env.ROBOKASSA_PASSWORD1 || '').trim();
const PASS2 = String(process.env.ROBOKASSA_PASSWORD2 || '').trim();
const SUPA = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPAKEY = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '').trim();
const MAXTOKEN = String(process.env.MAX_BOT_TOKEN || '').trim();
const PAYMENT_URL = 'https://auth.robokassa.ru/Merchant/Index.aspx';
const PLANS = Object.freeze({
  200: { amount: 200, bonus: 0, credited: 200 },
  400: { amount: 400, bonus: 20, credited: 420 },
  800: { amount: 800, bonus: 80, credited: 880 }
});
const dbHeaders = { apikey: SUPAKEY, Authorization: 'Bearer ' + SUPAKEY, 'Content-Type': 'application/json', Prefer: 'return=representation' };
function md5(value){return crypto.createHash('md5').update(value,'utf8').digest('hex')}
function decode(value){try{return decodeURIComponent(String(value).replace(/\+/g,'%20'))}catch(_){return String(value)}}
function validateMax(initData){
  if(!MAXTOKEN)throw new Error('MAX_BOT_TOKEN is not configured');
  if(!initData)throw new Error('MAX initData is missing');
  const params={}; for(const part of String(initData).split('&')){const i=part.indexOf('=');if(i>=0)params[part.slice(0,i)]=part.slice(i+1)}
  const received=params.hash;if(!received)throw new Error('MAX initData hash is missing');
  const values={};for(const key of Object.keys(params))if(key!=='hash')values[key]=decode(params[key]);
  const check=Object.keys(values).sort().map(key=>key+'='+values[key]).join('\n');
  const secret=crypto.createHmac('sha256','WebAppData').update(MAXTOKEN).digest();
  const calculated=crypto.createHmac('sha256',secret).update(check,'utf8').digest('hex');
  const a=Buffer.from(decode(received),'hex'),b=Buffer.from(calculated,'hex');
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b))throw new Error('Invalid MAX initData signature');
  if(!values.user)throw new Error('MAX user data is missing');
  return JSON.parse(values.user);
}
async function dbPost(table,body){return (await axios.post(SUPA+'/rest/v1/'+table,body,{headers:dbHeaders,timeout:15000})).data}
function buildPaymentUrl(amount,invoiceId,email){
  const outSum=Number(amount).toFixed(2); const signature=md5(LOGIN+':'+outSum+':'+invoiceId+':'+PASS1);
  const params=new URLSearchParams(); params.set('MerchantLogin',LOGIN); params.set('OutSum',outSum); params.set('InvId',String(invoiceId));
  params.set('Description','Пополнение баланса Песня на заказ'); params.set('SignatureValue',signature);
  params.append('PaymentMethods','BankCard'); params.append('PaymentMethods','SBP'); params.set('Culture','ru'); params.set('Encoding','UTF-8'); params.set('Email',email);
  return PAYMENT_URL+'?'+params.toString();
}
function patchHtml(body){
  if(typeof body!=='string'||!body.includes('class="amount"'))return body;
  body=body.replace(/<button class="amount selected" data-amount="200"[\s\S]*?<\/button>\s*<button class="amount" data-amount="400"[\s\S]*?<\/button>\s*<button class="amount" data-amount="800"[\s\S]*?<\/button>/,
`<button class="amount selected" data-amount="200" type="button"><span class="amount-left"><strong>200 ₽</strong><small>Без бонуса</small></span><span class="amount-right">200 ₽</span></button><button class="amount" data-amount="400" type="button"><span class="amount-left"><strong>400 ₽ <span class="bonus">+5%</span></strong><small>Бонус +20 ₽</small></span><span class="amount-right">420 ₽</span></button><button class="amount" data-amount="800" type="button"><span class="amount-left"><strong>800 ₽ <span class="bonus">+10%</span></strong><small>Бонус +80 ₽</small></span><span class="amount-right">880 ₽</span></button>`);
  body=body.replace('selectedTopupAmount===400)credit=440;if(selectedTopupAmount===800)credit=960;', 'selectedTopupAmount===400?credit=420:selectedTopupAmount===800?credit=880:credit=200;');
  body=body.replace('Сейчас работает тестовое пополнение. На следующем этапе сюда подключим реальный платёжный шлюз.','Пополнение через Robokassa. Выберите сумму и оплатите через СБП или банковскую карту.');
  return body;
}
function install(app){
  if(app.__robokassaPlansRuntimeInstalled)return; app.__robokassaPlansRuntimeInstalled=true;
  app.post('/api/robokassa/start-plan',async(req,res)=>{
    try{
      if(!LOGIN||!PASS1||!PASS2||!SUPA||!SUPAKEY||!MAXTOKEN)return res.status(503).json({ok:false,error:'Платёжный сервис не настроен'});
      const user=validateMax(req.headers['x-max-init-data']||'');
      const plan=PLANS[Number(req.body?.amount)],email=String(req.body?.email||'').trim();
      if(!plan)return res.status(400).json({ok:false,error:'Можно пополнить только на 200, 400 или 800 ₽'});
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({ok:false,error:'Укажите корректный e-mail'});
      const invoiceId=String(Date.now())+String(Math.floor(Math.random()*100));
      const paymentUrl=buildPaymentUrl(plan.amount,invoiceId,email);
      await dbPost('payments',{user_id:String(user.id),amount:plan.amount,bonus:plan.bonus,credited_amount:plan.credited,purpose:'balance_topup',status:'pending',idempotence_key:'robokassa:'+invoiceId,confirmation_url:paymentUrl,metadata:{provider:'robokassa',payment_method:'BankCard/SBP',invoice_id:invoiceId,email}});
      console.log('[ROBOKASSA PLANS PAYMENT]',{invoiceId,amount:plan.amount,bonus:plan.bonus,credited:plan.credited,user:String(user.id)});
      return res.json({ok:true,paymentUrl,invoiceId,amount:plan.amount,bonus:plan.bonus,creditedAmount:plan.credited});
    }catch(error){console.error('[POST /api/robokassa/start-plan]',error.response?.data||error.message);return res.status(400).json({ok:false,error:error.response?.data?.message||error.message||'Не удалось начать оплату'});}
  });
  const prevListen=express.application.listen;
  express.application.listen=function(...args){
    try{if(!this.__robokassaPlansHtmlPatch){const originalSend=express.response.send;express.response.send=function(body){try{body=patchHtml(body)}catch(_){ }return originalSend.call(this,body)};this.__robokassaPlansHtmlPatch=true}}catch(error){console.error('[ROBOKASSA PLANS HTML]',error.message)}
    return prevListen.apply(this,args);
  };
  console.log('[ROBOKASSA PLANS] 200 ₽ / 400 ₽ +5% / 800 ₽ +10%');
}
const prevListen=express.application.listen;
express.application.listen=function(...args){try{install(this)}catch(error){console.error('[ROBOKASSA PLANS INSTALL]',error.message)}return prevListen.apply(this,args)};
console.log('[ROBOKASSA PLANS] module loaded');
