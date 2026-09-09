const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

// Robokassa integration is intentionally isolated from the main MAX/audio logic.
// It adds two API routes and a tiny frontend adapter. It does not patch Express routing,
// MutationObserver, MAX authentication, audio, generation, orders, or downloads.

const ROBOKASSA_MERCHANT_LOGIN = process.env.ROBOKASSA_MERCHANT_LOGIN || '';
const ROBOKASSA_PASSWORD1 = process.env.ROBOKASSA_PASSWORD1 || '';
const ROBOKASSA_PASSWORD2 = process.env.ROBOKASSA_PASSWORD2 || '';
const SITE_URL = String(process.env.SITE_URL || 'https://max-song-app-v3-tehnopark.amvera.io').replace(/\/$/, '');
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN || '';

const TOPUP_PLANS = Object.freeze({
  200: { amount: 200, bonus: 0, credited: 200 },
  400: { amount: 400, bonus: 40, credited: 440 },
  800: { amount: 800, bonus: 160, credited: 960 }
});

const dbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json',
  Prefer: 'return=representation'
};

function isConfigured() {
  return Boolean(
    ROBOKASSA_MERCHANT_LOGIN &&
    ROBOKASSA_PASSWORD1 &&
    ROBOKASSA_PASSWORD2 &&
    SUPABASE_URL &&
    SUPABASE_KEY &&
    MAX_BOT_TOKEN
  );
}

function decodeInitDataValue(value) {
  try {
    return decodeURIComponent(String(value).replace(/\+/g, '%20'));
  } catch (_) {
    return String(value);
  }
}

function validateMaxInitData(initData) {
  if (!MAX_BOT_TOKEN) throw new Error('MAX_BOT_TOKEN is not configured');
  if (!initData || typeof initData !== 'string') throw new Error('MAX initData is missing');

  const params = {};
  for (const part of initData.split('&')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    params[part.slice(0, i)] = part.slice(i + 1);
  }

  const receivedHashRaw = params.hash;
  if (!receivedHashRaw) throw new Error('MAX initData hash is missing');

  const decodedParams = {};
  for (const key of Object.keys(params)) {
    if (key !== 'hash') decodedParams[key] = decodeInitDataValue(params[key]);
  }

  const dataCheckString = Object.keys(decodedParams)
    .sort()
    .map((key) => key + '=' + decodedParams[key])
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(MAX_BOT_TOKEN)
    .digest();

  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString, 'utf8')
    .digest('hex');

  const receivedHash = decodeInitDataValue(receivedHashRaw);
  const receivedBuffer = Buffer.from(receivedHash, 'hex');
  const calculatedBuffer = Buffer.from(calculatedHash, 'hex');

  if (
    receivedBuffer.length !== calculatedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, calculatedBuffer)
  ) {
    throw new Error('Invalid MAX initData signature');
  }

  if (decodedParams.auth_date) {
    const authDate = Number(decodedParams.auth_date);
    if (!Number.isNaN(authDate)) {
      const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
      if (ageSeconds > 3600) throw new Error('MAX initData expired');
    }
  }

  let user = null;
  if (decodedParams.user) {
    try {
      user = JSON.parse(decodedParams.user);
    } catch (_) {
      user = null;
    }
  }

  if (!user || !user.id) throw new Error('MAX user data is missing');
  return { params: decodedParams, user };
}

async function supabaseGet(table, query) {
  const response = await axios.get(
    SUPABASE_URL + '/rest/v1/' + table,
    { headers: dbHeaders, params: query, timeout: 15000 }
  );
  return response.data;
}

async function supabasePost(table, body) {
  const response = await axios.post(
    SUPABASE_URL + '/rest/v1/' + table,
    body,
    { headers: dbHeaders, timeout: 15000 }
  );
  return response.data;
}

async function supabasePatch(table, query, body) {
  const response = await axios.patch(
    SUPABASE_URL + '/rest/v1/' + table,
    body,
    { headers: dbHeaders, params: query, timeout: 15000 }
  );
  return response.data;
}

async function supabaseRpc(functionName, body) {
  const response = await axios.post(
    SUPABASE_URL + '/rest/v1/rpc/' + functionName,
    body,
    { headers: dbHeaders, timeout: 15000 }
  );
  return response.data;
}

async function getUserByMaxId(maxUserId) {
  const rows = await supabaseGet('users', {
    max_id: 'eq.' + String(maxUserId),
    select: '*',
    limit: 1
  });
  return rows.length ? rows[0] : null;
}

async function getOrCreateUser(maxUser) {
  let user = await getUserByMaxId(maxUser.id);
  if (user) return user;

  const fullName =
    [maxUser.first_name, maxUser.last_name]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    maxUser.username ||
    'MAX пользователь';

  try {
    const rows = await supabasePost('users', {
      max_id: String(maxUser.id),
      name: fullName,
      balance: 0
    });
    return rows[0];
  } catch (error) {
    if (error.response?.status === 409) {
      user = await getUserByMaxId(maxUser.id);
      if (user) return user;
    }
    throw error;
  }
}

function normalizeMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return number.toFixed(6);
}

function md5(value) {
  return crypto.createHash('md5').update(value, 'utf8').digest('hex');
}

function safeEqualHex(a, b) {
  const aa = Buffer.from(String(a || '').trim().toLowerCase(), 'utf8');
  const bb = Buffer.from(String(b || '').trim().toLowerCase(), 'utf8');
  return aa.length === bb.length && aa.length > 0 && crypto.timingSafeEqual(aa, bb);
}

async function createPaymentRecord(user, plan, invoiceId) {
  const existing = await supabaseGet('payments', {
    idempotence_key: 'eq.robokassa:' + String(invoiceId),
    select: '*',
    limit: 1
  });
  if (existing.length) return existing[0];

  const rows = await supabasePost('payments', {
    user_id: user.max_id,
    amount: plan.amount,
    bonus: plan.bonus,
    credited_amount: plan.credited,
    purpose: 'balance_topup',
    status: 'pending',
    idempotence_key: 'robokassa:' + String(invoiceId),
    confirmation_url: null,
    metadata: {
      provider: 'robokassa',
      invoice_id: String(invoiceId)
    }
  });
  return rows[0];
}

function buildPaymentUrl(plan, invoiceId) {
  const outSum = plan.amount.toFixed(2);
  const signature = md5(
    ROBOKASSA_MERCHANT_LOGIN + ':' + outSum + ':' + String(invoiceId) + ':' + ROBOKASSA_PASSWORD1
  );

  const params = new URLSearchParams({
    MerchantLogin: ROBOKASSA_MERCHANT_LOGIN,
    OutSum: outSum,
    InvId: String(invoiceId),
    Description: 'Пополнение баланса «Песня на заказ»',
    SignatureValue: signature,
    Culture: 'ru'
  });

  return 'https://auth.robokassa.ru/Merchant/Index.aspx?' + params.toString();
}

function installRoutes(app) {
  if (app.__robokassaRoutesInstalled) return;
  app.__robokassaRoutesInstalled = true;

  app.post('/api/robokassa/create', async (req, res) => {
    try {
      if (!isConfigured()) {
        return res.status(503).json({ ok: false, error: 'Robokassa пока не настроена на сервере' });
      }

      const auth = validateMaxInitData(req.headers['x-max-init-data'] || '');
      const requestedAmount = Number(req.body?.amount);
      const plan = TOPUP_PLANS[requestedAmount];

      if (!plan) {
        return res.status(400).json({ ok: false, error: 'Можно пополнить только на 200, 400 или 800 ₽' });
      }

      const user = await getOrCreateUser(auth.user);
      let invoiceId = '';
      let payment = null;

      for (let attempt = 0; attempt < 5; attempt += 1) {
        invoiceId = String(Date.now()) + String(Math.floor(Math.random() * 100));
        payment = await createPaymentRecord(user, plan, invoiceId);
        if (payment && String(payment.idempotence_key) === 'robokassa:' + invoiceId) break;
      }

      if (!payment || String(payment.idempotence_key) !== 'robokassa:' + invoiceId) {
        throw new Error('Не удалось создать платёж');
      }

      const paymentUrl = buildPaymentUrl(plan, invoiceId);

      try {
        await supabasePatch(
          'payments',
          { idempotence_key: 'eq.robokassa:' + invoiceId },
          { confirmation_url: paymentUrl }
        );
      } catch (storeUrlError) {
        console.error('[ROBOKASSA STORE URL]', storeUrlError.response?.data || storeUrlError.message);
      }

      res.json({
        ok: true,
        paymentUrl,
        invoiceId,
        amount: plan.amount,
        bonus: plan.bonus,
        creditedAmount: plan.credited
      });
    } catch (error) {
      console.error('[POST /api/robokassa/create]', error.response?.data || error.message);
      res.status(400).json({ ok: false, error: error.message || 'Не удалось создать платёж' });
    }
  });

  app.post('/api/robokassa/result', express.urlencoded({ extended: false, limit: '50kb' }), async (req, res) => {
    const outSum = String(req.body?.OutSum || req.body?.out_sum || '').trim();
    const invoiceId = String(req.body?.InvId || req.body?.InvoiceID || req.body?.invoiceId || '').trim();
    const signatureValue = String(req.body?.SignatureValue || req.body?.signatureValue || '').trim();

    try {
      if (!ROBOKASSA_MERCHANT_LOGIN || !ROBOKASSA_PASSWORD2 || !SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(503).send('Service unavailable');
      }

      if (!outSum || !invoiceId || !signatureValue) {
        return res.status(400).send('Invalid notification');
      }

      const expectedSignature = md5(outSum + ':' + invoiceId + ':' + ROBOKASSA_PASSWORD2);
      if (!safeEqualHex(signatureValue, expectedSignature)) {
        console.error('[ROBOKASSA RESULT] Invalid signature', { invoiceId });
        return res.status(400).send('Invalid signature');
      }

      const payments = await supabaseGet('payments', {
        idempotence_key: 'eq.robokassa:' + invoiceId,
        select: '*',
        limit: 1
      });
      if (!payments.length) {
        console.error('[ROBOKASSA RESULT] Payment not found', invoiceId);
        return res.status(404).send('Payment not found');
      }

      const payment = payments[0];
      const expectedAmount = normalizeMoney(payment.amount);
      const receivedAmount = normalizeMoney(outSum);
      if (!expectedAmount || !receivedAmount || expectedAmount !== receivedAmount) {
        console.error('[ROBOKASSA RESULT] Amount mismatch', { invoiceId, expectedAmount, receivedAmount });
        return res.status(400).send('Amount mismatch');
      }

      const rpcResult = await supabaseRpc('process_robokassa_payment', {
        p_idempotence_key: 'robokassa:' + invoiceId
      });

      console.log('[ROBOKASSA RESULT] Payment processed', {
        invoiceId,
        result: rpcResult
      });

      return res.send('OK' + invoiceId);
    } catch (error) {
      console.error('[POST /api/robokassa/result]', error.response?.data || error.message);
      return res.status(500).send('Temporary error');
    }
  });
}

function frontendAdapterScript() {
  return `<script>(function(){
function installRobokassaUi(){
  try{
    if(window.__robokassaUiInstalled)return true;
    var button=document.getElementById('test-topup');
    if(!button||typeof window.apiFetch!=='function')return false;
    var original=window.processTestTopup;
    if(typeof original!=='function')return false;

    button.textContent='Перейти к оплате';
    var description=document.querySelector('.topup-description');
    if(description)description.textContent='Выберите сумму пополнения. Бонус начисляется автоматически после успешной оплаты.';
    var note=document.querySelector('.test-note');
    if(note)note.textContent='После оплаты баланс пополнится автоматически.';

    window.processTestTopup=async function(){
      var busy=document.getElementById('test-topup');
      if(busy)busy.disabled=true;
      try{
        var selected=document.querySelector('.amount.selected');
        var amount=Number(selected&&selected.dataset?selected.dataset.amount:0);
        var data=await window.apiFetch('/api/robokassa/create',{method:'POST',body:JSON.stringify({amount:amount})},20000);
        if(!data.ok||!data.paymentUrl)throw new Error(data.error||'Не удалось создать платёж.');
        var webApp=window.WebApp||null;
        if(webApp&&typeof webApp.openLink==='function')webApp.openLink(data.paymentUrl);
        else window.location.href=data.paymentUrl;
      }catch(error){
        console.error('[ROBOKASSA UI]',error);
        if(typeof window.showStatus==='function')window.showStatus(error.message||'Ошибка оплаты.','error');
      }finally{
        if(busy)busy.disabled=false;
      }
    };

    document.addEventListener('visibilitychange',function(){
      if(document.visibilityState==='visible'&&typeof window.loadUser==='function'){
        setTimeout(function(){window.loadUser().catch(function(){});},700);
      }
    });

    window.__robokassaUiInstalled=true;
    console.log('[ROBOKASSA UI] installed');
    return true;
  }catch(error){
    console.warn('[ROBOKASSA UI] install failed',error);
    return false;
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installRobokassaUi);else installRobokassaUi();
})();</script>`;
}

const originalListen = express.application.listen;
express.application.listen = function(...args) {
  try {
    installRoutes(this);
  } catch (error) {
    console.error('[ROBOKASSA ROUTES] install failed', error);
  }
  return originalListen.apply(this, args);
};

const originalSend = express.response.send;
express.response.send = function(body) {
  try {
    if (
      typeof body === 'string' &&
      body.includes('<html') &&
      body.includes('id="test-topup"') &&
      body.includes('</body>') &&
      !body.includes('[ROBOKASSA UI] installed')
    ) {
      body = body.replace('</body>', frontendAdapterScript() + '</body>');
    }
  } catch (error) {
    console.error('[ROBOKASSA HTML INJECT]', error.message);
  }
  return originalSend.call(this, body);
};

console.log('[ROBOKASSA] integration module loaded', {
  merchantConfigured: Boolean(ROBOKASSA_MERCHANT_LOGIN),
  supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_KEY),
  maxConfigured: Boolean(MAX_BOT_TOKEN),
  siteUrl: SITE_URL
});
