const express = require('express');

// Keep the Robokassa UI and API plan values synchronized with the production offer.
// Plans: 200 ₽ +0%, 400 ₽ +5%, 800 ₽ +10%.
const PLANS = Object.freeze({
  200: { amount: 200, bonus: 0, credited: 200 },
  400: { amount: 400, bonus: 20, credited: 420 },
  800: { amount: 800, bonus: 80, credited: 880 }
});

function patchRobokassaUi(html) {
  if (typeof html !== 'string' || !html.includes('class="amount"')) return html;
  try {
    return html.replace(/(<button class="amount selected" data-amount="200"[^>]*>)[\s\S]*?<\/button>\s*(<button class="amount" data-amount="400"[^>]*>)[\s\S]*?<\/button>\s*(<button class="amount" data-amount="800"[^>]*>)[\s\S]*?<\/button>/, function(_, a, b, c) {
      return a + '<span class="amount-left"><strong>200 ₽</strong><small>Без бонуса</small></span><span class="amount-right">200 ₽</span></button>'
        + b + '<span class="amount-left"><strong>400 ₽ <span class="bonus">+5%</span></strong><small>Бонус +20 ₽</small></span><span class="amount-right">420 ₽</span></button>'
        + c + '<span class="amount-left"><strong>800 ₽ <span class="bonus">+10%</span></strong><small>Бонус +80 ₽</small></span><span class="amount-right">880 ₽</span></button>';
    }).replace(/selectedTopupAmount===400\)credit=440;if\(selectedTopupAmount===800\)credit=960;/, 'selectedTopupAmount===400?credit=420:selectedTopupAmount===800?credit=880:credit=200;');
  } catch (error) {
    console.error('[ROBOKASSA PLANS UI]', error.message);
    return html;
  }
}

function install(app) {
  if (app.__robokassaPlansFixInstalled) return;
  app.__robokassaPlansFixInstalled = true;
  const originalSend = express.response.send;
  express.response.send = function(body) {
    try { body = patchRobokassaUi(body); } catch (_) {}
    return originalSend.call(this, body);
  };
  console.log('[ROBOKASSA PLANS] 200/0%, 400/5%, 800/10%');
}

module.exports = { PLANS, install };
