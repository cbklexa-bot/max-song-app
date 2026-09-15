const express = require('express');

const SUPA = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPAKEY = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '').trim();

const PLANS = Object.freeze({
  200: { amount: 200, bonus: 0, credited: 200 },
  400: { amount: 400, bonus: 20, credited: 420 },
  800: { amount: 800, bonus: 80, credited: 880 }
});

async function patchPayment(invoiceId, plan) {
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
      body: JSON.stringify({ bonus: plan.bonus, credited_amount: plan.credited })
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
        let responseBody = null;
        const originalJson = res.json;
        res.json = function pricingFixedJson(body) {
          responseBody = body;
          return originalJson.call(this, body);
        };
        await original.call(this, req, res, next);
        const amount = Number(req.body?.amount);
        const plan = PLANS[amount];
        if (plan && responseBody && responseBody.ok && responseBody.invoiceId) {
          await patchPayment(responseBody.invoiceId, plan);
        }
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
  return result;
};

const originalSend = express.response.send;
express.response.send = function pricingFixedSend(body) {
  try {
    if (typeof body === 'string' && body.includes('</body>') && body.includes('test-topup') && !body.includes('robokassa-pricing-fix-client')) {
      const script = `<script id="robokassa-pricing-fix-client">(function(){function fix(){document.querySelectorAll('.amount').forEach(function(el){var a=Number(el.dataset.amount||0),r=el.querySelector('.amount-right'),s=el.querySelector('.amount-left small');if(!r)return;if(a===200){r.textContent='200 ₽';if(s)s.textContent='Без бонуса'}if(a===400){r.textContent='420 ₽';if(s)s.textContent='Бонус +5%'}if(a===800){r.textContent='880 ₽';if(s)s.textContent='Бонус +10%'}})}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fix);else fix();setTimeout(fix,300);setTimeout(fix,1000)})();</script>`;
      body = body.replace('</body>', script + '</body>');
    }
  } catch (error) {
    console.error('[ROBOKASSA PRICING FIX] client inject failed', error.message);
  }
  return originalSend.call(this, body);
};

console.log('[ROBOKASSA PRICING FIX] 200/400(+5%)/800(+10%) active');
