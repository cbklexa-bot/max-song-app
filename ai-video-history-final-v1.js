const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

// Final, single owner of video history delivery for the existing Mini App.
// It replaces the fragile response.send-based history injection and the older
// recovery route collision. Loaded last, before server.js.

const RESULT_ROOT = '/data/video-results';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const PIAPI_KEY = process.env.PIAPI_KEY || '';
const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN || '';

fs.mkdirSync(RESULT_ROOT, { recursive: true });

const dbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json',
  Prefer: 'return=representation'
};

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

  const check = Object.keys(values)
    .sort()
    .map((key) => key + '=' + values[key])
    .join('\n');

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
    timeout: 30000
  })).data;
}

function taskData(response) { return response?.data ?? response ?? {}; }

function taskStatus(response) {
  const data = taskData(response);
  return String(data.status || data.task_status || data.data?.status || 'unknown').toLowerCase();
}

function taskVideoUrl(response) {
  const data = taskData(response);
  const output = data.output ?? data.data?.output ?? {};
  return output.video_url || output.videoUrl || output.video || output.url || null;
}

async function piapiTask(taskId) {
  return (await axios.get('https://api.piapi.ai/api/v1/task/' + encodeURIComponent(taskId), {
    headers: { 'x-api-key': PIAPI_KEY },
    timeout: 60000
  })).data;
}

async function downloadVideo(remoteUrl) {
  const parsed = new URL(String(remoteUrl || ''));
  if (parsed.protocol !== 'https:') throw new Error('Источник видео использует небезопасный протокол');

  const allowed = new Set(['img.theapi.app', 'storage.theapi.app', 's.bmnmny.cn']);
  if (!allowed.has(parsed.hostname.toLowerCase())) {
    throw new Error('Источник видео не разрешён');
  }

  const response = await axios.get(remoteUrl, {
    responseType: 'arraybuffer',
    timeout: 120000,
    maxContentLength: 120 * 1024 * 1024,
    maxBodyLength: 120 * 1024 * 1024,
    headers: { 'Accept-Encoding': 'identity' }
  });

  const name = crypto.randomBytes(18).toString('hex') + '.mp4';
  fs.writeFileSync(path.join(RESULT_ROOT, name), response.data, { flag: 'wx' });
  return name;
}

function publicOrigin(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  return proto + '://' + req.get('host');
}

async function processProcessingOrder(order, req) {
  if (!order || order.status !== 'processing' || !order.task_id) return order;

  let response;
  try {
    response = await piapiTask(order.task_id);
  } catch (error) {
    order.provider_status = 'checking';
    return order;
  }

  const status = taskStatus(response);
  order.provider_status = status;

  if (['failed', 'error', 'cancelled', 'canceled'].includes(status)) {
    order.error = 'PiAPI завершил генерацию видео с ошибкой';
    return order;
  }

  if (!['completed', 'success', 'succeeded', 'done'].includes(status)) return order;

  const remoteUrl = taskVideoUrl(response);
  if (!remoteUrl) {
    order.provider_status = 'completed_without_url';
    return order;
  }

  let finalUrl = remoteUrl;
  try {
    const storedName = await downloadVideo(remoteUrl);
    finalUrl = publicOrigin(req) + '/video-results/' + storedName;
  } catch (error) {
    console.warn('[AI VIDEO HISTORY FINAL LOCAL SAVE]', order.id, error.response?.data || error.message);
  }

  const rows = await dbPatch('video_orders', {
    id: 'eq.' + String(order.id),
    max_id: 'eq.' + String(order.max_id),
    status: 'eq.processing'
  }, {
    status: 'completed',
    video_url: finalUrl,
    error: null,
    updated_at: new Date().toISOString()
  });

  if (rows[0]) Object.assign(order, rows[0]);
  else {
    order.status = 'completed';
    order.video_url = finalUrl;
  }
  return order;
}

function installFinalOrdersRoute() {
  const originalGet = express.application.get;

  express.application.get = function finalVideoOrdersGet(pathname, ...handlers) {
    if (pathname === '/api/video/orders' && handlers.length) {
      return originalGet.call(this, pathname, async (req, res) => {
        try {
          const user = validateMax(req.headers['x-max-init-data'] || req.query.initData || '');
          const orders = await dbGet('video_orders', {
            max_id: 'eq.' + String(user.id),
            select: '*',
            order: 'created_at.desc',
            limit: 30
          });

          for (const order of orders) {
            if (order.status === 'processing') {
              await processProcessingOrder(order, req);
            }
          }

          console.log('[AI VIDEO HISTORY FINAL] orders:', orders.length, 'completed:', orders.filter((o) => o.status === 'completed').length);
          res.json({ ok: true, orders });
        } catch (error) {
          console.error('[GET /api/video/orders FINAL]', error.response?.data || error.message);
          res.status(400).json({ ok: false, error: error.message || 'Не удалось получить видео-заказы' });
        }
      });
    }

    return originalGet.call(this, pathname, ...handlers);
  };
}

const historyStyle = `<style id="ai-video-history-final-style">
#ai-video-history-final{margin:14px 0 0;padding:14px;border-radius:20px;border:1px solid rgba(255,255,255,.09);background:rgba(17,13,27,.78);box-shadow:0 18px 48px rgba(0,0,0,.22)}
#ai-video-history-final h3{margin:0 0 11px;font-size:13px;font-weight:950}
.ai-video-history-empty{padding:13px 8px;color:rgba(255,255,255,.32);font-size:9px;text-align:center}
.ai-video-order-final{padding:11px;margin-top:8px;border-radius:15px;border:1px solid rgba(255,255,255,.06);background:rgba(5,3,10,.50)}
.ai-video-order-final:first-child{margin-top:0}
.ai-video-order-head-final{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.ai-video-order-title-final{font-size:10px;font-weight:900;color:#f2ebf7}
.ai-video-order-meta-final{margin-top:3px;color:rgba(255,255,255,.30);font-size:7.5px}
.ai-video-order-pill-final{display:inline-flex;padding:4px 7px;border-radius:999px;font-size:7px;font-weight:900;white-space:nowrap}
.ai-video-order-pill-final.completed{color:#7be7c4;background:rgba(24,201,150,.08)}
.ai-video-order-pill-final.processing{color:#d9bdff;background:rgba(145,72,255,.10)}
.ai-video-order-pill-final.failed{color:#ffb4bc;background:rgba(255,97,112,.08)}
.ai-video-order-video-final{display:block;width:100%;max-height:420px;margin-top:9px;border-radius:13px;background:#000}
.ai-video-ready-final{margin-top:9px;color:#7be7c4;font-size:8px;font-weight:900}
.ai-video-download-final{display:inline-flex;margin-top:9px;padding:8px 11px;border-radius:10px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.08);color:#fff;text-decoration:none;font-size:8px;font-weight:900}
.ai-video-history-note-final{margin-top:9px;color:rgba(255,255,255,.34);font-size:7.5px;line-height:1.45}
</style>`;

const historyScript = `<script id="ai-video-history-final-script">
(function(){
  if(window.__AI_VIDEO_HISTORY_FINAL__)return;
  window.__AI_VIDEO_HISTORY_FINAL__=true;

  function initData(){try{return window.WebApp&&window.WebApp.initData||''}catch(e){return ''}}
  function esc(v){return String(v==null?'':v).replace(/[&<>\"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c])})}
  function dateOf(v){try{return new Date(v).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}catch(e){return ''}}
  function nameOf(t){return t==='character'?'Поздравления от персонажа':'Видео в подарок'}

  function box(){
    var page=document.getElementById('ai-video-gift-page');
    if(!page)return null;
    var existing=document.getElementById('ai-video-history-final');
    if(existing)return existing;
    var section=document.createElement('section');
    section.id='ai-video-history-final';
    section.innerHTML='<h3>🎬 Мои видео</h3><div class="ai-video-history-list-final"><div class="ai-video-history-empty">Здесь появятся созданные видео.</div></div>';
    var anchor=page.querySelector('.how')||page.querySelector('.wrap');
    if(anchor)anchor.insertAdjacentElement('afterend',section);else page.appendChild(section);
    return section;
  }

  function render(orders){
    var root=box();
    if(!root)return;
    var list=root.querySelector('.ai-video-history-list-final');
    if(!Array.isArray(orders)||!orders.length){
      list.innerHTML='<div class="ai-video-history-empty">Здесь появятся созданные видео.</div>';
      return;
    }

    list.innerHTML=orders.map(function(o){
      var state=o.status==='completed'?'completed':o.status==='failed'?'failed':'processing';
      var pill=state==='completed'?'Готово':state==='failed'?'Ошибка':'Готовится';
      var content='';
      if(state==='completed'&&o.video_url){
        var url=esc(o.video_url);
        content='<div class="ai-video-ready-final">✅ Видео готово — можно смотреть</div>'
          +'<video class="ai-video-order-video-final" controls playsinline preload="metadata" src="'+url+'"></video>'
          +'<a class="ai-video-download-final" href="'+url+'" target="_blank" rel="noopener">Открыть / скачать видео</a>';
      }else if(state==='failed'){
        content='<div class="ai-video-history-note-final">'+esc(o.error||'Генерация завершилась ошибкой.')+'</div>';
      }else{
        content='<div class="ai-video-history-note-final">Wan 2.6 ещё обрабатывает заказ. Раздел автоматически проверяется снова.</div>';
      }

      return '<article class="ai-video-order-final">'
        +'<div class="ai-video-order-head-final"><div>'
        +'<div class="ai-video-order-title-final">'+nameOf(o.type)+'</div>'
        +'<div class="ai-video-order-meta-final">'+esc(dateOf(o.created_at))+' · '+esc(o.price||350)+' ₽</div>'
        +'</div><span class="ai-video-order-pill-final '+state+'">'+pill+'</span></div>'
        +content+'</article>';
    }).join('');
  }

  async function load(){
    var page=document.getElementById('ai-video-gift-page');
    if(!page)return;
    try{
      box();
      var response=await fetch('/api/video/orders',{headers:{'X-MAX-Init-Data':initData()}});
      var data=await response.json();
      if(!data.ok)throw new Error(data.error||'Не удалось получить видео');
      render(data.orders||[]);
    }catch(error){
      console.warn('[AI VIDEO HISTORY FINAL]',error.message);
    }
  }

  function renameVisibleLabels(){
    document.querySelectorAll('#ai-video-gift-page *').forEach(function(el){
      if(el.children.length===0 && el.textContent.indexOf('Поздравление от персонажа')>=0){
        el.textContent=el.textContent.replace(/Поздравление от персонажа/g,'Поздравления от персонажа');
      }
    });
  }

  function start(){
    renameVisibleLabels();
    box();
    load();
    setInterval(load,5000);
    setInterval(renameVisibleLabels,1500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
</script>`;

function injectIntoIndex(body) {
  if(typeof body !== 'string' || !body.includes('<body')) return body;
  if(body.includes('ai-video-history-final-script')) return body;
  const marker='</body>';
  const index=body.toLowerCase().lastIndexOf(marker);
  if(index < 0) return body;

  body = body.replace(/Поздравление от персонажа/g, 'Поздравления от персонажа');
  return body.slice(0,index) + historyStyle + '\n' + historyScript + '\n' + body.slice(index);
}

const originalSendFile = express.response.sendFile;
express.response.sendFile = function finalVideoHistorySendFile(filePath, ...args) {
  const isIndex = typeof filePath === 'string' && /(?:^|[\\/])index\.html$/i.test(filePath);
  if(!isIndex) return originalSendFile.call(this,filePath,...args);

  const response=this;
  const originalSend=response.send;
  response.send=function finalVideoHistorySend(body){
    return originalSend.call(this, injectIntoIndex(body));
  };
  try { return originalSendFile.call(this,filePath,...args); }
  finally { response.send=originalSend; }
};

installFinalOrdersRoute();

console.log('[AI VIDEO HISTORY FINAL] loaded: final /api/video/orders + sendFile history delivery + product rename');
