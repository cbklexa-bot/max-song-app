const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

// Production recovery/history layer for the existing Wan 2.6 runtime.
// It replaces only GET /api/video/orders and adds a client-side video history.

const VIDEO_ROOT = '/data/video-results';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const PIAPI_KEY = process.env.PIAPI_KEY || '';
const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN || '';

fs.mkdirSync(VIDEO_ROOT, { recursive: true });

const dbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json',
  Prefer: 'return=representation'
};

function safeText(value, max = 1500) {
  return String(value ?? '').trim().slice(0, max);
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
    if (i >= 0) params[part.slice(0, i)] = part.slice(i + 1);
  }
  const received = params.hash;
  if (!received) throw new Error('MAX initData hash is missing');
  const values = {};
  for (const key of Object.keys(params)) if (key !== 'hash') values[key] = decode(params[key]);
  const check = Object.keys(values).sort().map((key) => key + '=' + values[key]).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(MAX_BOT_TOKEN).digest();
  const calculated = crypto.createHmac('sha256', secret).update(check, 'utf8').digest('hex');
  const a = Buffer.from(decode(received), 'hex');
  const b = Buffer.from(calculated, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('Invalid MAX initData signature');
  let user = null;
  if (values.user) {
    try { user = JSON.parse(values.user); } catch (_) { user = null; }
  }
  if (!user?.id) throw new Error('MAX user data is missing');
  return user;
}

async function dbGet(table, query) {
  return (await axios.get(SUPABASE_URL + '/rest/v1/' + table, { headers: dbHeaders, params: query, timeout: 20000 })).data;
}
async function dbPatch(table, query, body) {
  return (await axios.patch(SUPABASE_URL + '/rest/v1/' + table, body, { headers: dbHeaders, params: query, timeout: 20000 })).data;
}
async function dbPost(table, body) {
  return (await axios.post(SUPABASE_URL + '/rest/v1/' + table, body, { headers: dbHeaders, timeout: 20000 })).data;
}
async function getUser(maxId) {
  const rows = await dbGet('users', { max_id: 'eq.' + String(maxId), select: '*', limit: 1 });
  if (!rows.length) throw new Error('Пользователь не найден');
  return rows[0];
}
async function piapiTask(taskId) {
  return (await axios.get('https://api.piapi.ai/api/v1/task/' + encodeURIComponent(taskId), {
    headers: { 'x-api-key': PIAPI_KEY }, timeout: 60000
  })).data;
}
function taskData(response) { return response?.data ?? response ?? {}; }
function taskStatus(response) {
  const data = taskData(response);
  return String(data.status || data.task_status || data.data?.status || 'unknown').toLowerCase();
}
function taskOutputUrl(response) {
  const data = taskData(response);
  const output = data.output ?? data.data?.output ?? {};
  return output.video_url || output.videoUrl || output.video || output.url || null;
}
function providerError(response) {
  const data = taskData(response);
  return safeText(data.error?.message || data.error?.raw_message || data.detail?.message || response?.message || 'PiAPI завершил генерацию с ошибкой', 1000);
}
function stageFor(status) {
  switch (String(status || '').toLowerCase()) {
    case 'pending': case 'queued': return { key: 'queued', label: '1/4 Заказ принят. Готовим генерацию…' };
    case 'processing': case 'running': case 'generating': return { key: 'generating', label: '2/4 Wan 2.6 создаёт видео…' };
    default: return { key: 'processing', label: '2/4 Wan 2.6 обрабатывает заказ…' };
  }
}

async function downloadVideo(remoteUrl) {
  const parsed = new URL(String(remoteUrl || ''));
  if (parsed.protocol !== 'https:') throw new Error('Источник видео использует небезопасный протокол');
  const allowed = new Set(['img.theapi.app', 'storage.theapi.app', 's.bmnmny.cn']);
  if (!allowed.has(parsed.hostname.toLowerCase())) throw new Error('Источник видео не разрешён');
  const response = await axios.get(remoteUrl, {
    responseType: 'arraybuffer', timeout: 120000,
    maxContentLength: 120 * 1024 * 1024, maxBodyLength: 120 * 1024 * 1024,
    headers: { 'Accept-Encoding': 'identity' }
  });
  const name = crypto.randomBytes(18).toString('hex') + '.mp4';
  fs.writeFileSync(path.join(VIDEO_ROOT, name), response.data, { flag: 'wx' });
  return name;
}

async function refundOrder(order, reason) {
  if (!order || !['creating', 'processing'].includes(String(order.status))) return order;
  const user = await getUser(order.max_id);
  const amount = Number(order.price || 0);
  const balance = Number(user.balance || 0);
  const newBalance = balance + amount;

  const balanceRows = await dbPatch('users', {
    max_id: 'eq.' + String(order.max_id),
    balance: 'eq.' + String(balance)
  }, { balance: newBalance });
  if (!balanceRows.length) return order;

  const orderRows = await dbPatch('video_orders', {
    id: 'eq.' + String(order.id),
    max_id: 'eq.' + String(order.max_id),
    status: 'in.(creating,processing)'
  }, {
    status: 'failed',
    error: safeText(reason, 1000),
    updated_at: new Date().toISOString()
  });
  if (!orderRows.length) return order;

  try {
    await dbPost('transactions', {
      user_id: order.max_id,
      type: 'video_refund',
      amount,
      description: 'Возврат средств за неудачную генерацию видео',
      order_id: null
    });
  } catch (error) {
    console.error('[VIDEO RECOVERY REFUND TX]', error.response?.data || error.message);
  }

  Object.assign(order, {
    status: 'failed',
    error: safeText(reason, 1000),
    refunded: true,
    refund_amount: amount
  });
  return order;
}

async function processOrder(order, req) {
  if (!['creating', 'processing'].includes(String(order.status))) return order;
  if (!order.task_id) return refundOrder(order, 'PiAPI не вернул task_id. Средства возвращены.');

  let response;
  try {
    response = await piapiTask(order.task_id);
  } catch (error) {
    order.progress_stage = 'checking';
    order.progress_label = '2/4 Проверяем статус генерации…';
    return order;
  }

  const status = taskStatus(response);
  order.provider_status = status;
  const stage = stageFor(status);
  order.progress_stage = stage.key;
  order.progress_label = stage.label;

  if (['failed', 'error', 'cancelled', 'canceled'].includes(status)) {
    return refundOrder(order, providerError(response));
  }
  if (!['completed', 'success', 'succeeded', 'done'].includes(status)) return order;

  const remoteUrl = taskOutputUrl(response);
  if (!remoteUrl) return refundOrder(order, 'Wan 2.6 сообщил о завершении, но готовое видео не было получено. Средства возвращены.');

  try {
    order.progress_stage = 'downloading';
    order.progress_label = '3/4 Сохраняем готовое видео…';
    const storedName = await downloadVideo(remoteUrl);
    const publicUrl = (String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim() + '://' + req.get('host')) + '/video-results/' + storedName;
    const rows = await dbPatch('video_orders', {
      id: 'eq.' + String(order.id), max_id: 'eq.' + String(order.max_id), status: 'in.(creating,processing)'
    }, {
      status: 'completed', video_url: publicUrl, error: null, updated_at: new Date().toISOString()
    });
    if (rows[0]) Object.assign(order, rows[0]);
    order.progress_stage = 'completed';
    order.progress_label = '4/4 Видео готово.';
    return order;
  } catch (error) {
    return refundOrder(order, safeText('Не удалось сохранить готовое видео: ' + (error.message || 'неизвестная ошибка'), 1000));
  }
}

function installOrdersRoute() {
  if (express.application.__aiVideoRecoveryV2Installed) return;
  express.application.__aiVideoRecoveryV2Installed = true;
  const originalGet = express.application.get;
  express.application.get = function patchedGet(pathname, ...handlers) {
    if (pathname === '/api/video/orders' && handlers.length) {
      return originalGet.call(this, pathname, async (req, res) => {
        try {
          const user = validateMax(req.headers['x-max-init-data'] || req.query.initData || '');
          const orders = await dbGet('video_orders', {
            max_id: 'eq.' + String(user.id), select: '*', order: 'created_at.desc', limit: 30
          });
          for (const order of orders) await processOrder(order, req);
          res.json({ ok: true, orders });
        } catch (error) {
          console.error('[GET /api/video/orders V2]', error.response?.data || error.message);
          res.status(400).json({ ok: false, error: error.message || 'Не удалось получить видео-заказы' });
        }
      });
    }
    return originalGet.call(this, pathname, ...handlers);
  };
}

const originalSend = express.response.send;
const css = `<style id="ai-video-history-v2-style">
#ai-video-history{margin:14px 0 0;padding:14px;border-radius:20px;border:1px solid rgba(255,255,255,.09);background:rgba(17,13,27,.78);box-shadow:0 18px 48px rgba(0,0,0,.22)}
#ai-video-history h3{margin:0 0 11px;font-size:13px;font-weight:950}.ai-video-history-empty{padding:13px 8px;color:rgba(255,255,255,.32);font-size:9px;text-align:center}
.ai-video-order{padding:11px;margin-top:8px;border-radius:15px;border:1px solid rgba(255,255,255,.06);background:rgba(5,3,10,.50)}.ai-video-order:first-child{margin-top:0}
.ai-video-order-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.ai-video-order-title{font-size:10px;font-weight:900;color:#f2ebf7}.ai-video-order-meta{margin-top:3px;color:rgba(255,255,255,.30);font-size:7.5px}
.ai-video-order-pill{display:inline-flex;padding:4px 7px;border-radius:999px;font-size:7px;font-weight:900;white-space:nowrap}.ai-video-order-pill.processing{color:#d9bdff;background:rgba(145,72,255,.10)}.ai-video-order-pill.completed{color:#7be7c4;background:rgba(24,201,150,.08)}.ai-video-order-pill.failed{color:#ffb4bc;background:rgba(255,97,112,.08)}
.ai-video-order-progress{margin-top:8px;color:#c9b3df;font-size:8px;line-height:1.45}.ai-video-order-error{margin-top:8px;color:#ffb4bc;font-size:8px;line-height:1.45}.ai-video-order-refund{margin-top:6px;color:#75e3c1;font-size:7.5px;font-weight:800}.ai-video-order-video{display:block;width:100%;max-height:360px;margin-top:9px;border-radius:12px;background:#000}
</style>`;

const script = `<script id="ai-video-history-v2-script">
(function(){
  if(window.__AI_VIDEO_HISTORY_V2__)return;window.__AI_VIDEO_HISTORY_V2__=true;
  function initData(){try{return window.WebApp&&window.WebApp.initData||''}catch(e){return ''}}
  function visible(){var p=document.getElementById('ai-video-gift-page');return !!p&&getComputedStyle(p).display!=='none'}
  function esc(v){return String(v==null?'':v).replace(/[&<>\"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c])})}
  function nameOf(t){return ({photos:'Видео из фотографий',singing:'Поющее фото',character:'Поздравление от персонажа'})[t]||'Видео'}
  function dateOf(v){try{return new Date(v).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}catch(e){return ''}}
  function box(){var p=document.getElementById('ai-video-gift-page');if(!p)return null;var b=document.getElementById('ai-video-history');if(b)return b;b=document.createElement('section');b.id='ai-video-history';b.innerHTML='<h3>🎬 Мои видео</h3><div class="ai-video-history-list"><div class="ai-video-history-empty">Здесь появятся созданные видео.</div></div>';var how=p.querySelector('.how');if(how)how.insertAdjacentElement('afterend',b);else p.querySelector('.wrap')?.appendChild(b);return b}
  function render(listData){var b=box();if(!b)return;var list=b.querySelector('.ai-video-history-list');if(!listData.length){list.innerHTML='<div class="ai-video-history-empty">Здесь появятся созданные видео.</div>';return}list.innerHTML=listData.map(function(o){var c=o.status==='completed'?'completed':o.status==='failed'?'failed':'processing';var pill=o.status==='completed'?'Готово':o.status==='failed'?'Ошибка':'В работе';var body='';if(o.status==='completed'&&o.video_url)body='<video class="ai-video-order-video" controls playsinline preload="metadata" src="'+esc(o.video_url)+'"></video>';else if(o.status==='failed')body='<div class="ai-video-order-error">'+esc(o.error||'Генерация завершилась ошибкой.')+'</div>'+(o.refunded||o.refund_amount?'<div class="ai-video-order-refund">Средства возвращены: '+esc(o.refund_amount||o.price||0)+' ₽</div>':'');else body='<div class="ai-video-order-progress">'+esc(o.progress_label||'2/4 Wan 2.6 создаёт видео…')+'</div>';return '<article class="ai-video-order"><div class="ai-video-order-head"><div><div class="ai-video-order-title">'+esc(nameOf(o.type))+'</div><div class="ai-video-order-meta">'+esc(dateOf(o.created_at))+' · '+esc(o.price||327)+' ₽</div></div><span class="ai-video-order-pill '+c+'">'+pill+'</span></div>'+body+'</article>'}).join('')}
  async function load(){if(!visible())return;try{box();var r=await fetch('/api/video/orders',{headers:{'X-MAX-Init-Data':initData()}}),d=await r.json();if(!d.ok)throw new Error(d.error||'Не удалось получить видео-заказы');render(Array.isArray(d.orders)?d.orders:[]);var u=await fetch('/api/user',{headers:{'X-MAX-Init-Data':initData()}}).then(function(x){return x.json()});if(u.ok&&u.user){var v=Math.round(Number(u.user.balance||0))+' ₽',a=document.getElementById('balance-value'),h=document.getElementById('ai-home-account-balance-value');if(a)a.textContent=v;if(h)h.textContent=v}}catch(e){console.warn('[AI VIDEO HISTORY V2]',e.message)}}
  function start(){box();setInterval(load,5000);setTimeout(load,600)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
</script>`;

function inject(body){
  if(typeof body!=='string'||!body.includes('<body'))return body;
  if(body.includes('ai-video-history-v2-script'))return body;
  return body.replace(/<\/body>/i,css+'\n'+script+'\n</body>');
}

installOrdersRoute();
express.response.send=function patchedSend(body){return originalSend.call(this,inject(body))};
console.log('[AI VIDEO RECOVERY V2] loaded');
