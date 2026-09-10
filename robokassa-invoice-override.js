const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const ROBOKASSA_MERCHANT_LOGIN = process.env.ROBOKASSA_MERCHANT_LOGIN || '';
const ROBOKASSA_PASSWORD1 = process.env.ROBOKASSA_PASSWORD1 || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN || '';
const API_URL = 'https://services.robokassa.ru/InvoiceServiceWebApi/api/CreateInvoice';

const PLANS = Object.freeze({
  200: { amount: 200, bonus: 0, credited: 200 },
  400: { amount: 400, bonus: 40, credited: 440 },
  800: { amount: 800, bonus: 160, credited: 960 }
});

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json',
  Prefer: 'return=representation'
};

function base64Url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function makeJwt(payload) {
  const header = { typ: 'JWT', alg: 'MD5' };
  const h = base64Url(header);
  const p = base64Url(payload);
  const input = h + '.' + p;
  const secret = ROBOKASSA_MERCHANT_LOGIN + ':' + ROBOKASSA_PASSWORD1;
  const sig = crypto.createHmac('md5', secret).update(input).digest('base64url');
  return input + '.' + sig;
}

function decode(value) {
  try { return decodeURIComponent(String(value).replace(/\+/g, '%20')); }
  catch (_) { return String(value); }
}

function validateMax(initData) {
  if (!MAX_BOT_TOKEN) throw new Error('MAX_BOT_TOKEN is not configured');
  if (!initData) throw new Error('MAX initData is missing');
  const params = {};
  for (const part of String(initData).split('&')) {
    const i = part.indexOf('=');
    if (i !== -1) params[part.slice(0, i)] = part.slice(i + 1);
  }
  const received = params.hash;
  if (!received) throw new Error('MAX initData hash is missing');
  const values = {};
  for (const key of Object.keys(params)) if (key !== 'hash') values[key] = decode(params[key]);
  const check = Object.keys(values).sort().map(k => k + '=' + values[k]).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(MAX_BOT_TOKEN).digest();
  const calculated = crypto.createHmac('sha256', secret).update(check, 'utf8').digest('hex');
  const a = Buffer.from(decode(received), 'hex');
  const b = Buffer.from(calculated, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('Invalid MAX initData signature');
  const user = values.user ? JSON.parse(values.user) : null;
  if (!user || !user.id) throw new Error('MAX user data is missing');
  return user;
}

async function dbGet(table, query) {
  const r = await axios.get(SUPABASE_URL + '/rest/v1/' + table, { headers, params: query, timeout: 15000 });
  return r.data;
}

async function dbPost(table, body) {
  const r = await axios.post(SUPABASE_URL + '/rest/v1/' + table, body, { headers, timeout: 15000 });
  return r.data;
}

async function createInvoice(plan, invoiceId, email) {
  const payload = {
    MerchantLogin: ROBOKASSA_MERCHANT_LOGIN,
    InvId: Number(invoiceId),
    InvoiceType: 'OneTime',
    Culture: 'ru',
    OutSum: plan.amount,
    Description: 'Пополнение баланса «Песня на заказ»',
    Aliases: ['SBP'],
    AdditionalParameters: {
      Email: email,
      IncCurrLabel: 'SBP',
      PaymentMethods: '["SBP"]'
    }
  };
  const jwt = makeJwt(payload);
  const r = await axios.post(API_URL, JSON.stringify(jwt), {
    headers: { 'Content-Type': 'application/json' },
    timeout: 20000
  });
  if (!r.data?.isSuccess || !r.data?.url) throw new Error(r.data?.message || 'Robokassa не вернула ссылку на оплату');
  return r.data;
}

async function install(app) {
  if (app.__robokassaInvoiceOverrideInstalled) return;
  app.__robokassaInvoiceOverrideInstalled = true;

  app.post('/api/robokassa/create-sbp', async (req, res) => {
    try {
      if (!ROBOKASSA_MERCHANT_LOGIN || !ROBOKASSA_PASSWORD1 || !SUPABASE_URL || !SUPABASE_KEY || !MAX_BOT_TOKEN) {
        return res.status(503).json({ ok: false, error: 'Платёжный сервис не настроен' });
      }
      const user = validateMax(req.headers['x-max-init-data'] || '');
      const amount = Number(req.body?.amount);
      const plan = PLANS[amount];
      const email = String(req.body?.email || '').trim();
      if (!plan) return res.status(400).json({ ok: false, error: 'Можно пополнить только на 200, 400 или 800 ₽' });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ ok: false, error: 'Укажите корректный e-mail' });

      const invoiceId = String(Date.now()) + String(Math.floor(Math.random() * 100));
      const existing = await dbGet('payments', {
        idempotence_key: 'eq.robokassa:' + invoiceId,
        select: '*',
        limit: 1
      });
      if (existing.length) return res.json({ ok: true, paymentUrl: existing[0].confirmation_url, invoiceId, amount: plan.amount });

      const invoice = await createInvoice(plan, invoiceId, email);
      await dbPost('payments', {
        user_id: String(user.id),
        amount: plan.amount,
        bonus: plan.bonus,
        credited_amount: plan.credited,
        purpose: 'balance_topup',
        status: 'pending',
        idempotence_key: 'robokassa:' + invoiceId,
        confirmation_url: invoice.url,
        metadata: { provider: 'robokassa', invoice_id: invoiceId, payment_method: 'SBP', email }
      });

      console.log('[ROBOKASSA SBP CREATE]', { invoiceId, amount: plan.amount, userId: String(user.id) });
      return res.json({ ok: true, paymentUrl: invoice.url, invoiceId, amount: plan.amount, bonus: plan.bonus, creditedAmount: plan.credited });
    } catch (error) {
      console.error('[POST /api/robokassa/create-sbp]', error.response?.data || error.message);
      return res.status(400).json({ ok: false, error: error.message || 'Не удалось создать оплату СБП' });
    }
  });
}

const originalListen = express.application.listen;
express.application.listen = function(...args) {
  try { install(this); }
  catch (error) { console.error('[ROBOKASSA SBP ROUTE]', error.message); }
  return originalListen.apply(this, args);
};

console.log('[ROBOKASSA SBP] server-side invoice module loaded');
