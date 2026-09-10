const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const ROBOKASSA_MERCHANT_LOGIN = String(process.env.ROBOKASSA_MERCHANT_LOGIN || '').trim();
const ROBOKASSA_PASSWORD1 = String(process.env.ROBOKASSA_PASSWORD1 || '').trim();
const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '').trim();
const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN || '';

const dbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json'
};

function base64Url(value) { return Buffer.from(JSON.stringify(value)).toString('base64url'); }
function makeJwt(payload) {
  const header = { typ: 'JWT', alg: 'MD5' };
  const encodedHeader = base64Url(header);
  const encodedPayload = base64Url(payload);
  const signingInput = encodedHeader + '.' + encodedPayload;
  const secret = ROBOKASSA_MERCHANT_LOGIN + ':' + ROBOKASSA_PASSWORD1;
  const signature = crypto.createHmac('md5', secret).update(signingInput).digest('base64url');
  return signingInput + '.' + signature;
}
function decodeInitDataValue(value) {
  try { return decodeURIComponent(String(value).replace(/\+/g, '%20')); }
  catch (_) { return String(value); }
}
function validateMaxInitData(initData) {
  if (!MAX_BOT_TOKEN) throw new Error('MAX_BOT_TOKEN is not configured');
  if (!initData || typeof initData !== 'string') throw new Error('MAX initData is missing');
  const params = {};
  for (const part of initData.split('&')) {
    const i = part.indexOf('=');
    if (i !== -1) params[part.slice(0, i)] = part.slice(i + 1);
  }
  const receivedHashRaw = params.hash;
  if (!receivedHashRaw) throw new Error('MAX initData hash is missing');
  const decodedParams = {};
  for (const key of Object.keys(params)) if (key !== 'hash') decodedParams[key] = decodeInitDataValue(params[key]);
  const dataCheckString = Object.keys(decodedParams).sort().map(key => key + '=' + decodedParams[key]).join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(MAX_BOT_TOKEN).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString, 'utf8').digest('hex');
  const receivedHash = decodeInitDataValue(receivedHashRaw);
  const receivedBuffer = Buffer.from(receivedHash, 'hex');
  const calculatedBuffer = Buffer.from(calculatedHash, 'hex');
  if (receivedBuffer.length !== calculatedBuffer.length || !crypto.timingSafeEqual(receivedBuffer, calculatedBuffer)) {
    throw new Error('Invalid MAX initData signature');
  }
  let user = null;
  if (decodedParams.user) { try { user = JSON.parse(decodedParams.user); } catch (_) { user = null; } }
  if (!user || !user.id) throw new Error('MAX user data is missing');
  return user;
}
async function supabaseGet(table, query) {
  const response = await axios.get(SUPABASE_URL + '/rest/v1/' + table, { headers: dbHeaders, params: query, timeout: 15000 });
  return response.data;
}
async function supabaseRpc(functionName, body) {
  const response = await axios.post(SUPABASE_URL + '/rest/v1/rpc/' + functionName, body, { headers: dbHeaders, timeout: 15000 });
  return response.data;
}
async function getInvoiceInformation(invId) {
  const token = makeJwt({ MerchantLogin: ROBOKASSA_MERCHANT_LOGIN, InvId: Number(invId) });
  const response = await axios.post('https://services.robokassa.ru/InvoiceServiceWebApi/api/GetInvoiceInformation', JSON.stringify(token), {
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000
  });
  return response.data;
}
function install(app) {
  if (app.__robokassaStatusInstalled) return;
  app.__robokassaStatusInstalled = true;
  app.get('/api/robokassa/status', async (req, res) => {
    try {
      if (!ROBOKASSA_MERCHANT_LOGIN || !ROBOKASSA_PASSWORD1 || !SUPABASE_URL || !SUPABASE_KEY || !MAX_BOT_TOKEN) {
        return res.status(503).json({ ok: false, error: 'Payment service is not configured' });
      }
      const user = validateMaxInitData(req.headers['x-max-init-data'] || '');
      const invoiceId = String(req.query?.invoiceId || '').trim();
      if (!/^\d{6,30}$/.test(invoiceId)) return res.status(400).json({ ok: false, error: 'Invalid invoiceId' });
      const rows = await supabaseGet('payments', {
        idempotence_key: 'eq.robokassa:' + invoiceId,
        user_id: 'eq.' + String(user.id),
        select: '*',
        limit: 1
      });
      if (!rows.length) return res.status(404).json({ ok: false, error: 'Payment not found' });
      const payment = rows[0];
      if (payment.status === 'succeeded') return res.json({ ok: true, status: 'paid', invoiceId, creditedAmount: Number(payment.credited_amount || 0) });
      if (payment.status !== 'pending') return res.json({ ok: true, status: payment.status, invoiceId });
      const result = await getInvoiceInformation(invoiceId);
      if (!result?.isSuccess) return res.json({ ok: true, status: 'pending', invoiceId, providerChecked: false });
      const info = result.invoiceInformation;
      const providerAmount = Number(info?.outSum);
      const localAmount = Number(payment.amount);
      if (!Number.isFinite(providerAmount) || providerAmount !== localAmount) return res.status(409).json({ ok: false, error: 'Payment amount mismatch' });
      if (info?.invoiceStatus === 'Paid') {
        const processed = await supabaseRpc('process_robokassa_payment', { p_idempotence_key: 'robokassa:' + invoiceId });
        return res.json({ ok: true, status: 'paid', invoiceId, creditedAmount: Number(payment.credited_amount || 0), processed });
      }
      return res.json({ ok: true, status: info?.invoiceStatus === 'Expired' ? 'expired' : 'pending', invoiceId });
    } catch (error) {
      console.error('[GET /api/robokassa/status]', error.response?.data || error.message);
      return res.status(500).json({ ok: false, error: 'Unable to verify payment status' });
    }
  });
}
const originalListen = express.application.listen;
express.application.listen = function(...args) { install(this); return originalListen.apply(this, args); };
console.log('[ROBOKASSA STATUS] module loaded');
