const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const LOGIN = String(process.env.ROBOKASSA_MERCHANT_LOGIN || '').trim();
const PASS1 = String(process.env.ROBOKASSA_PASSWORD1 || '').trim();
const PASS2 = String(process.env.ROBOKASSA_PASSWORD2 || '').trim();
const SUPA = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPAKEY = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '').trim();
const MAXTOKEN = String(process.env.MAX_BOT_TOKEN || '');
const PAYMENT_URL = 'https://auth.robokassa.ru/Merchant/Index.aspx';

const PLANS = Object.freeze({
  200: { amount: 200, bonus: 0, credited: 200 },
  400: { amount: 400, bonus: 40, credited: 440 },
  800: { amount: 800, bonus: 160, credited: 960 }
});

const headers = { apikey: SUPAKEY, Authorization: 'Bearer ' + SUPAKEY, 'Content-Type': 'application/json', Prefer: 'return=representation' };
function md5(value) { return crypto.createHash('md5').update(value, 'utf8').digest('hex'); }
function decode(value) { try { return decodeURIComponent(String(value).replace(/\+/g, '%20')); } catch (_) { return String(value); } }
function validateMax(initData) {
  if (!MAXTOKEN) throw new Error('MAX_BOT_TOKEN is not configured');
  if (!initData) throw new Error('MAX initData is missing');
  const params = {};
  for (const part of String(initData).split('&')) { const i = part.indexOf('='); if (i >= 0) params[part.slice(0, i)] = part.slice(1 + i); }
  const received = params.hash;
  if (!received) throw new Error('MAX initData hash is missing');
  const values = {};
  for (const key of Object.keys(params)) if (key !== 'hash') values[key] = decode(params[key]);
  const check = Object.keys(values).sort().map(k => k + '=' + values[k]).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(MAXTOKEN).digest();
  const calculated = crypto.createHmac('sha256', secret).update(check, 'utf8').digest('hex');
  const a = Buffer.from(decode(received), 'hex');
  const b = Buffer.from(calculated, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('Invalid MAX initData signature');
  if (!values.user) throw new Error('MAX user data is missing');
  return JSON.parse(values.user);
}
async function dbGet(table, query) { return (await axios.get(SUPA + '/rest/v1/' + table, { headers, params: query, timeout: 15000 })).data; }
async function dbPost(table, body) { return (await axios.post(SUPA + '/rest/v1/' + table, body, { headers, timeout: 15000 })).data; }
async function dbRpc(functionName, body) { return (await axios.post(SUPA + '/rest/v1/rpc/' + functionName, body, { headers, timeout: 15000 })).data; }

function buildPaymentUrl(amount, invoiceId, email) {
  const outSum = amount.toFixed(2);
  const signature = md5(LOGIN + ':' + outSum + ':' + invoiceId + ':' + PASS1);
  const params = new URLSearchParams();
  params.set('MerchantLogin', LOGIN);
  params.set('OutSum', outSum);
  params.set('InvId', String(invoiceId));
  params.set('Description', 'Пополнение баланса «Песня на заказ»');
  params.set('SignatureValue', signature);
  // Both parameters are intentional: PaymentMethods restricts the list,
  // while IncCurrLabel explicitly fixes the selected payment method.
  params.set('PaymentMethods', 'SBP');
  params.set('IncCurrLabel', 'SBP');
  params.set('Culture', 'ru');
  params.set('Email', email);
  params.set('Encoding', 'UTF-8');
  return PAYMENT_URL + '?' + params.toString();
}

function buildAutoPostHtml(paymentUrl) {
  const u = new URL(paymentUrl);
  const fields = [];
  for (const [name, value] of u.searchParams.entries()) {
    const n = String(name).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    const v = String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    fields.push('<input type="hidden" name="' + n + '" value="' + v + '">');
  }
  return '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Переход к оплате СБП</title></head><body style="font-family:sans-serif;text-align:center;padding:40px">' +
    '<p>Переходим к оплате через СБП…</p>' +
    '<form id="pay" method="post" action="https://auth.robokassa.ru/Merchant/Index.aspx">' + fields.join('') +
    '<noscript><button type="submit">Перейти к оплате</button></noscript></form>' +
    '<script>document.getElementById("pay").submit();</script></body></html>';
}

function install(app) {
  if (app.__robokassaSbpOpInstalled) return;
  app.__robokassaSbpOpInstalled = true;

  app.post('/api/robokassa/start-sbp', async (req, res) => {
    try {
      if (!LOGIN || !PASS1 || !PASS2 || !SUPA || !SUPAKEY || !MAXTOKEN) return res.status(503).json({ ok: false, error: 'Платёжный сервис не настроен' });
      const user = validateMax(req.headers['x-max-init-data'] || '');
      const plan = PLANS[Number(req.body?.amount)];
      const email = String(req.body?.email || '').trim();
      if (!plan) return res.status(400).json({ ok: false, error: 'Можно пополнить только на 200, 400 или 800 ₽' });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ ok: false, error: 'Укажите корректный e-mail' });
      await dbGet('users', { select: 'max_id', limit: 1 });
      const invoiceId = String(Date.now()) + String(Math.floor(Math.random() * 100));
      const paymentUrl = buildPaymentUrl(plan.amount, invoiceId, email);
      await dbPost('payments', {
        user_id: String(user.id), amount: plan.amount, bonus: plan.bonus, credited_amount: plan.credited,
        purpose: 'balance_topup', status: 'pending', idempotence_key: 'robokassa:' + invoiceId,
        confirmation_url: paymentUrl, metadata: { provider: 'robokassa', payment_method: 'SBP', invoice_id: invoiceId, email }
      });
      console.log('[ROBOKASSA SBP REDIRECT]', { invoiceId, amount: plan.amount, user: String(user.id) });
      return res.json({ ok: true, paymentUrl, invoiceId, amount: plan.amount, bonus: plan.bonus, creditedAmount: plan.credited });
    } catch (error) {
      console.error('[POST /api/robokassa/start-sbp]', error.response?.data || error.message);
      const status = error.response?.status === 401 || error.response?.status === 403 ? 503 : 400;
      return res.status(status).json({ ok: false, error: error.response?.data?.message || error.message || 'Не удалось начать оплату СБП' });
    }
  });

  app.get('/api/robokassa/pay-sbp', async (req, res) => {
    try {
      const user = validateMax(req.headers['x-max-init-data'] || '');
      const invoiceId = String(req.query?.invoiceId || '').trim();
      if (!/^\d{6,30}$/.test(invoiceId)) return res.status(400).send('Invalid invoiceId');
      const rows = await dbGet('payments', { idempotence_key: 'eq.robokassa:' + invoiceId, user_id: 'eq.' + String(user.id), select: 'confirmation_url,status', limit: 1 });
      if (!rows.length || rows[0].status !== 'pending' || !rows[0].confirmation_url) return res.status(404).send('Payment not found');
      return res.type('html').send(buildAutoPostHtml(rows[0].confirmation_url));
    } catch (error) {
      console.error('[GET /api/robokassa/pay-sbp]', error.response?.data || error.message);
      return res.status(400).send('Unable to open payment');
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
}

const listen = express.application.listen;
express.application.listen = function (...args) {
  try { install(this); } catch (error) { console.error('[ROBOKASSA SBP OP INSTALL]', error.message); }
  return listen.apply(this, args);
};
console.log('[ROBOKASSA SBP OP] module loaded');
