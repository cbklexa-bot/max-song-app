const express = require('express');
const crypto = require('crypto');

const SUPA = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPAKEY = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '').trim();
const LOGIN = String(process.env.ROBOKASSA_MERCHANT_LOGIN || '').trim();
const PASS1 = String(process.env.ROBOKASSA_PASSWORD1 || '').trim();
const PAYMENT_URL = 'https://auth.robokassa.ru/Merchant/Index.aspx';

const PLANS = Object.freeze({
  200: { amount: 200, bonus: 0, credited: 200 },
  400: { amount: 400, bonus: 20, credited: 420 },
  800: { amount: 800, bonus: 80, credited: 880 }
});

function md5(value) { return crypto.createHash('md5').update(value, 'utf8').digest('hex'); }

function buildPaymentUrl800(invoiceId, email) {
  const outSum = '800.00';
  const signature = md5(LOGIN + ':' + outSum + ':' + String(invoiceId) + ':' + PASS1);
  const params = new URLSearchParams();
  params.set('MerchantLogin', LOGIN);
  params.set('OutSum', outSum);
  params.set('InvId', String(invoiceId));
  params.set('Description', 'Пополнение баланса Песня на заказ');
  params.set('SignatureValue', signature);
  params.append('PaymentMethods', 'BankCard');
  params.append('PaymentMethods', 'SBP');
  params.set('Culture', 'ru');
  params.set('Encoding', 'UTF-8');
  params.set('Email', String(email || ''));
  return PAYMENT_URL + '?' + params.toString();
}

async function patchPayment(invoiceId, plan, extra) {
  if (!SUPA || !SUPAKEY || !invoiceId || !plan) return;
  const headers = {
    apikey: SUPAKEY,
    Authorization: 'Bearer ' + SUPAKEY,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal'
  };
  const query = SUPA + '/rest/v1/payments?idempotence_key=eq.robokassa:' + encodeURIComponent(String(invoiceId));
  try {
    await fetch(query, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        amount: plan.amount,
        bonus: plan.bonus,
        credited_amount: plan.credited,
        ...(extra || {})
      })
    });
  } catch (error) {
    console.error('[ROBOKASSA PRICING FIX] DB patch failed', error.message);
  }
}

function installRoutePatch() {
  const stack = express.application?._router?.stack || express.application?.router?.stack || [];
  for (const layer of stack) {
    const route = layer && layer.route;
    if (!route || route.path !== '/api/robokassa/start-sbp') continue;
    const handlers = route.stack || [];
    for (const routeLayer of handlers) {
      if (!routeLayer || typeof routeLayer.handle !== 'function' || routeLayer.__pricingFixed) continue;
      const original = routeLayer.handle;
      routeLayer.handle = async function pricingFixedStart(req, res, next) {
        const requestedAmount = Number(req.body?.amount);
        const is800 = requestedAmount === 800;
        let responseBody = null;
        const originalJson = res.json;
        res.json = function pricingFixedJson(body) {
          responseBody = body;
          return res;
        };
        if (is800) req.body.amount = 700;
        try {
          await original.call(this, req, res, next);
        } finally {
          if (is800) req.body.amount = 800;
          res.json = originalJson;
        }

        const plan = PLANS[requestedAmount];
        if (!plan || !responseBody || !responseBody.ok || !responseBody.invoiceId) {
          return responseBody ? originalJson.call(res, responseBody) : undefined;
        }

        if (is800) {
          const email = String(req.body?.email || '');
          const paymentUrl = buildPaymentUrl800(responseBody.invoiceId, email);
          responseBody = {
            ...responseBody,
            amount: 800,
            bonus: 80,
            creditedAmount: 880,
            paymentUrl
          };
          await patchPayment(responseBody.invoiceId, plan, {
            confirmation_url: paymentUrl,
            metadata: {
              provider: 'robokassa',
              payment_method: 'BankCard/SBP',
              invoice_id: responseBody.invoiceId,
              email,
              plan_amount: 800
            }
          });
        } else {
          responseBody = {
            ...responseBody,
            amount: plan.amount,
            bonus: plan.bonus,
            creditedAmount: plan.credited
          };
          await patchPayment(responseBody.invoiceId, plan);
        }

        return originalJson.call(res, responseBody);
      };
      routeLayer.__pricingFixed = true;
    }
  }
}

const previousListen = express.application.listen;
express.application.listen = function pricingFixedListen(...args) {
  const result = previousListen.apply(this, args);
  setTimeout(installRoutePatch, 0);
  setTimeout(installRoutePatch, 100);
  setTimeout(installRoutePatch, 500);
  return result;
};

const originalSend = express.response.send;
express.response.send = function pricingFixedSend(body) {
  try {
    if (typeof body === 'string' && body.includes('</body>') && body.includes('test-topup') && !body.includes('robokassa-pricing-fix-client')) {
      const script = `<style id="robokassa-pricing-fix-style">.amount-right{display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:2px}.bonus-side{margin-left:0!important;background:none!important;padding:0!important;font-size:7px!important;font-weight:900!important;color:#ffd577!important;border:0!important}.bonus-orange{color:#ff9d3b!important}.amount-left small{display:none!important}</style><script id="robokassa-pricing-fix-client">(function(){function fix(){document.querySelectorAll('.amount').forEach(function(el){var a=Number(el.dataset.amount||0),r=el.querySelector('.amount-right'),s=el.querySelector('.amount-left small'),strong=el.querySelector('.amount-left strong');if(!r)return;if(s)s.textContent='';if(a===200){if(strong)strong.textContent='200 ₽';r.innerHTML='200 ₽'}if(a===400){if(strong)strong.textContent='400 ₽';r.innerHTML='420 ₽ <span class="bonus bonus-side">+5% бонус</span>'}if(a===800){if(strong)strong.textContent='800 ₽';r.innerHTML='880 ₽ <span class="bonus bonus-side bonus-orange">+10% бонус</span>'}})}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fix);else fix();setTimeout(fix,300);setTimeout(fix,1000)})();</script>`;
      body = body.replace('</body>', script + '</body>');
    }
  } catch (error) {
    console.error('[ROBOKASSA PRICING FIX] client inject failed', error.message);
  }
  return originalSend.call(this, body);
};

console.log('[ROBOKASSA PRICING FIX] 200/400(+5%)/800(+10%) active');
