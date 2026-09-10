const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const ROBOKASSA_MERCHANT_LOGIN = String(process.env.ROBOKASSA_MERCHANT_LOGIN || '').trim();
const ROBOKASSA_PASSWORD2 = String(process.env.ROBOKASSA_PASSWORD2 || '').trim();
const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '').trim();
const MAX_BOT_TOKEN = String(process.env.MAX_BOT_TOKEN || '');

const dbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json'
};

function md5(value) { return crypto.createHash('md5').update(value, 'utf8').digest('hex'); }
function decode(value) { try { return decodeURIComponent(String(value).replace(/\+/g, '%20')); } catch (_) { return String(value); } }
function validateMaxInitData(initData) {
  if (!MAX_BOT_TOKEN) throw new Error('MAX_BOT_TOKEN is not configured');
  if (!initData) throw new Error('MAX initData is missing');
  const params = {};
  for (const part of String(initData).split('&')) { const i = part.indexOf('='); if (i !== -1) params[part.slice(0, i)] = part.slice(i + 1); }
  const receivedHash = params.hash;
  if (!receivedHash) throw new Error('MAX initData hash is missing');
  const values = {};
  for (const key of Object.keys(params)) if (key !== 'hash') values[key] = decode(params[key]);
  const check = Object.keys(values).sort().map(key => key + '=' + values[key]).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(MAX_BOT_TOKEN).digest();
  const calculated = crypto.createHmac('sha256', secret).update(check, 'utf8').digest('hex');
  const a = Buffer.from(decode(receivedHash), 'hex');
  const b = Buffer.from(calculated, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('Invalid MAX initData signature');
  if (!values.user) throw new Error('MAX user data is missing');
  return JSON.parse(values.user);
}
async function supabaseGet(table, query) {
  return (await axios.get(SUPABASE_URL + '/rest/v1/' + table, { headers: dbHeaders, params: query, timeout: 15000 })).data;
}
async function supabaseRpc(functionName, body) {
  return (await axios.post(SUPABASE_URL + '/rest/v1/rpc/' + functionName, body, { headers: dbHeaders, timeout: 15000 })).data;
}

async function getOperationState(invoiceId) {
  const signature = md5(ROBOKASSA_MERCHANT_LOGIN + ':' + invoiceId + ':' + ROBOKASSA_PASSWORD2);
  const response = await axios.get('https://auth.robokassa.ru/Merchant/WebService/Service.asmx/OpStateExt', {
    params: { MerchantLogin: ROBOKASSA_MERCHANT_LOGIN, InvoiceID: invoiceId, Signature: signature },
    timeout: 15000
  });
  const xml = String(response.data || '');
  const code = Number((xml.match(/<Result>\s*<Code>(\d+)<\/Code>/i) || [])[1]);
  const stateCode = Number((xml.match(/<State>\s*<Code>(\d+)<\/Code>/i) || [])[1]);
  const outSum = Number((xml.match(/<OutSum>([^<]+)<\/OutSum>/i) || [])[1]);
  const paymentMethod = String((xml.match(/<PaymentMethod>\s*<Description>([^<]*)<\/Description>/i) || [])[1] || '');
  return { code, stateCode, outSum, paymentMethod };
}

function install(app) {
  if (app.__robokassaStatusInstalled) return;
  app.__robokassaStatusInstalled = true;
  app.get('/api/robokassa/status', async (req, res) => {
    try {
      if (!ROBOKASSA_MERCHANT_LOGIN || !ROBOKASSA_PASSWORD2 || !SUPABASE_URL || !SUPABASE_KEY || !MAX_BOT_TOKEN) {
        return res.status(503).json({ ok: false, error: 'Payment service is not configured' });
      }
      const user = validateMaxInitData(req.headers['x-max-init-data'] || '');
      const invoiceId = String(req.query?.invoiceId || '').trim();
      if (!/^\d{6,30}$/.test(invoiceId)) return res.status(400).json({ ok: false, error: 'Invalid invoiceId' });

      const rows = await supabaseGet('payments', { idempotence_key: 'eq.robokassa:' + invoiceId, user_id: 'eq.' + String(user.id), select: '*', limit: 1 });
      if (!rows.length) return res.status(404).json({ ok: false, error: 'Payment not found' });
      const payment = rows[0];

      if (payment.status === 'succeeded') return res.json({ ok: true, status: 'paid', invoiceId, creditedAmount: Number(payment.credited_amount || 0) });
      if (payment.status !== 'pending') return res.json({ ok: true, status: payment.status, invoiceId });

      const operation = await getOperationState(invoiceId);
      if (operation.code !== 0) {
        return res.json({ ok: true, status: 'pending', invoiceId, providerChecked: false });
      }
      if (!Number.isFinite(operation.outSum) || operation.outSum !== Number(payment.amount)) {
        return res.status(409).json({ ok: false, error: 'Payment amount mismatch' });
      }

      if (operation.stateCode === 100) {
        const processed = await supabaseRpc('process_robokassa_payment', { p_idempotence_key: 'robokassa:' + invoiceId });
        return res.json({ ok: true, status: 'paid', invoiceId, creditedAmount: Number(payment.credited_amount || 0), paymentMethod: operation.paymentMethod, processed });
      }
      if (operation.stateCode === 10 || operation.stateCode === 60) {
        return res.json({ ok: true, status: 'canceled', invoiceId, paymentMethod: operation.paymentMethod });
      }
      return res.json({ ok: true, status: 'pending', invoiceId, stateCode: operation.stateCode, paymentMethod: operation.paymentMethod });
    } catch (error) {
      console.error('[GET /api/robokassa/status]', error.response?.data || error.message);
      return res.status(500).json({ ok: false, error: 'Unable to verify payment status' });
    }
  });
}

const originalListen = express.application.listen;
express.application.listen = function (...args) { install(this); return originalListen.apply(this, args); };
console.log('[ROBOKASSA STATUS] module loaded');
