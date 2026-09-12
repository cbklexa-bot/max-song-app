const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

// Durable video-history recovery layer.
// Important: this module does NOT touch index.html, sendFile, navigation or song routes.
// It only takes ownership of /api/video/orders before wan-runtime registers that route.

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
    if (i >= 0) params[part.slice(0, i)] = part.slice(1 + i);
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
  try { user = JSON.parse(values.user || '{}'); } catch (_) {}
  if (!user?.id) throw new Error('MAX user data is missing');
  return user;
}

async function dbGet(query) {
  return (await axios.get(SUPABASE_URL + '/rest/v1/video_orders', {
    headers: dbHeaders,
    params: query,
    timeout: 20000
  })).data;
}

async function dbPatch(id, maxId, body, statusGuard) {
  const query = {
    id: 'eq.' + String(id),
    max_id: 'eq.' + String(maxId)
  };
  if (statusGuard) query.status = 'eq.' + statusGuard;
  return (await axios.patch(SUPABASE_URL + '/rest/v1/video_orders', body, {
    headers: dbHeaders,
    params: query,
    timeout: 30000
  })).data;
}

async function piapiTask(taskId) {
  return (await axios.get('https://api.piapi.ai/api/v1/task/' + encodeURIComponent(taskId), {
    headers: { 'x-api-key': PIAPI_KEY },
    timeout: 60000
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

function isRemoteProviderUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' && new Set(['img.theapi.app', 'storage.theapi.app', 's.bmnmny.cn']).has(url.hostname.toLowerCase());
  } catch (_) { return false; }
}

async function downloadVideo(url) {
  if (!isRemoteProviderUrl(url)) throw new Error('Источник видео не разрешён');
  const response = await axios.get(url, {
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

async function recoverOrder(req, order) {
  if (!order || !order.task_id || !PIAPI_KEY) return { order, changed: false };

  const status = String(order.status || '').toLowerCase();
  const remoteStored = isRemoteProviderUrl(order.video_url);
  const needsProviderCheck = status === 'processing' || (status === 'completed' && remoteStored);
  if (!needsProviderCheck) return { order, changed: false };

  let response;
  try {
    response = await piapiTask(order.task_id);
  } catch (error) {
    console.warn('[AI VIDEO HISTORY DURABLE PIAPI]', order.id, error.response?.data || error.message);
    return { order, changed: false };
  }

  const providerStatus = taskStatus(response);
  if (!['completed', 'success', 'succeeded', 'done'].includes(providerStatus)) return { order, changed: false };

  const freshRemoteUrl = taskVideoUrl(response);
  if (!freshRemoteUrl) {
    console.warn('[AI VIDEO HISTORY DURABLE]', order.id, 'provider completed without video URL');
    return { order, changed: false };
  }

  let finalUrl = freshRemoteUrl;
  try {
    const fileName = await downloadVideo(freshRemoteUrl);
    finalUrl = publicOrigin(req) + '/video-results/' + fileName;
  } catch (error) {
    console.warn('[AI VIDEO HISTORY DURABLE LOCAL SAVE]', order.id, error.response?.data || error.message);
  }

  const nextStatus = status === 'processing' ? 'completed' : 'completed';
  const guard = status === 'processing' ? 'processing' : 'completed';
  const rows = await dbPatch(order.id, order.max_id, {
    status: nextStatus,
    video_url: finalUrl,
    error: null,
    updated_at: new Date().toISOString()
  }, guard);

  if (rows[0]) Object.assign(order, rows[0]);
  else {
    order.status = nextStatus;
    order.video_url = finalUrl;
    order.error = null;
  }
  return { order, changed: true };
}

function installOrdersRoute() {
  const originalGet = express.application.get;
  express.application.get = function durableVideoOrdersGet(pathname, ...handlers) {
    if (pathname === '/api/video/orders' && handlers.length) {
      return originalGet.call(this, pathname, async (req, res) => {
        try {
          const user = validateMax(req.headers['x-max-init-data'] || req.query.initData || '');
          const orders = await dbGet({
            max_id: 'eq.' + String(user.id),
            select: '*',
            order: 'created_at.desc',
            limit: 30
          });

          let recovered = 0;
          for (const order of orders) {
            if (order.status === 'processing' || (order.status === 'completed' && isRemoteProviderUrl(order.video_url))) {
              const result = await recoverOrder(req, order);
              if (result.changed) recovered += 1;
            }
          }

          console.log('[AI VIDEO HISTORY DURABLE] orders:', orders.length, 'recovered:', recovered, 'completed:', orders.filter((o) => o.status === 'completed').length);
          return res.json({ ok: true, orders });
        } catch (error) {
          console.error('[GET /api/video/orders DURABLE]', error.response?.data || error.message);
          return res.status(400).json({ ok: false, error: error.message || 'Не удалось получить видео-заказы' });
        }
      });
    }
    return originalGet.call(this, pathname, ...handlers);
  };
}

installOrdersRoute();
console.log('[AI VIDEO HISTORY DURABLE] loaded: persistent recovery of completed PiAPI videos');
