const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

// Robust video-history recovery layer.
// Why response.json: Express copies application methods (including app.get) onto
// the app instance. Patching express.application.get after app creation therefore
// does not reliably intercept routes. res.json is inherited from the response
// prototype, so this hook is effective for the already-registered /api/video/orders route.

const RESULT_ROOT = '/data/video-results';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const PIAPI_KEY = process.env.PIAPI_KEY || '';
const activeRecovery = new Set();

fs.mkdirSync(RESULT_ROOT, { recursive: true });

const dbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json',
  Prefer: 'return=representation'
};

function taskData(response) {
  return response?.data ?? response ?? {};
}

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
    return url.protocol === 'https:' && new Set([
      'img.theapi.app',
      'storage.theapi.app',
      's.bmnmny.cn'
    ]).has(url.hostname.toLowerCase());
  } catch (_) {
    return false;
  }
}

async function piapiTask(taskId) {
  if (!PIAPI_KEY) throw new Error('PIAPI_KEY is not configured');
  const response = await axios.get(
    'https://api.piapi.ai/api/v1/task/' + encodeURIComponent(taskId),
    { headers: { 'x-api-key': PIAPI_KEY }, timeout: 60000 }
  );
  return response.data;
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
  const filePath = path.join(RESULT_ROOT, name);
  fs.writeFileSync(filePath, response.data, { flag: 'wx' });
  return name;
}

function publicOrigin(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  return proto + '://' + req.get('host');
}

async function patchOrder(order, finalUrl) {
  const rows = await axios.patch(
    SUPABASE_URL + '/rest/v1/video_orders',
    {
      status: 'completed',
      video_url: finalUrl,
      error: null,
      updated_at: new Date().toISOString()
    },
    {
      headers: dbHeaders,
      params: {
        id: 'eq.' + String(order.id),
        max_id: 'eq.' + String(order.max_id),
        status: 'eq.completed'
      },
      timeout: 30000
    }
  );
  return rows.data?.[0] || null;
}

async function recoverCompletedRemoteOrder(req, order) {
  if (!order || String(order.status || '').toLowerCase() !== 'completed') return false;
  if (!isRemoteProviderUrl(order.video_url)) return false;
  if (!order.task_id) return false;
  if (activeRecovery.has(String(order.id))) return false;

  activeRecovery.add(String(order.id));
  try {
    console.log('[AI VIDEO HISTORY RESPONSE] recovering order', order.id, 'task', order.task_id);

    const response = await piapiTask(order.task_id);
    const status = taskStatus(response);
    console.log('[AI VIDEO HISTORY RESPONSE] PiAPI status', order.id, status);

    if (!['completed', 'success', 'succeeded', 'done'].includes(status)) return false;

    const freshUrl = taskVideoUrl(response);
    if (!freshUrl) {
      console.warn('[AI VIDEO HISTORY RESPONSE] no provider video URL for order', order.id);
      return false;
    }

    let finalUrl = freshUrl;
    try {
      const fileName = await downloadVideo(freshUrl);
      finalUrl = publicOrigin(req) + '/video-results/' + fileName;
      console.log('[AI VIDEO HISTORY RESPONSE] saved locally', order.id, finalUrl);
    } catch (error) {
      console.warn('[AI VIDEO HISTORY RESPONSE] local save failed', order.id, error.response?.data || error.message);
    }

    const updated = await patchOrder(order, finalUrl);
    if (updated) Object.assign(order, updated);
    else order.video_url = finalUrl;

    console.log('[AI VIDEO HISTORY RESPONSE] order recovered', order.id);
    return true;
  } catch (error) {
    console.error('[AI VIDEO HISTORY RESPONSE] recovery failed', order.id, error.response?.data || error.message);
    return false;
  } finally {
    activeRecovery.delete(String(order.id));
  }
}

const originalJson = express.response.json;
express.response.json = function patchedVideoHistoryJson(body) {
  const request = this.req;
  const requestPath = String(request?.path || request?.originalUrl || '').split('?')[0];

  if (requestPath !== '/api/video/orders' || !body || !Array.isArray(body.orders)) {
    return originalJson.call(this, body);
  }

  (async () => {
    let recovered = 0;
    try {
      for (const order of body.orders) {
        if (await recoverCompletedRemoteOrder(request, order)) recovered += 1;
      }
      console.log('[AI VIDEO HISTORY RESPONSE] orders:', body.orders.length, 'recovered:', recovered);
    } catch (error) {
      console.error('[AI VIDEO HISTORY RESPONSE] response hook error', error.response?.data || error.message);
    }
    originalJson.call(this, body);
  })();

  return this;
};

console.log('[AI VIDEO HISTORY RESPONSE] loaded: post-route recovery hook');
