const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const LOGIN = String(process.env.ROBOKASSA_MERCHANT_LOGIN || '').trim();
const PASS1 = String(process.env.ROBOKASSA_PASSWORD1 || '').trim();
const PASS2 = String(process.env.ROBOKASSA_PASSWORD2 || '').trim();
const SUPA = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPAKEY = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '').trim();
const MAXTOKEN = String(process.env.MAX_BOT_TOKEN || '');

const PLANS = Object.freeze({
  200: { amount: 200, bonus: 0, credited: 200 },
  400: { amount: 400, bonus: 40, credited: 440 },
  800: { amount: 800, bonus: 160, credited: 960 }
});

const headers = {
  apikey: SUPAKEY,
  Authorization: 'Bearer ' + SUPAKEY,
  'Content-Type': 'application/json',
  Prefer: 'return=representation'
};

function md5(value) {
  return crypto.createHash('md5').update(value, 'utf8').digest('hex');
}

function hmac(value) {
  return crypto.createHmac('sha256', PASS1).update(value, 'utf8').digest('hex');
}

function decode(value) {
  try {
    return decodeURIComponent(String(value).replace(/\+/g, '%20'));
  } catch (_) {
    return String(value);
  }
}

function validateMax(initData) {
  if (!MAXTOKEN) throw new Error('MAX_BOT_TOKEN is not configured');
  if (!initData) throw new Error('MAX initData is missing');

  const params = {};
  for (const part of String(initData).split('&')) {
    const i = part.indexOf('=');
    if (i >= 0) params[part.slice(0, i)] = part.slice(i + 1);
  }

  const received = params.hash;
  if (!received) throw new Error('MAX initData hash is missing');

  const values = {};
  for (const key of Object.keys(params)) {
    if (key !== 'hash') values[key] = decode(params[key]);
  }

  const check = Object.keys(values)
    .sort()
    .map((key) => key + '=' + values[key])
    .join('\n');

  const secret = crypto.createHmac('sha256', 'WebAppData').update(MAXTOKEN).digest();
  const calculated = crypto.createHmac('sha256', secret).update(check, 'utf8').digest('hex');
  const a = Buffer.from(decode(received), 'hex');
  const b = Buffer.from(calculated, 'hex');

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('Invalid MAX initData signature');
  }
  if (!values.user) throw new Error('MAX user data is missing');

  return JSON.parse(values.user);
}

async function dbGet(table, query) {
  return (
    await axios.get(SUPA + '/rest/v1/' + table, {
      headers,
      params: query,
      timeout: 15000
    })
  ).data;
}

async function dbPost(table, body) {
  return (
    await axios.post(SUPA + '/rest/v1/' + table, body, {
      headers,
      timeout: 15000
    })
  ).data;
}

async function dbRpc(functionName, body) {
  return (
    await axios.post(SUPA + '/rest/v1/rpc/' + functionName, body, {
      headers,
      timeout: 15000
    })
  ).data;
}

async function getOperationState(invoiceId) {
  const signature = md5(LOGIN + ':' + invoiceId + ':' + PASS2);
  const response = await axios.get(
    'https://auth.robokassa.ru/Merchant/WebService/Service.asmx/OpStateExt',
    {
      params: {
        MerchantLogin: LOGIN,
        InvoiceID: invoiceId,
        Signature: signature
      },
      timeout: 15000
    }
  );

  const xml = String(response.data || '');
  const code = Number((xml.match(/<Result>\s*<Code>(\d+)<\/Code>/i) || [])[1]);
  const stateCode = Number((xml.match(/<State>\s*<Code>(\d+)<\/Code>/i) || [])[1]);
  const outSum = Number((xml.match(/<OutSum>([^<]+)<\/OutSum>/i) || [])[1]);
  const paymentMethod = String(
    (xml.match(/<PaymentMethod>\s*<Description>([^<]*)<\/Description>/i) || [])[1] || ''
  );

  return { code, stateCode, outSum, paymentMethod };
}

function renderLaunchPage(payment) {
  const invoiceId = String(payment.invoice_id);
  const amount = Number(payment.amount).toFixed(2);
  const email = String(payment.metadata?.email || '');
  const signature = md5(LOGIN + ':' + amount + ':' + invoiceId + ':' + PASS1);
  const safeJson = JSON.stringify({
    paymentMethod: 'SBP',
    email,
    merchantLogin: LOGIN,
    outSum: Number(amount),
    invId: Number(invoiceId),
    signature
  }).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Оплата через СБП</title>
<style>
body{font-family:Arial,sans-serif;text-align:center;padding:32px 18px;background:#fff;color:#222}
.box{max-width:420px;margin:0 auto}
.muted{color:#777;line-height:1.45}
.btn{display:none;width:100%;box-sizing:border-box;margin-top:20px;padding:15px 18px;border-radius:12px;background:#16a56f;color:#fff;text-decoration:none;font-weight:700;font-size:17px}
.small{display:none;margin-top:12px;color:#888;font-size:13px;line-height:1.45}
</style>
</head>
<body>
<div class="box">
  <h2>Оплата через СБП</h2>
  <p class="muted" id="status">Получаем ссылку для оплаты…</p>
  <a id="open" class="btn" href="#">Открыть банковское приложение</a>
  <p class="small" id="hint">Если банк не открылся автоматически, нажмите кнопку ещё раз.</p>
  <p class="muted" id="error" style="display:none;color:#b00020"></p>
</div>
<script src="https://auth.robokassa.ru/merchant/bundle/robokassa-iframe-badge.js"></script>
<script>
(function(){
  var p=${safeJson};
  var status=document.getElementById('status');
  var error=document.getElementById('error');
  var open=document.getElementById('open');
  var hint=document.getElementById('hint');
  var settled=false;

  function showError(msg){
    status.style.display='none';
    open.style.display='none';
    hint.style.display='none';
    error.textContent=msg;
    error.style.display='block';
  }

  function normalize(v){
    if(typeof v==='string')return v.trim();
    if(v&&typeof v.url==='string')return v.url.trim();
    if(v&&typeof v.link==='string')return v.link.trim();
    if(v&&typeof v.paymentUrl==='string')return v.paymentUrl.trim();
    if(v&&typeof v.paymentLink==='string')return v.paymentLink.trim();
    if(v&&v.data)return normalize(v.data);
    if(v&&v.detail)return normalize(v.detail);
    return '';
  }

  function showPaymentLink(raw){
    var u=normalize(raw);
    if(!u||settled)return;
    settled=true;
    open.href=u;
    open.target='_self';
    status.textContent='Ссылка для СБП готова. Нажмите кнопку ниже — банк откроется через системный переход Android.';
    open.style.display='block';
    hint.style.display='block';
  }

  function start(){
    if(!window.Robokassa||!window.Robokassa.pay||typeof window.Robokassa.pay.startOp!=='function'){
      return showError('Не удалось загрузить модуль оплаты Robokassa.');
    }

    var timer=setTimeout(function(){
      if(!settled)showError('Robokassa не вернула ссылку СБП за отведённое время.');
    },20000);

    function finish(raw){
      var u=normalize(raw);
      if(!u||settled)return;
      clearTimeout(timer);
      showPaymentLink(u);
    }

    try{
      var ret=window.Robokassa.pay.startOp({
        paymentMethod:p.paymentMethod,
        email:p.email,
        merchantLogin:p.merchantLogin,
        outSum:p.outSum,
        invId:p.invId,
        signature:p.signature,
        onpaymentlink:finish
      });
      var immediate=normalize(ret);
      if(immediate)finish(immediate);
      else if(ret&&typeof ret.then==='function'){
        ret.then(finish).catch(function(err){
          if(!settled){
            clearTimeout(timer);
            showError(err&&err.message?err.message:'Ошибка запуска СБП.');
          }
        });
      }
    }catch(err){
      clearTimeout(timer);
      showError(err&&err.message?err.message:'Ошибка запуска СБП.');
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
</script>
</body></html>`;
}

function renderReturnPage({ ok, message }) {
  const safeMessage = String(message || '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));

  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Результат оплаты</title>
<style>body{font-family:Arial,sans-serif;text-align:center;padding:40px 18px;background:#fff;color:#222}.box{max-width:420px;margin:0 auto}.ok{color:#0b8f64}.muted{color:#777;line-height:1.5}</style></head>
<body><div class="box"><h2 class="${ok ? 'ok' : ''}">${ok ? 'Оплата подтверждена' : 'Возврат из платёжной системы'}</h2><p class="muted">${safeMessage}</p><p class="muted">Вернитесь в MAX. Приложение автоматически проверит состояние платежа.</p></div></body></html>`;
}

async function processReturn(req) {
  const source = req.method === 'POST' ? req.body || {} : req.query || {};
  const outSum = String(source.OutSum || '').trim();
  const invoiceId = String(source.InvId || source.InvoiceID || '').trim();
  const signatureValue = String(source.SignatureValue || '').trim();

  if (!outSum || !invoiceId || !signatureValue) {
    return { ok: false, message: 'Параметры возврата платежа не получены.' };
  }
  if (!/^\d{6,30}$/.test(invoiceId)) {
    return { ok: false, message: 'Некорректный номер платежа.' };
  }

  const expected = md5(outSum + ':' + invoiceId + ':' + PASS1);
  const a = Buffer.from(signatureValue.toLowerCase(), 'utf8');
  const b = Buffer.from(expected.toLowerCase(), 'utf8');
  if (a.length !== b.length || !a.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, message: 'Не удалось подтвердить параметры возврата.' };
  }

  const rows = await dbGet('payments', {
    idempotence_key: 'eq.robokassa:' + invoiceId,
    select: '*',
    limit: 1
  });
  if (!rows.length) return { ok: false, message: 'Платёж не найден.' };

  const payment = rows[0];
  if (Number(payment.amount).toFixed(2) !== Number(outSum).toFixed(2)) {
    return { ok: false, message: 'Сумма платежа не совпадает с заказом.' };
  }
  if (payment.status === 'succeeded') {
    return { ok: true, message: 'Платёж уже подтверждён.' };
  }

  try {
    const state = await getOperationState(invoiceId);
    if (state.code === 0 && state.stateCode === 100 && state.outSum === Number(payment.amount)) {
      await dbRpc('process_robokassa_payment', { p_idempotence_key: 'robokassa:' + invoiceId });
      return { ok: true, message: 'Платёж подтверждён. Баланс пополнен.' };
    }
  } catch (error) {
    console.error('[ROBOKASSA RETURN STATE]', error.response?.data || error.message);
  }

  return { ok: true, message: 'Платёж принят. Окончательное подтверждение и зачисление выполняются автоматически.' };
}

function install(app) {
  if (app.__robokassaSbpOpInstalled) return;
  app.__robokassaSbpOpInstalled = true;

  app.post('/api/robokassa/start-sbp', async (req, res) => {
    try {
      if (!LOGIN || !PASS1 || !PASS2 || !SUPA || !SUPAKEY || !MAXTOKEN) {
        return res.status(503).json({ ok: false, error: 'Платёжный сервис не настроен' });
      }

      const user = validateMax(req.headers['x-max-init-data'] || '');
      const plan = PLANS[Number(req.body?.amount)];
      const email = String(req.body?.email || '').trim();

      if (!plan) return res.status(400).json({ ok: false, error: 'Можно пополнить только на 200, 400 или 800 ₽' });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ ok: false, error: 'Укажите корректный e-mail' });

      await dbGet('users', { select: 'max_id', limit: 1 });

      const invoiceId = String(Date.now()) + String(Math.floor(Math.random() * 100));
      const launchUrl = buildLaunchUrl(req, invoiceId);

      await dbPost('payments', {
        user_id: String(user.id),
        amount: plan.amount,
        bonus: plan.bonus,
        credited_amount: plan.credited,
        purpose: 'balance_topup',
        status: 'pending',
        idempotence_key: 'robokassa:' + invoiceId,
        confirmation_url: launchUrl,
        metadata: {
          provider: 'robokassa',
          payment_method: 'SBP',
          invoice_id: invoiceId,
          email
        }
      });

      console.log('[ROBOKASSA SBP REDIRECT]', { invoiceId, amount: plan.amount, user: String(user.id) });
      return res.json({
        ok: true,
        launchUrl,
        invoiceId,
        amount: plan.amount,
        bonus: plan.bonus,
        creditedAmount: plan.credited
      });
    } catch (error) {
      console.error('[POST /api/robokassa/start-sbp]', error.response?.data || error.message);
      const status = error.response?.status === 401 || error.response?.status === 403 ? 503 : 400;
      return res.status(status).json({ ok: false, error: error.response?.data?.message || error.message || 'Не удалось начать оплату СБП' });
    }
  });

  app.get('/api/robokassa/sbp-launch', async (req, res) => {
    try {
      const invoiceId = String(req.query?.invoiceId || '').trim();
      const token = String(req.query?.token || '').trim().toLowerCase();
      if (!/^\d{6,30}$/.test(invoiceId) || !/^[0-9a-f]{64}$/.test(token)) return res.status(400).send('Invalid payment link');

      const expected = hmac('sbp-launch:' + invoiceId);
      const a = Buffer.from(token, 'utf8');
      const b = Buffer.from(expected, 'utf8');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(403).send('Forbidden');

      const rows = await dbGet('payments', {
        idempotence_key: 'eq.robokassa:' + invoiceId,
        select: 'amount,status,metadata',
        limit: 1
      });
      if (!rows.length || rows[0].status !== 'pending') return res.status(404).send('Payment not found');

      return res.type('html').send(renderLaunchPage({ ...rows[0], invoice_id: invoiceId }));
    } catch (error) {
      console.error('[GET /api/robokassa/sbp-launch]', error.response?.data || error.message);
      return res.status(400).send('Unable to open payment');
    }
  });

  app.get('/api/robokassa/return', async (req, res) => {
    try {
      const result = await processReturn(req);
      return res.type('html').send(renderReturnPage(result));
    } catch (error) {
      console.error('[GET /api/robokassa/return]', error.response?.data || error.message);
      return res.type('html').send(renderReturnPage({ ok: false, message: 'Не удалось обработать возврат из платёжной системы.' }));
    }
  });

  app.post('/api/robokassa/return', express.urlencoded({ extended: false, limit: '50kb' }), async (req, res) => {
    try {
      const result = await processReturn(req);
      return res.type('html').send(renderReturnPage(result));
    } catch (error) {
      console.error('[POST /api/robokassa/return]', error.response?.data || error.message);
      return res.type('html').send(renderReturnPage({ ok: false, message: 'Не удалось обработать возврат из платёжной системы.' }));
    }
  });

  async function processResult(req, res) {
    const outSum = String(req.body?.OutSum || '').trim();
    const invoiceId = String(req.body?.InvId || req.body?.InvoiceID || '').trim();
    const signatureValue = String(req.body?.SignatureValue || '').trim();

    try {
      if (!LOGIN || !PASS2 || !SUPA || !SUPAKEY) return res.status(503).send('Service unavailable');
      if (!outSum || !invoiceId || !signatureValue) return res.status(400).send('Invalid notification');

      const expected = md5(outSum + ':' + invoiceId + ':' + PASS2);
      const a = Buffer.from(signatureValue.toLowerCase(), 'utf8');
      const b = Buffer.from(expected.toLowerCase(), 'utf8');
      if (a.length !== b.length || !a.length || !crypto.timingSafeEqual(a, b)) return res.status(400).send('Invalid signature');

      const rows = await dbGet('payments', { idempotence_key: 'eq.robokassa:' + invoiceId, select: '*', limit: 1 });
      if (!rows.length) return res.status(404).send('Payment not found');
      if (Number(rows[0].amount).toFixed(2) !== Number(outSum).toFixed(2)) return res.status(400).send('Amount mismatch');

      const processed = await dbRpc('process_robokassa_payment', { p_idempotence_key: 'robokassa:' + invoiceId });
      console.log('[ROBOKASSA SBP RESULT]', { invoiceId, result: processed });
      return res.send('OK' + invoiceId);
    } catch (error) {
      console.error('[ROBOKASSA SBP RESULT]', error.response?.data || error.message);
      return res.status(500).send('Temporary error');
    }
  }

  app.post('/api/robokassa/result', express.urlencoded({ extended: false, limit: '50kb' }), processResult);
  app.post('/api/robokassa/result-sbp', express.urlencoded({ extended: false, limit: '50kb' }), processResult);

  app.get('/api/robokassa/status', async (req, res) => {
    try {
      if (!LOGIN || !PASS2 || !SUPA || !SUPAKEY || !MAXTOKEN) {
        return res.status(503).json({ ok: false, error: 'Payment service is not configured' });
      }

      const user = validateMax(req.headers['x-max-init-data'] || '');
      const invoiceId = String(req.query?.invoiceId || '').trim();
      if (!/^\d{6,30}$/.test(invoiceId)) return res.status(400).json({ ok: false, error: 'Invalid invoiceId' });

      const rows = await dbGet('payments', {
        idempotence_key: 'eq.robokassa:' + invoiceId,
        user_id: 'eq.' + String(user.id),
        select: '*',
        limit: 1
      });
      if (!rows.length) return res.status(404).json({ ok: false, error: 'Payment not found' });

      const payment = rows[0];
      if (payment.status === 'succeeded') {
        return res.json({ ok: true, status: 'paid', invoiceId, creditedAmount: Number(payment.credited_amount || 0) });
      }
      if (payment.status !== 'pending') return res.json({ ok: true, status: payment.status, invoiceId });

      const operation = await getOperationState(invoiceId);
      if (operation.code !== 0) return res.json({ ok: true, status: 'pending', invoiceId, providerChecked: false });
      if (!Number.isFinite(operation.outSum) || operation.outSum !== Number(payment.amount)) {
        return res.status(409).json({ ok: false, error: 'Payment amount mismatch' });
      }

      if (operation.stateCode === 100) {
        await dbRpc('process_robokassa_payment', { p_idempotence_key: 'robokassa:' + invoiceId });
        return res.json({
          ok: true,
          status: 'paid',
          invoiceId,
          creditedAmount: Number(payment.credited_amount || 0),
          paymentMethod: operation.paymentMethod
        });
      }

      if (operation.stateCode === 60) {
        return res.json({ ok: true, status: 'canceled', invoiceId, paymentMethod: operation.paymentMethod });
      }

      return res.json({
        ok: true,
        status: 'pending',
        invoiceId,
        stateCode: operation.stateCode,
        paymentMethod: operation.paymentMethod
      });
    } catch (error) {
      console.error('[GET /api/robokassa/status]', error.response?.data || error.message);
      return res.status(500).json({ ok: false, error: 'Unable to verify payment status' });
    }
  });
}

function buildLaunchUrl(req, invoiceId) {
  const host = req.get('host');
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  const token = hmac('sbp-launch:' + invoiceId);
  return proto + '://' + host + '/api/robokassa/sbp-launch?invoiceId=' + encodeURIComponent(invoiceId) + '&token=' + token;
}

const listen = express.application.listen;
express.application.listen = function (...args) {
  try {
    install(this);
  } catch (error) {
    console.error('[ROBOKASSA SBP OP INSTALL]', error.message);
  }
  return listen.apply(this, args);
};

console.log('[ROBOKASSA SBP OP] module loaded');
