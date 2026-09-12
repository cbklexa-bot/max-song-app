const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

// Final video order recovery/history layer.
// It supersedes the previous recovery route without creating a second app/backend.

const VIDEO_ROOT = '/data/video-results';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const PIAPI_KEY = process.env.PIAPI_KEY || '';
const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN || '';
const VIDEO_PRICE = 350;

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
  return (await axios.get(SUPABASE_URL + '/rest/v1/' + table, {
    headers: dbHeaders, params: query, timeout: 20000
  })).data;
}

async function dbPatch(table, query, body) {
  return (await axios.patch(SUPABASE_URL + '/rest/v1/' + table, body, {
    headers: dbHeaders, params: query, timeout: 20000
  })).data;
}

async function dbPost(table, body) {
  return (await axios.post(SUPABASE_URL + '/rest/v1/' + table, body, {
    headers: dbHeaders, timeout: 20000
  })).data;
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
  return safeText(
    data.error?.message || data.error?.raw_message || data.detail?.message || response?.message || 'PiAPI завершил генерацию с ошибкой',
    1000
  );
}

function stageFor(status) {
  switch (String(status || '').toLowerCase()) {
    case 'pending':
    case 'queued':
      return { key: 'queued', label: '1/4 Заказ принят. Готовим сцену…' };
    case 'processing':
    case 'running':
    case 'generating':
      return { key: 'generating', label: '2/4 Герой в кадре. Создаём поздравление…' };
    default:
      return { key: 'processing', label: '2/4 Wan 2.6 обрабатывает заказ…' };
  }
}

function publicOrigin(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  return proto + '://' + req.get('host');
}

async function downloadVideo(remoteUrl) {
  const parsed = new URL(String(remoteUrl || ''));
  if (parsed.protocol !== 'https:') throw new Error('Источник видео использует небезопасный протокол');
  const allowed = new Set(['img.theapi.app', 'storage.theapi.app', 's.bmnmny.cn']);
  if (!allowed.has(parsed.hostname.toLowerCase())) throw new Error('Источник видео не разрешён');

  const response = await axios.get(remoteUrl, {
    responseType: 'arraybuffer',
    timeout: 120000,
    maxContentLength: 120 * 1024 * 1024,
    maxBodyLength: 120 * 1024 * 1024,
    headers: { 'Accept-Encoding': 'identity' }
  });

  const name = crypto.randomBytes(18).toString('hex') + '.mp4';
  fs.writeFileSync(path.join(VIDEO_ROOT, name), response.data, { flag: 'wx' });
  return name;
}

async function refundOrder(order, reason) {
  if (!order || !['creating', 'processing'].includes(String(order.status))) return order;

  try {
    const user = await getUser(order.max_id);
    const amount = Number(order.price || VIDEO_PRICE);
    const balance = Number(user.balance || 0);

    const balanceRows = await dbPatch('users', {
      max_id: 'eq.' + String(order.max_id),
      balance: 'eq.' + String(balance)
    }, { balance: balance + amount });
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
    } catch (txError) {
      console.error('[VIDEO RECOVERY V3 REFUND TX]', txError.response?.data || txError.message);
    }

    Object.assign(order, {
      status: 'failed',
      error: safeText(reason, 1000),
      refunded: true,
      refund_amount: amount
    });
  } catch (error) {
    console.error('[VIDEO RECOVERY V3 REFUND]', error.response?.data || error.message);
  }

  return order;
}

async function processOrder(order, req) {
  if (!['creating', 'processing'].includes(String(order.status))) return order;
  if (!order.task_id) {
    order.progress_stage = 'checking';
    order.progress_label = 'Проверяем запуск генерации…';
    return order;
  }

  let response;
  try {
    response = await piapiTask(order.task_id);
  } catch (error) {
    order.provider_status = 'checking';
    order.progress_stage = 'checking';
    order.progress_label = 'Проверяем статус генерации…';
    console.warn('[VIDEO RECOVERY V3 PIAPI CHECK]', order.id, error.response?.data || error.message);
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
  if (!remoteUrl) {
    order.progress_stage = 'processing';
    order.progress_label = '3/4 Видео уже готово у PiAPI. Получаем файл…';
    return order;
  }

  order.progress_stage = 'downloading';
  order.progress_label = '3/4 Сохраняем готовое видео…';

  let finalUrl = remoteUrl;
  try {
    const storedName = await downloadVideo(remoteUrl);
    finalUrl = publicOrigin(req) + '/video-results/' + storedName;
    order.progress_label = '4/4 Видео готово.';
  } catch (error) {
    // A completed PiAPI task must NOT be refunded just because our local copy failed.
    // Keep the working provider URL so the user can watch the video immediately.
    console.warn('[VIDEO RECOVERY V3 LOCAL SAVE]', order.id, error.response?.data || error.message);
    order.progress_label = '4/4 Видео готово. Открываем готовый ролик…';
  }

  const nextInput = (order.input && typeof order.input === 'object')
    ? { ...order.input, remote_video_url: remoteUrl }
    : order.input;

  const rows = await dbPatch('video_orders', {
    id: 'eq.' + String(order.id),
    max_id: 'eq.' + String(order.max_id),
    status: 'in.(creating,processing)'
  }, {
    status: 'completed',
    video_url: finalUrl,
    input: nextInput,
    error: null,
    updated_at: new Date().toISOString()
  });

  if (rows[0]) Object.assign(order, rows[0]);
  order.progress_stage = 'completed';
  order.progress_label = '4/4 Видео готово.';
  return order;
}

async function reconcileUserOrders(maxId, req) {
  const orders = await dbGet('video_orders', {
    max_id: 'eq.' + String(maxId),
    status: 'in.(creating,processing)',
    select: '*',
    order: 'created_at.asc',
    limit: 5
  });
  for (const order of orders) await processOrder(order, req);
  return orders;
}

function installGetRoute() {
  if (express.application.__aiVideoRecoveryV3GetInstalled) return;
  express.application.__aiVideoRecoveryV3GetInstalled = true;
  const previousGet = express.application.get;

  express.application.get = function patchedGet(pathname, ...handlers) {
    if (pathname === '/api/video/orders' && handlers.length) {
      return previousGet.call(this, pathname, async (req, res) => {
        try {
          const user = validateMax(req.headers['x-max-init-data'] || req.query.initData || '');
          const orders = await dbGet('video_orders', {
            max_id: 'eq.' + String(user.id),
            select: '*',
            order: 'created_at.desc',
            limit: 30
          });
          for (const order of orders) await processOrder(order, req);
          res.json({ ok: true, orders });
        } catch (error) {
          console.error('[GET /api/video/orders V3]', error.response?.data || error.message);
          res.status(400).json({ ok: false, error: error.message || 'Не удалось получить видео-заказы' });
        }
      });
    }
    return previousGet.call(this, pathname, ...handlers);
  };
}

function installGenerateGuard() {
  if (express.application.__aiVideoRecoveryV3PostInstalled) return;
  express.application.__aiVideoRecoveryV3PostInstalled = true;
  const previousPost = express.application.post;

  express.application.post = function patchedPost(pathname, ...handlers) {
    if (pathname === '/api/video/generate' && handlers.length) {
      const handler = handlers.pop();
      const wrapped = async function recoveredGenerate(req, res, next) {
        try {
          const auth = validateMax(req.headers['x-max-init-data'] || req.body?.initData || '');
          await reconcileUserOrders(String(auth.id), req);
        } catch (error) {
          console.warn('[VIDEO RECOVERY V3 PRE-GENERATE]', error.response?.data || error.message);
        }
        return handler(req, res, next);
      };
      return previousPost.call(this, pathname, ...handlers, wrapped);
    }
    return previousPost.call(this, pathname, ...handlers);
  };
}

const originalSend = express.response.send;

const css = `<style id="ai-video-history-v3-style">
@keyframes aiVideoBars{0%,100%{transform:scaleY(.28);opacity:.45}50%{transform:scaleY(1);opacity:1}}
@keyframes aiVideoGlow{0%,100%{box-shadow:0 0 0 rgba(191,112,255,0)}50%{box-shadow:0 0 18px rgba(191,112,255,.18)}}
@keyframes aiVideoDots{0%{opacity:.2;transform:translateX(-8px)}50%{opacity:1;transform:translateX(0)}100%{opacity:.2;transform:translateX(8px)}}
#ai-video-history{margin:14px 0 0;padding:14px;border-radius:20px;border:1px solid rgba(255,255,255,.09);background:rgba(17,13,27,.78);box-shadow:0 18px 48px rgba(0,0,0,.22)}
#ai-video-history h3{margin:0 0 11px;font-size:13px;font-weight:950}
.ai-video-history-empty{padding:13px 8px;color:rgba(255,255,255,.32);font-size:9px;text-align:center}
.ai-video-order{padding:11px;margin-top:8px;border-radius:15px;border:1px solid rgba(255,255,255,.06);background:rgba(5,3,10,.50);animation:aiVideoGlow 3s ease-in-out infinite}
.ai-video-order:first-child{margin-top:0}
.ai-video-order-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.ai-video-order-title{font-size:10px;font-weight:900;color:#f2ebf7}.ai-video-order-meta{margin-top:3px;color:rgba(255,255,255,.30);font-size:7.5px}
.ai-video-order-pill{display:inline-flex;padding:4px 7px;border-radius:999px;font-size:7px;font-weight:900;white-space:nowrap}.ai-video-order-pill.processing{color:#d9bdff;background:rgba(145,72,255,.10)}.ai-video-order-pill.completed{color:#7be7c4;background:rgba(24,201,150,.08)}.ai-video-order-pill.failed{color:#ffb4bc;background:rgba(255,97,112,.08)}
.ai-video-progress{margin-top:9px;padding:10px;border-radius:13px;background:linear-gradient(120deg,rgba(145,72,255,.10),rgba(239,64,158,.05));border:1px solid rgba(192,112,255,.10);overflow:hidden}
.ai-video-progress-line{display:flex;align-items:center;gap:9px}.ai-video-eq{display:flex;align-items:flex-end;gap:2px;height:18px;width:28px}.ai-video-eq i{display:block;width:3px;border-radius:2px;background:#c78bff;animation:aiVideoBars 1s ease-in-out infinite}.ai-video-eq i:nth-child(1){height:7px}.ai-video-eq i:nth-child(2){height:14px;animation-delay:.12s}.ai-video-eq i:nth-child(3){height:10px;animation-delay:.24s}.ai-video-eq i:nth-child(4){height:17px;animation-delay:.36s}.ai-video-eq i:nth-child(5){height:9px;animation-delay:.48s}
.ai-video-progress-copy{min-width:0;color:#e1d2ed;font-size:8px;line-height:1.4}.ai-video-progress-copy b{display:block;color:#fff;font-size:8.5px}.ai-video-progress-note{margin-top:7px;color:rgba(255,255,255,.35);font-size:7.3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ai-video-ready{margin-top:9px;color:#7be7c4;font-size:8px;font-weight:900}.ai-video-order-video{display:block;width:100%;max-height:360px;margin-top:8px;border-radius:12px;background:#000}.ai-video-order-error{margin-top:8px;color:#ffb4bc;font-size:8px;line-height:1.45}.ai-video-order-refund{margin-top:6px;color:#75e3c1;font-size:7.5px;font-weight:800}
</style>`;

const script = `<script id="ai-video-history-v3-script">
(function(){
  if(window.__AI_VIDEO_HISTORY_V3__)return;window.__AI_VIDEO_HISTORY_V3__=true;
  function initData(){try{return window.WebApp&&window.WebApp.initData||''}catch(e){return ''}}
  function visible(){var p=document.getElementById('ai-video-gift-page');return !!p&&getComputedStyle(p).display!=='none'}
  function esc(v){return String(v==null?'':v).replace(/[&<>\"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c])})}
  function nameOf(t){return ({photos:'Видео из фотографий',singing:'Поющее фото',character:'Поздравление от персонажа'})[t]||'Видео в подарок'}
  function dateOf(v){try{return new Date(v).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}catch(e){return ''}}
  function box(){
    var p=document.getElementById('ai-video-gift-page');if(!p)return null;
    var b=document.getElementById('ai-video-history');if(b)return b;
    b=document.createElement('section');b.id='ai-video-history';
    b.innerHTML='<h3>🎬 Мои видео</h3><div class="ai-video-history-list"><div class="ai-video-history-empty">Здесь появятся созданные видео.</div></div>';
    var how=p.querySelector('.how');if(how)how.insertAdjacentElement('afterend',b);else p.querySelector('.wrap')?.appendChild(b);return b;
  }
  function processingHtml(o){
    var safeLabel=esc(o.progress_label||'2/4 Герой в кадре. Создаём поздравление…');
    return '<div class="ai-video-progress"><div class="ai-video-progress-line"><span class="ai-video-eq"><i></i><i></i><i></i><i></i><i></i></span><div class="ai-video-progress-copy"><b>'+safeLabel+'</b><span>Подготавливаем сцену, речь и звук…</span></div></div><div class="ai-video-progress-note">🎬 Сейчас: герой входит в кадр  ·  🎤 подбираем интонацию  ·  🎵 синхронизируем звук  ·  🎁 добавляем поздравление</div></div>';
  }
  function render(listData){
    var b=box();if(!b)return;var list=b.querySelector('.ai-video-history-list');
    if(!listData.length){list.innerHTML='<div class="ai-video-history-empty">Здесь появятся созданные видео.</div>';return}
    list.innerHTML=listData.map(function(o){
      var c=o.status==='completed'?'completed':o.status==='failed'?'failed':'processing';
      var pill=o.status==='completed'?'Готово':o.status==='failed'?'Ошибка':'Готовится';
      var body='';
      if(o.status==='completed'&&o.video_url){body='<div class="ai-video-ready">✅ Видео готово — можно смотреть</div><video class="ai-video-order-video" controls playsinline preload="metadata" src="'+esc(o.video_url)+'"></video>'}
      else if(o.status==='failed'){body='<div class="ai-video-order-error">'+esc(o.error||'Генерация завершилась ошибкой.')+'</div>'+(o.refunded||o.refund_amount?'<div class="ai-video-order-refund">Средства возвращены: '+esc(o.refund_amount||o.price||0)+' ₽</div>':'')}
      else body=processingHtml(o);
      return '<article class="ai-video-order"><div class="ai-video-order-head"><div><div class="ai-video-order-title">'+esc(nameOf(o.type))+'</div><div class="ai-video-order-meta">'+esc(dateOf(o.created_at))+' · '+esc(o.price||350)+' ₽</div></div><span class="ai-video-order-pill '+c+'">'+pill+'</span></div>'+body+'</article>';
    }).join('');
  }
  async function load(){
    if(!visible())return;
    try{
      box();
      var r=await fetch('/api/video/orders',{headers:{'X-MAX-Init-Data':initData()}}),d=await r.json();
      if(!d.ok)throw new Error(d.error||'Не удалось получить видео-заказы');
      render(Array.isArray(d.orders)?d.orders:[]);
      var u=await fetch('/api/user',{headers:{'X-MAX-Init-Data':initData()}}).then(function(x){return x.json()});
      if(u.ok&&u.user){var v=Math.round(Number(u.user.balance||0))+' ₽',a=document.getElementById('balance-value'),h=document.getElementById('ai-home-account-balance-value');if(a)a.textContent=v;if(h)h.textContent=v}
    }catch(e){console.warn('[AI VIDEO HISTORY V3]',e.message)}
  }
  function start(){box();setInterval(load,5000);setTimeout(load,600)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
</script>`;

installGetRoute();
installGenerateGuard();

express.response.send=function patchedSend(body){
  try{
    if(typeof body==='string'&&body.includes('<body')&&!body.includes('ai-video-history-v3-script')){
      body=body.replace(/<\/body>/i,css+'\n'+script+'\n</body>');
    }
  }catch(error){console.error('[AI VIDEO RECOVERY V3 INJECT]',error.message)}
  return originalSend.call(this,body);
};

console.log('[AI VIDEO RECOVERY V3] loaded: safe completion fallback + animated history + pre-generate recovery');
