const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

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

function decode(v) {
  try { return decodeURIComponent(String(v).replace(/\+/g, '%20')); }
  catch (_) { return String(v); }
}

function validateMax(initData) {
  if (!MAX_BOT_TOKEN) throw new Error('MAX_BOT_TOKEN is not configured');
  if (!initData) throw new Error('MAX initData is missing');
  const p = {};
  for (const part of String(initData).split('&')) {
    const i = part.indexOf('=');
    if (i >= 0) p[part.slice(0, i)] = part.slice(i + 1);
  }
  if (!p.hash) throw new Error('MAX initData hash is missing');
  const values = {};
  for (const key of Object.keys(p)) if (key !== 'hash') values[key] = decode(p[key]);
  const check = Object.keys(values).sort().map((k) => k + '=' + values[k]).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(MAX_BOT_TOKEN).digest();
  const expected = crypto.createHmac('sha256', secret).update(check, 'utf8').digest('hex');
  const a = Buffer.from(decode(p.hash), 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('Invalid MAX initData signature');
  let user = null;
  try { user = JSON.parse(values.user || '{}'); } catch (_) {}
  if (!user || !user.id) throw new Error('MAX user data is missing');
  return user;
}

async function dbGet(table, params) {
  return (await axios.get(SUPABASE_URL + '/rest/v1/' + table, { headers: dbHeaders, params, timeout: 20000 })).data;
}
async function dbPatch(table, params, body) {
  return (await axios.patch(SUPABASE_URL + '/rest/v1/' + table, body, { headers: dbHeaders, params, timeout: 30000 })).data;
}
async function piapiTask(taskId) {
  return (await axios.get('https://api.piapi.ai/api/v1/task/' + encodeURIComponent(taskId), {
    headers: { 'x-api-key': PIAPI_KEY }, timeout: 60000
  })).data;
}
function taskData(r) { return r?.data ?? r ?? {}; }
function taskStatus(r) {
  const d = taskData(r);
  return String(d.status || d.task_status || d.data?.status || 'unknown').toLowerCase();
}
function taskVideoUrl(r) {
  const d = taskData(r);
  const o = d.output ?? d.data?.output ?? {};
  return o.video_url || o.videoUrl || o.video || o.url || null;
}
async function saveRemoteVideo(url) {
  const u = new URL(String(url || ''));
  if (u.protocol !== 'https:') throw new Error('unsafe video protocol');
  if (!new Set(['img.theapi.app','storage.theapi.app','s.bmnmny.cn']).has(u.hostname.toLowerCase())) throw new Error('video source not allowed');
  const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 120000, maxContentLength: 120 * 1024 * 1024, maxBodyLength: 120 * 1024 * 1024 });
  const name = crypto.randomBytes(18).toString('hex') + '.mp4';
  fs.writeFileSync(path.join(RESULT_ROOT, name), r.data, { flag: 'wx' });
  return name;
}
function origin(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  return proto + '://' + req.get('host');
}
async function recover(order, req) {
  if (!order || order.status !== 'processing' || !order.task_id) return order;
  let result;
  try { result = await piapiTask(order.task_id); }
  catch (_) { order.provider_status = 'checking'; return order; }
  const status = taskStatus(result);
  order.provider_status = status;
  if (['failed','error','cancelled','canceled'].includes(status)) {
    order.error = 'PiAPI завершил генерацию видео с ошибкой';
    return order;
  }
  if (!['completed','success','succeeded','done'].includes(status)) return order;
  const remote = taskVideoUrl(result);
  if (!remote) { order.provider_status = 'completed_without_url'; return order; }
  let finalUrl = remote;
  try {
    const name = await saveRemoteVideo(remote);
    finalUrl = origin(req) + '/video-results/' + name;
  } catch (e) {
    console.warn('[AI VIDEO HISTORY FINAL] local save failed:', order.id, e.message);
  }
  const rows = await dbPatch('video_orders', { id: 'eq.' + order.id, max_id: 'eq.' + order.max_id, status: 'eq.processing' }, {
    status: 'completed', video_url: finalUrl, error: null, updated_at: new Date().toISOString()
  });
  if (rows[0]) Object.assign(order, rows[0]); else { order.status = 'completed'; order.video_url = finalUrl; }
  return order;
}

function installRoute() {
  const originalGet = express.application.get;
  express.application.get = function(pathname, ...handlers) {
    if (pathname === '/api/video/orders' && handlers.length) {
      return originalGet.call(this, pathname, async (req, res) => {
        try {
          const user = validateMax(req.headers['x-max-init-data'] || req.query.initData || '');
          const orders = await dbGet('video_orders', {
            max_id: 'eq.' + user.id, select: '*', order: 'created_at.desc', limit: 30
          });
          for (const order of orders) if (order.status === 'processing') await recover(order, req);
          console.log('[AI VIDEO HISTORY FINAL] orders:', orders.length, 'completed:', orders.filter((o) => o.status === 'completed').length);
          return res.json({ ok: true, orders });
        } catch (e) {
          console.error('[GET /api/video/orders FINAL]', e.response?.data || e.message);
          return res.status(400).json({ ok: false, error: e.message || 'Не удалось получить видео-заказы' });
        }
      });
    }
    return originalGet.call(this, pathname, ...handlers);
  };
}

const css = `<style id="ai-video-history-final-style">#ai-video-history-final{margin:14px 0;padding:14px;border-radius:20px;border:1px solid rgba(255,255,255,.09);background:rgba(17,13,27,.78)}#ai-video-history-final h3{margin:0 0 10px;font-size:13px}.ai-vh-item{margin-top:9px;padding:11px;border-radius:15px;background:rgba(5,3,10,.5);border:1px solid rgba(255,255,255,.06)}.ai-vh-video{display:block;width:100%;max-height:420px;margin-top:9px;border-radius:13px;background:#000}.ai-vh-btn{display:inline-block;margin-top:9px;padding:8px 11px;border-radius:10px;background:rgba(255,255,255,.08);color:#fff;text-decoration:none;font-size:8px;font-weight:900}.ai-vh-muted{margin-top:8px;color:rgba(255,255,255,.38);font-size:8px;line-height:1.45}.ai-vh-ok{margin-top:8px;color:#7be7c4;font-size:8px;font-weight:900}</style>`;

const js = `<script id="ai-video-history-final-script">(function(){if(window.__AI_VIDEO_HISTORY_FINAL__)return;window.__AI_VIDEO_HISTORY_FINAL__=1;function initData(){try{return (window.WebApp&&window.WebApp.initData)||window.MAX_WEB_APP?.initData||''}catch(e){return ''}}function esc(v){return String(v==null?'':v).replace(/[&<>\"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c])})}function ensure(){var page=document.getElementById('ai-video-gift-page');if(!page)return null;var s=document.getElementById('ai-video-history-final');if(s)return s;s=document.createElement('section');s.id='ai-video-history-final';s.innerHTML='<h3>🎬 Мои видео</h3><div class="ai-vh-list">Здесь появятся созданные видео.</div>';page.appendChild(s);return s}function rename(){document.querySelectorAll('#ai-video-gift-page *').forEach(function(el){if(el.children.length)return;var t=el.textContent||'';t=t.replace(/Поздравление от персонажа/g,'Поздравления от персонажа').replace(/Поздравление персонажа/g,'Поздравления от персонажа').replace(/Поздравления персонажа/g,'Поздравления от персонажа');if(t!==el.textContent)el.textContent=t})}function render(orders){var s=ensure();if(!s)return;var list=s.querySelector('.ai-vh-list');if(!orders.length){list.textContent='Здесь появятся созданные видео.';return}list.innerHTML=orders.map(function(o){var item='<div class="ai-vh-item"><div><b>Поздравления от персонажа</b></div>';if(o.status==='completed'&&o.video_url){var u=esc(o.video_url);item+='<div class="ai-vh-ok">✅ Видео готово</div><video class="ai-vh-video" controls playsinline preload="metadata" src="'+u+'"></video><a class="ai-vh-btn" href="'+u+'" target="_blank" rel="noopener">Открыть / скачать видео</a>'}else if(o.status==='failed'){item+='<div class="ai-vh-muted">'+esc(o.error||'Генерация завершилась ошибкой.')+'</div>'}else item+='<div class="ai-vh-muted">Видео ещё готовится. Проверяем автоматически.</div>';return item+'</div>'}).join('')}async function load(){if(!document.getElementById('ai-video-gift-page'))return;try{var r=await fetch('/api/video/orders',{headers:{'X-MAX-Init-Data':initData()}});var d=await r.json();if(!d.ok)throw new Error(d.error||'video orders error');render(d.orders||[])}catch(e){console.warn('[AI VIDEO HISTORY FINAL]',e.message)}}function start(){rename();ensure();load();setInterval(load,5000);setInterval(rename,1000)}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()})();</script>`;

function inject(html){
  if (typeof html !== 'string') return html;
  html = html.replace(/Поздравления? от персонажа/g, 'Поздравления от персонажа');
  html = html.replace(/Поздравление персонажа/g, 'Поздравления от персонажа');
  if (html.includes('ai-video-history-final-script')) return html;
  const i = html.toLowerCase().lastIndexOf('</body>');
  return i < 0 ? html : html.slice(0, i) + css + '\n' + js + '\n' + html.slice(i);
}

const originalSendFile = express.response.sendFile;
express.response.sendFile = function(filePath, ...args) {
  const isIndex = typeof filePath === 'string' && /(?:^|[\\/])index\.html$/i.test(filePath);
  if (!isIndex) return originalSendFile.call(this, filePath, ...args);
  try {
    const html = fs.readFileSync(filePath, 'utf8');
    this.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    this.set('Pragma', 'no-cache');
    this.set('Expires', '0');
    this.type('html');
    return this.send(inject(html));
  } catch (e) {
    console.error('[AI VIDEO HISTORY FINAL HTML]', e.message);
    return originalSendFile.call(this, filePath, ...args);
  }
};

installRoute();
console.log('[AI VIDEO HISTORY FINAL] loaded: direct index injection + final video orders route + product rename');
