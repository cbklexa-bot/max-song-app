const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

// Recovery/history layer for the existing Wan 2.6 video runtime.
// It replaces only GET /api/video/orders when the base runtime registers it.
// The purpose is to: keep failed orders visible, refund failed processing,
// expose a progress stage, and provide a stable history endpoint for the UI.

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const PIAPI_KEY = process.env.PIAPI_KEY || '';
const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN || '';

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
  for (const key of Object.keys(params)) {
    if (key !== 'hash') values[key] = decode(params[key]);
  }

  const check = Object.keys(values).sort().map((key) => key + '=' + values[key]).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(MAX_BOT_TOKEN).digest();
  const calculated = crypto.createHmac('sha256', secret).update(check, 'utf8').digest('hex');

  const a = Buffer.from(decode(received), 'hex');
  const b = Buffer.from(calculated, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('Invalid MAX initData signature');
  }

  let user = null;
  if (values.user) {
    try { user = JSON.parse(values.user); } catch (_) { user = null; }
  }
  if (!user?.id) throw new Error('MAX user data is missing');
  return user;
}

async function dbGet(table, query) {
  return (await axios.get(SUPABASE_URL + '/rest/v1/' + table, {
    headers: dbHeaders,
    params: query,
    timeout: 20000
  })).data;
}

async function dbPatch(table, query, body) {
  return (await axios.patch(SUPABASE_URL + '/rest/v1/' + table, body, {
    headers: dbHeaders,
    params: query,
    timeout: 20000
  })).data;
}

async function dbPost(table, body) {
  return (await axios.post(SUPABASE_URL + '/rest/v1/' + table, body, {
    headers: dbHeaders,
    timeout: 20000
  })).data;
}

async function getUser(maxId) {
  const rows = await dbGet('users', {
    max_id: 'eq.' + String(maxId),
    select: '*',
    limit: 1
  });
  if (!rows.length) throw new Error('Пользователь не найден');
  return rows[0];
}

async function piapiTask(taskId) {
  return (await axios.get(
    'https://api.piapi.ai/api/v1/task/' + encodeURIComponent(taskId),
    { headers: { 'x-api-key': PIAPI_KEY }, timeout: 60000 }
  )).data;
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
  return safeText(
    data.error?.message ||
    data.error?.raw_message ||
    data.detail?.message ||
    response?.message ||
    'PiAPI завершил генерацию с ошибкой',
    1000
  );
}

function stageFor(status) {
  switch (String(status || '').toLowerCase()) {
    case 'pending':
    case 'queued':
      return { key: 'queued', label: '1/4 Заказ принят. Готовим генерацию…' };
    case 'processing':
    case 'running':
    case 'generating':
      return { key: 'generating', label: '2/4 Wan 2.6 создаёт видео…' };
    case 'completed':
      return { key: 'completed', label: '4/4 Видео готово.' };
    default:
      return { key: 'processing', label: '2/4 Wan 2.6 обрабатывает заказ…' };
  }
}

async function refundFailedOrder(order, reason) {
  if (!order || !['creating', 'processing'].includes(String(order.status))) return order;

  const user = await getUser(order.max_id);
  const amount = Number(order.price || 0);
  const newBalance = Number(user.balance || 0) + amount;

  await dbPatch('users', {
    max_id: 'eq.' + String(order.max_id),
    balance: 'eq.' + String(user.balance || 0)
  }, { balance: newBalance });

  await dbPatch('video_orders', {
    id: 'eq.' + String(order.id),
    max_id: 'eq.' + String(order.max_id),
    status: 'in.(creating,processing)'
  }, {
    status: 'failed',
    error: safeText(reason, 1000),
    updated_at: new Date().toISOString()
  });

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

  order.status = 'failed';
  order.error = safeText(reason, 1000);
  order.refunded = true;
  order.refund_amount = amount;
  return order;
}

async function processOneOrder(req, order) {
  if (!['processing', 'creating'].includes(String(order.status))) return order;
  if (!order.task_id) return refundFailedOrder(order, 'Заказ не получил task_id от PiAPI. Средства возвращены.');

  let response;
  try {
    response = await piapiTask(order.task_id);
  } catch (error) {
    // A temporary status-check network error must not refund a live generation.
    order.progress_stage = 'checking';
    order.progress_label = '2/4 Проверяем статус генерации…';
    order.progress_retry = true;
    order.progress_error = safeText(error.response?.data?.message || error.message, 500);
    return order;
  }

  const status = taskStatus(response);
  const stage = stageFor(status);
  order.progress_stage = stage.key;
  order.progress_label = stage.label;
  order.provider_status = status;

  if (['failed', 'error', 'cancelled', 'canceled'].includes(status)) {
    return refundFailedOrder(order, providerError(response));
  }

  if (!['completed', 'success', 'succeeded', 'done'].includes(status)) return order;

  const remoteUrl = taskOutputUrl(response);
  if (!remoteUrl) {
    return refundFailedOrder(order, 'Wan 2.6 сообщил о завершении, но не вернул готовый video_url. Средства возвращены.');
  }

  order.progress_stage = 'downloading';
  order.progress_label = '3/4 Сохраняем готовое видео…';

  // The base runtime normally downloads the file and writes video_url.
  // We only recover the order state here when it already has a usable URL.
  // A separate internal download is intentionally avoided to prevent duplicate files.
  if (order.video_url) {
    order.status = 'completed';
    order.progress_stage = 'completed';
    order.progress_label = '4/4 Видео готово.';
    return order;
  }

  // The original runtime may not have persisted the local URL yet. Keep the
  // task visible as completed rather than silently charging forever. The UI
  // can still show the provider URL as a fallback link during this state.
  order.status = 'completed';
  order.video_url = remoteUrl;
  order.progress_stage = 'completed';
  order.progress_label = '4/4 Видео готово.';
  return order;
}

function install() {
  const originalGet = express.application.get;
  if (express.application.__aiVideoRecoveryInstalled) return;
  express.application.__aiVideoRecoveryInstalled = true;

  express.application.get = function patchedGet(pathname, ...handlers) {
    if (pathname === '/api/video/orders' && handlers.length) {
      const handler = handlers[handlers.length - 1];
      const wrapped = async function videoOrdersRecovery(req, res, next) {
        try {
          const auth = validateMax(req.headers['x-max-init-data'] || req.query.initData || '');
          const maxId = String(auth.id);
          const orders = await dbGet('video_orders', {
            max_id: 'eq.' + maxId,
            select: '*',
            order: 'created_at.desc',
            limit: 30
          });

          for (const order of orders) {
            await processOneOrder(req, order);
          }

          res.json({ ok: true, orders });
        } catch (error) {
          console.error('[GET /api/video/orders RECOVERY]', error.response?.data || error.message);
          if (typeof next === 'function') return next(error);
          res.status(400).json({ ok: false, error: error.message || 'Не удалось получить видео-заказы' });
        }
      };
      return originalGet.call(this, pathname, wrapped);
    }
    return originalGet.call(this, pathname, ...handlers);
  };
}

const originalSend = express.response.send;
const style = `<style id="ai-video-history-style">
#ai-video-history{margin:14px 0 0;padding:14px;border-radius:20px;border:1px solid rgba(255,255,255,.09);background:rgba(17,13,27,.78);box-shadow:0 18px 48px rgba(0,0,0,.22)}
#ai-video-history h3{margin:0 0 11px;font-size:13px;font-weight:950}
.ai-video-history-empty{padding:13px 8px;color:rgba(255,255,255,.32);font-size:9px;text-align:center}
.ai-video-order{padding:11px;margin-top:8px;border-radius:15px;border:1px solid rgba(255,255,255,.06);background:rgba(5,3,10,.50)}
.ai-video-order:first-child{margin-top:0}
.ai-video-order-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.ai-video-order-title{font-size:10px;font-weight:900;color:#f2ebf7}
.ai-video-order-meta{margin-top:3px;color:rgba(255,255,255,.30);font-size:7.5px}
.ai-video-order-pill{display:inline-flex;padding:4px 7px;border-radius:999px;font-size:7px;font-weight:900;white-space:nowrap}
.ai-video-order-pill.processing{color:#d9bdff;background:rgba(145,72,255,.10)}
.ai-video-order-pill.completed{color:#7be7c4;background:rgba(24,201,150,.08)}
.ai-video-order-pill.failed{color:#ffb4bc;background:rgba(255,97,112,.08)}
.ai-video-order-progress{margin-top:8px;color:#c9b3df;font-size:8px;line-height:1.45}
.ai-video-order-error{margin-top:8px;color:#ffb4bc;font-size:8px;line-height:1.45}
.ai-video-order-refund{margin-top:6px;color:#75e3c1;font-size:7.5px;font-weight:800}
.ai-video-order-video{display:block;width:100%;max-height:360px;margin-top:9px;border-radius:12px;background:#000}
</style>`;

const script = `<script id="ai-video-history-script">
(function(){
  if(window.__AI_VIDEO_HISTORY__)return;
  window.__AI_VIDEO_HISTORY__=true;

  function initData(){try{return window.WebApp&&window.WebApp.initData||''}catch(e){return ''}}
  function visiblePage(){var p=document.getElementById('ai-video-gift-page');if(!p)return false;return getComputedStyle(p).display!=='none'}
  function esc(v){return String(v==null?'':v).replace(/[&<>\"']/g,function(ch){return ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[ch])})}
  function typeName(type){return ({photos:'Видео из фотографий',singing:'Поющее фото',character:'Поздравление от персонажа'})[type]||'Видео'}
  function fmtDate(value){try{return new Date(value).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}catch(e){return ''}}

  function ensureBox(){
    var page=document.getElementById('ai-video-gift-page');
    if(!page)return null;
    var box=document.getElementById('ai-video-history');
    if(box)return box;
    box=document.createElement('section');
    box.id='ai-video-history';
    box.innerHTML='<h3>🎬 Мои видео</h3><div class="ai-video-history-list"><div class="ai-video-history-empty">Здесь появятся созданные видео.</div></div>';
    var how=page.querySelector('.how');
    if(how)how.insertAdjacentElement('afterend',box);else page.querySelector('.wrap')?.appendChild(box);
    return box;
  }

  function render(orders){
    var box=ensureBox();if(!box)return;
    var list=box.querySelector('.ai-video-history-list');
    if(!orders.length){list.innerHTML='<div class="ai-video-history-empty">Здесь появятся созданные видео.</div>';return}
    list.innerHTML=orders.map(function(order){
      var title=typeName(order.type);
      var status=order.status;
      var pillClass=status==='completed'?'completed':status==='failed'?'failed':'processing';
      var pill=status==='completed'?'Готово':status==='failed'?'Ошибка':'В работе';
      var extra='';
      if(status==='completed' && order.video_url){extra='<video class="ai-video-order-video" controls playsinline preload="metadata" src="'+esc(order.video_url)+'"></video>'}
      else if(status==='failed')extra='<div class="ai-video-order-error">'+esc(order.error||'Генерация завершилась ошибкой.')+'</div>'+(order.refunded||order.refund_amount?'<div class="ai-video-order-refund">Средства возвращены: '+esc(order.refund_amount||order.price||0)+' ₽</div>':'');
      else extra='<div class="ai-video-order-progress">'+esc(order.progress_label||'2/4 Wan 2.6 создаёт видео…')+'</div>';
      return '<article class="ai-video-order"><div class="ai-video-order-head"><div><div class="ai-video-order-title">'+esc(title)+'</div><div class="ai-video-order-meta">'+esc(fmtDate(order.created_at))+' · '+esc(order.price||327)+' ₽</div></div><span class="ai-video-order-pill '+pillClass+'">'+pill+'</span></div>'+extra+'</article>';
    }).join('');
  }

  async function load(){
    if(!visiblePage())return;
    try{
      ensureBox();
      var r=await fetch('/api/video/orders',{headers:{'X-MAX-Init-Data':initData()}});
      var d=await r.json();
      if(!d.ok)throw new Error(d.error||'Не удалось получить видео-заказы');
      render(Array.isArray(d.orders)?d.orders:[]);
      var user=await fetch('/api/user',{headers:{'X-MAX-Init-Data':initData()}}).then(function(x){return x.json()});
      if(user.ok&&user.user){var value=Math.round(Number(user.user.balance||0))+' ₽';var a=document.getElementById('balance-value'),b=document.getElementById('ai-home-account-balance-value');if(a)a.textContent=value;if(b)b.textContent=value;}
    }catch(error){console.warn('[AI VIDEO HISTORY]',error.message)}
  }

  function start(){
    ensureBox();
    setInterval(load,5000);
    setTimeout(load,500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
</script>`;

function inject(body){
  if(typeof body!=='string'||!body.includes('<body'))return body;
  if(body.includes('ai-video-history-script'))return body;
  return body.replace(/<\/body>/i,style+'\n'+script+'\n</body>');
}

install();

express.response.send = function patchedSend(body) {
  return originalSend.call(this, inject(body));
};

console.log('[AI VIDEO RECOVERY] history + failed-order recovery loaded');
