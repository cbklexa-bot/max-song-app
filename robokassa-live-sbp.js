const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const LOGIN = String(process.env.ROBOKASSA_MERCHANT_LOGIN || '').trim();
const PASS1 = String(process.env.ROBOKASSA_PASSWORD1 || '').trim();
const SUPA = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPAKEY = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '').trim();
const MAXTOKEN = process.env.MAX_BOT_TOKEN || '';
const API = 'https://services.robokassa.ru/InvoiceServiceWebApi/api/CreateInvoice';

const PLANS = {
  200: { amount: 200, bonus: 0, credited: 200 },
  400: { amount: 400, bonus: 40, credited: 440 },
  800: { amount: 800, bonus: 160, credited: 960 }
};

const headers = {
  apikey: SUPAKEY,
  Authorization: 'Bearer ' + SUPAKEY,
  'Content-Type': 'application/json',
  Prefer: 'return=representation'
};

function b64(v) { return Buffer.from(JSON.stringify(v)).toString('base64url'); }
function jwt(payload) {
  const h = b64({ typ: 'JWT', alg: 'MD5' });
  const p = b64(payload);
  const input = h + '.' + p;
  const sig = crypto.createHmac('md5', LOGIN + ':' + PASS1).update(input).digest('base64url');
  return input + '.' + sig;
}
function dec(v) { try { return decodeURIComponent(String(v).replace(/\+/g, '%20')); } catch (_) { return String(v); } }
function maxUser(raw) {
  if (!MAXTOKEN) throw Error('MAX_BOT_TOKEN is not configured');
  if (!raw) throw Error('MAX initData is missing');
  const p = {};
  for (const part of String(raw).split('&')) {
    const i = part.indexOf('=');
    if (i >= 0) p[part.slice(0, i)] = part.slice(i + 1);
  }
  const hash = p.hash;
  if (!hash) throw Error('MAX initData hash is missing');
  const values = {};
  for (const k of Object.keys(p)) if (k !== 'hash') values[k] = dec(p[k]);
  const check = Object.keys(values).sort().map(k => k + '=' + values[k]).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(MAXTOKEN).digest();
  const calc = crypto.createHmac('sha256', secret).update(check, 'utf8').digest('hex');
  const a = Buffer.from(dec(hash), 'hex');
  const b = Buffer.from(calc, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw Error('Invalid MAX initData signature');
  if (!values.user) throw Error('MAX user data is missing');
  return JSON.parse(values.user);
}
async function get(t, q) {
  return (await axios.get(SUPA + '/rest/v1/' + t, { headers, params: q, timeout: 15000 })).data;
}
async function post(t, b) {
  return (await axios.post(SUPA + '/rest/v1/' + t, b, { headers, timeout: 15000 })).data;
}
async function invoice(plan, id, email) {
  const payload = {
    MerchantLogin: LOGIN,
    InvId: Number(id),
    InvoiceType: 'OneTime',
    Culture: 'ru',
    OutSum: plan.amount,
    Description: 'Пополнение баланса «Песня на заказ»',
    Aliases: ['SBP'],
    AdditionalParameters: { Email: email }
  };
  const r = await axios.post(API, JSON.stringify(jwt(payload)), {
    headers: { 'Content-Type': 'application/json' },
    timeout: 20000
  });
  if (!r.data?.isSuccess || !r.data?.url) throw Error(r.data?.message || 'Robokassa не вернула ссылку на оплату');
  return r.data;
}
async function checkSupabaseAccess() {
  if (!SUPA || !SUPAKEY) throw Error('Supabase environment variables are missing');
  await get('users', { select: 'max_id', limit: 1 });
}
function install(app) {
  if (app.__liveSbpInstalled) return;
  app.__liveSbpInstalled = true;
  app.post('/api/robokassa/live-sbp', async (req, res) => {
    try {
      const u = maxUser(req.headers['x-max-init-data'] || '');
      const plan = PLANS[Number(req.body?.amount)];
      const email = String(req.body?.email || '').trim();
      if (!plan) return res.status(400).json({ ok: false, error: 'Некорректная сумма' });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ ok: false, error: 'Укажите корректный e-mail' });
      if (!LOGIN || !PASS1 || !SUPA || !SUPAKEY) return res.status(503).json({ ok: false, error: 'Платёжный сервис не настроен' });

      try {
        await checkSupabaseAccess();
      } catch (dbError) {
        console.error('[LIVE SBP] Supabase preflight failed:', dbError.response?.data || dbError.message);
        return res.status(503).json({ ok: false, error: 'Сервис оплаты временно недоступен. Платёж не создавался.' });
      }

      const id = String(Date.now()) + String(Math.floor(Math.random() * 100));
      const inv = await invoice(plan, id, email);
      await post('payments', {
        user_id: String(u.id),
        amount: plan.amount,
        bonus: plan.bonus,
        credited_amount: plan.credited,
        purpose: 'balance_topup',
        status: 'pending',
        idempotence_key: 'robokassa:' + id,
        confirmation_url: inv.url,
        metadata: { provider: 'robokassa', payment_method: 'SBP', invoice_id: id, email }
      });
      console.log('[LIVE SBP]', { id, amount: plan.amount, user: String(u.id) });
      return res.json({ ok: true, paymentUrl: inv.url, invoiceId: id, amount: plan.amount, creditedAmount: plan.credited });
    } catch (e) {
      console.error('[LIVE SBP]', e.response?.data || e.message);
      return res.status(400).json({ ok: false, error: e.message || 'Не удалось начать оплату СБП' });
    }
  });
}
const listen = express.application.listen;
express.application.listen = function (...args) {
  try { install(this); } catch (e) { console.error('[LIVE SBP INSTALL]', e.message); }
  return listen.apply(this, args);
};
console.log('[LIVE SBP] module loaded');
