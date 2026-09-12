const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

const VIDEO_ROOT = '/data/video-assets';
const RESULT_ROOT = '/data/video-results';
const VIDEO_PRICE = Number(process.env.VIDEO_PRICE || 327);
const VIDEO_PRICES = {
  photos: Number(process.env.VIDEO_PHOTOS_PRICE || VIDEO_PRICE),
  singing: Number(process.env.VIDEO_SINGING_PRICE || VIDEO_PRICE),
  character: Number(process.env.VIDEO_CHARACTER_PRICE || VIDEO_PRICE)
};
const VIDEO_DURATION = 15;
const VIDEO_RESOLUTION = '720p';
const MAX_VIDEO_JSON_LIMIT = process.env.MAX_VIDEO_JSON_LIMIT || '15mb';
const PIAPI_KEY = process.env.PIAPI_KEY || '';
const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

fs.mkdirSync(VIDEO_ROOT, { recursive: true });
fs.mkdirSync(RESULT_ROOT, { recursive: true });

const originalExpressJson = express.json;
express.json = function patchedExpressJson(options = {}) {
  return originalExpressJson.call(express, { ...options, limit: MAX_VIDEO_JSON_LIMIT });
};

const dbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json',
  Prefer: 'return=representation'
};

let installed = false;

function safeText(value, max = 3000) {
  return String(value ?? '').trim().slice(0, max);
}

function decodeInitDataValue(value) {
  try { return decodeURIComponent(String(value).replace(/\+/g, '%20')); }
  catch (_) { return String(value); }
}

function validateMaxInitData(initData) {
  if (!MAX_BOT_TOKEN) throw new Error('MAX_BOT_TOKEN is not configured');
  if (!initData || typeof initData !== 'string') throw new Error('MAX initData is missing');

  const params = {};
  for (const part of initData.split('&')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    params[part.slice(0, i)] = part.slice(i + 1);
  }

  const receivedHashRaw = params.hash;
  if (!receivedHashRaw) throw new Error('MAX initData hash is missing');

  const decodedParams = {};
  for (const key of Object.keys(params)) {
    if (key !== 'hash') decodedParams[key] = decodeInitDataValue(params[key]);
  }

  const dataCheckString = Object.keys(decodedParams)
    .sort()
    .map((key) => key + '=' + decodedParams[key])
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(MAX_BOT_TOKEN)
    .digest();

  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString, 'utf8')
    .digest('hex');

  const receivedHash = decodeInitDataValue(receivedHashRaw);
  const receivedBuffer = Buffer.from(receivedHash, 'hex');
  const calculatedBuffer = Buffer.from(calculatedHash, 'hex');

  if (
    receivedBuffer.length !== calculatedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, calculatedBuffer)
  ) throw new Error('Invalid MAX initData signature');

  if (decodedParams.auth_date) {
    const authDate = Number(decodedParams.auth_date);
    if (!Number.isNaN(authDate)) {
      const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
      if (ageSeconds > 3600) throw new Error('MAX initData expired');
    }
  }

  let user = null;
  if (decodedParams.user) {
    try { user = JSON.parse(decodedParams.user); } catch (_) { user = null; }
  }

  if (!user || !user.id) throw new Error('MAX user data is missing');
  return { user, params: decodedParams };
}

function requireMaxUser(req) {
  return validateMaxInitData(
    req.headers['x-max-init-data'] || req.body?.initData || req.query.initData || ''
  );
}

async function supabaseGet(table, query) {
  return (await axios.get(SUPABASE_URL + '/rest/v1/' + table, {
    headers: dbHeaders,
    params: query,
    timeout: 20000
  })).data;
}

async function supabasePost(table, body) {
  return (await axios.post(SUPABASE_URL + '/rest/v1/' + table, body, {
    headers: dbHeaders,
    timeout: 20000
  })).data;
}

async function supabasePatch(table, query, body) {
  return (await axios.patch(SUPABASE_URL + '/rest/v1/' + table, body, {
    headers: dbHeaders,
    params: query,
    timeout: 20000
  })).data;
}

async function getUser(maxId) {
  const rows = await supabaseGet('users', {
    max_id: 'eq.' + String(maxId),
    select: '*',
    limit: 1
  });
  if (!rows.length) throw new Error('Пользователь не найден');
  return rows[0];
}

async function createPiApiTask(body) {
  const response = await axios.post('https://api.piapi.ai/api/v1/task', body, {
    headers: { 'Content-Type': 'application/json', 'x-api-key': PIAPI_KEY },
    timeout: 60000
  });
  return response.data;
}

async function getPiApiTask(taskId) {
  const response = await axios.get(
    'https://api.piapi.ai/api/v1/task/' + encodeURIComponent(taskId),
    { headers: { 'x-api-key': PIAPI_KEY }, timeout: 60000 }
  );
  return response.data;
}

function taskData(response) { return response?.data ?? response ?? {}; }
function taskStatus(response) {
  const data = taskData(response);
  return String(data.status || data.task_status || data.data?.status || 'unknown').toLowerCase();
}
function taskId(response) {
  const data = taskData(response);
  return String(data.id || data.task_id || response?.id || response?.task_id || '');
}
function videoUrl(response) {
  const data = taskData(response);
  const output = data.output ?? data.data?.output ?? {};
  return output.video_url || output.videoUrl || output.video || output.url || null;
}

function originFor(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  return proto + '://' + req.get('host');
}

function parseAsset(dataUrl) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i.exec(String(dataUrl || ''));
  if (!match) throw new Error('Поддерживаются только JPG, PNG и WebP');
  const buffer = Buffer.from(match[2].replace(/\s+/g, ''), 'base64');
  if (!buffer.length) throw new Error('Пустой файл');
  if (buffer.length > 8 * 1024 * 1024) throw new Error('Размер одного изображения не должен превышать 8 МБ');
  const mime = match[1].toLowerCase();
  return { buffer, ext: mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg' };
}

async function saveAssets(req, assets, type) {
  if (!Array.isArray(assets) || !assets.length) return [];
  if (type === 'singing' && assets.length !== 1) throw new Error('Для поющего фото нужно ровно одно изображение');
  if (type === 'photos' && assets.length !== 1) {
    throw new Error('Для Wan 2.6 в текущей версии выберите одно главное фото');
  }
  if (type === 'character' && assets.length) throw new Error('Для поздравления от персонажа фотография не нужна');

  const urls = [];
  for (const dataUrl of assets) {
    const { buffer, ext } = parseAsset(dataUrl);
    const name = crypto.randomBytes(18).toString('hex') + '.' + ext;
    fs.writeFileSync(path.join(VIDEO_ROOT, name), buffer, { flag: 'wx' });
    urls.push(originFor(req) + '/video-assets/' + name);
  }
  return urls;
}

async function downloadVideoToDisk(videoUrlValue) {
  const parsed = new URL(String(videoUrlValue || ''));
  if (parsed.protocol !== 'https:') throw new Error('Видео-ссылка должна использовать HTTPS');
  const allowedHosts = new Set(['img.theapi.app', 'storage.theapi.app', 's.bmnmny.cn']);
  if (!allowedHosts.has(parsed.hostname.toLowerCase())) throw new Error('Источник видео не разрешён');

  const response = await axios.get(videoUrlValue, {
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

async function refundOrder(order, reason) {
  if (!order || !['creating', 'processing'].includes(order.status)) return;
  try {
    const user = await getUser(order.max_id);
    const newBalance = Number(user.balance || 0) + Number(order.price || 0);
    await supabasePatch('users', { max_id: 'eq.' + String(order.max_id) }, { balance: newBalance });
    await supabasePatch('video_orders', { id: 'eq.' + String(order.id), max_id: 'eq.' + String(order.max_id) }, {
      status: 'failed',
      error: safeText(reason, 1000),
      updated_at: new Date().toISOString()
    });
    try {
      await supabasePost('transactions', {
        user_id: order.max_id,
        type: 'video_refund',
        amount: Number(order.price || 0),
        description: 'Возврат за неудачную генерацию видео',
        order_id: null
      });
    } catch (txError) {
      console.error('[VIDEO REFUND TRANSACTION]', txError.response?.data || txError.message);
    }
  } catch (error) {
    console.error('[VIDEO REFUND ERROR]', error.response?.data || error.message);
  }
}

function commonVideoInput(prompt, audio) {
  return {
    prompt,
    negative_prompt: 'low resolution, blurry face, deformed hands, extra fingers, distorted face, duplicate people, subtitles, watermark',
    prompt_extend: true,
    shot_type: 'multi',
    resolution: VIDEO_RESOLUTION,
    duration: VIDEO_DURATION,
    aspect_ratio: '9:16',
    audio: Boolean(audio),
    watermark: false
  };
}

function buildPrompt(type, input) {
  const base = 'Vertical 9:16 gift video, cinematic commercial quality, natural motion, stable anatomy, realistic lighting, emotionally engaging, clean frame, no subtitles, no on-screen text.';

  if (type === 'photos') {
    const styles = {
      cinematic: 'cinematic and emotional',
      warm: 'warm family memories, gentle and heartfelt',
      romantic: 'romantic, soft and intimate',
      party: 'bright festive celebration, energetic'
    };
    return [
      base,
      'Animate the person and scene naturally from the provided photo.',
      styles[input.style] || styles.cinematic,
      'Create a dynamic multi-shot 15-second memory video while preserving the identity and appearance from the source photo.',
      safeText(input.prompt, 1500)
    ].join(' ');
  }

  if (type === 'singing') {
    const action = input.action === 'sing'
      ? 'The person sings the requested words naturally with expressive facial movement and believable mouth articulation.'
      : input.action === 'greet'
        ? 'The person warmly congratulates the recipient with natural speech and expressive facial movement.'
        : 'The person speaks the requested text naturally with clear articulation.';
    return [
      base,
      'Animate the person in the portrait while keeping the exact facial identity and consistent appearance.',
      action,
      'Generate synchronized native audio for the performance.',
      safeText(input.prompt, 1700)
    ].join(' ');
  }

  const characters = {
    homeless: 'a funny charismatic street character',
    artist: 'a cheerful stage artist',
    santa: 'Ded Moroz in a festive winter setting',
    boss: 'a strict but comedic boss',
    pirate: 'a playful pirate',
    cowboy: 'a humorous cowboy',
    rockstar: 'an energetic rock star',
    rapper: 'a confident rapper',
    superhero: 'a comic-book superhero',
    detective: 'a humorous detective',
    doctor: 'a comedic doctor',
    teacher: 'a friendly teacher',
    chef: 'a cheerful chef',
    grandpa: 'a funny kind grandfather',
    host: 'an energetic TV host',
    custom: safeText(input.customCharacter, 300) || 'a funny personalized character'
  };

  return [
    base,
    'Create a 15-second birthday-style congratulations from ' + (characters[input.character] || characters.custom) + '.',
    'The character addresses the recipient directly.',
    'Recipient: ' + safeText(input.recipient, 200) + '.',
    'Location: ' + safeText(input.location, 200) + '.',
    'Script and wishes: ' + safeText(input.prompt, 1500) + '.',
    'Use natural Russian speech with synchronized native audio, cheerful emotion and clear pronunciation.'
  ].join(' ');
}

function makeTaskBody(type, input, assetUrls) {
  const prompt = buildPrompt(type, input);

  if (type === 'photos') {
    return {
      model: 'Wan',
      task_type: 'wan26-img2video',
      input: {
        ...commonVideoInput(prompt, false),
        image: assetUrls[0]
      },
      config: { service_mode: 'public' }
    };
  }

  if (type === 'singing') {
    return {
      model: 'Wan',
      task_type: 'wan26-img2video',
      input: {
        ...commonVideoInput(prompt, true),
        image: assetUrls[0]
      },
      config: { service_mode: 'public' }
    };
  }

  return {
    model: 'Wan',
    task_type: 'wan26-txt2video',
    input: commonVideoInput(prompt, true),
    config: { service_mode: 'public' }
  };
}

async function processVideoOrder(req, order) {
  if (!order || order.status !== 'processing' || !order.task_id) return order;

  try {
    const response = await getPiApiTask(order.task_id);
    const status = taskStatus(response);

    if (['failed', 'error', 'cancelled', 'canceled'].includes(status)) {
      await refundOrder(order, 'PiAPI завершил задачу Wan 2.6 с ошибкой');
      order.status = 'failed';
      order.error = 'PiAPI завершил задачу Wan 2.6 с ошибкой';
      return order;
    }

    if (!['completed', 'success', 'succeeded', 'done'].includes(status)) return order;

    const remoteUrl = videoUrl(response);
    if (!remoteUrl) throw new Error('PiAPI завершил задачу Wan 2.6 без video_url');

    const storedName = await downloadVideoToDisk(remoteUrl);
    const publicUrl = originFor(req) + '/video-results/' + storedName;
    const rows = await supabasePatch('video_orders', {
      id: 'eq.' + String(order.id),
      max_id: 'eq.' + String(order.max_id)
    }, {
      status: 'completed',
      video_url: publicUrl,
      error: null,
      updated_at: new Date().toISOString()
    });
    if (rows[0]) Object.assign(order, rows[0]);
    else order.status = 'completed';
    return order;
  } catch (error) {
    console.error('[VIDEO TASK CHECK]', order.id, error.response?.data || error.message);
    return order;
  }
}

function installVideoRoutes(app) {
  if (installed) return;
  installed = true;

  app.use('/video-assets', express.static(VIDEO_ROOT, {
    maxAge: '7d',
    fallthrough: false,
    setHeaders(res) { res.setHeader('Cache-Control', 'public, max-age=604800, immutable'); }
  }));
  app.use('/video-results', express.static(RESULT_ROOT, {
    maxAge: '7d',
    fallthrough: false,
    setHeaders(res) { res.setHeader('Cache-Control', 'public, max-age=604800, immutable'); }
  }));

  app.get('/api/video/config', (req, res) => {
    res.json({
      ok: true,
      provider: 'piapi-wan-2.6',
      model: 'Wan 2.6',
      duration: VIDEO_DURATION,
      resolution: VIDEO_RESOLUTION,
      prices: VIDEO_PRICES,
      configured: Boolean(PIAPI_KEY && SUPABASE_URL && SUPABASE_KEY && MAX_BOT_TOKEN)
    });
  });

  app.post('/api/video/generate', async (req, res) => {
    try {
      if (!PIAPI_KEY) throw new Error('PIAPI_KEY is not configured');
      const auth = requireMaxUser(req);
      const maxId = String(auth.user.id);
      const type = safeText(req.body.type, 40);
      if (!['photos', 'singing', 'character'].includes(type)) {
        return res.status(400).json({ ok: false, error: 'Неизвестный тип видео' });
      }

      const existing = await supabaseGet('video_orders', {
        max_id: 'eq.' + maxId,
        status: 'in.(creating,processing)',
        select: 'id,status,created_at',
        order: 'created_at.desc',
        limit: 1
      });
      if (existing.length) {
        return res.status(409).json({ ok: false, error: 'У вас уже идёт генерация видео. Дождитесь результата.', order: existing[0] });
      }

      const price = Number(VIDEO_PRICES[type]);
      const user = await getUser(maxId);
      const balance = Number(user.balance || 0);
      if (balance < price) {
        return res.status(400).json({ ok: false, error: 'Недостаточно средств. Нужно ' + price + ' ₽.' });
      }

      const input = {
        style: safeText(req.body.style, 80),
        action: safeText(req.body.action, 40),
        character: safeText(req.body.character, 80),
        customCharacter: safeText(req.body.customCharacter, 300),
        recipient: safeText(req.body.recipient, 200),
        location: safeText(req.body.location, 200),
        prompt: safeText(req.body.prompt, 1800)
      };

      if (type === 'photos' && !input.prompt) return res.status(400).json({ ok: false, error: 'Опишите, каким должен получиться ролик' });
      if (type === 'singing' && !input.prompt) return res.status(400).json({ ok: false, error: 'Введите текст или пожелание для героя' });
      if (type === 'character' && (!input.recipient || !input.prompt)) return res.status(400).json({ ok: false, error: 'Укажите получателя и текст поздравления' });

      const assets = Array.isArray(req.body.assets) ? req.body.assets : [];
      const assetUrls = await saveAssets(req, assets, type);
      const taskBody = makeTaskBody(type, input, assetUrls);

      const orderRows = await supabasePost('video_orders', {
        max_id: maxId,
        type,
        status: 'creating',
        prompt: input.prompt,
        input,
        asset_urls: assetUrls,
        price
      });
      const order = orderRows[0];

      const newBalance = balance - price;
      const reservedUsers = await supabasePatch('users', {
        max_id: 'eq.' + maxId,
        balance: 'eq.' + String(balance)
      }, { balance: newBalance });
      if (!reservedUsers.length) {
        await supabasePatch('video_orders', { id: 'eq.' + String(order.id), max_id: 'eq.' + maxId }, {
          status: 'failed',
          error: 'Не удалось зарезервировать баланс',
          updated_at: new Date().toISOString()
        });
        return res.status(409).json({ ok: false, error: 'Баланс изменился. Обновите приложение и попробуйте снова.' });
      }

      try {
        const taskResponse = await createPiApiTask(taskBody);
        const id = taskId(taskResponse);
        if (!id) throw new Error('PiAPI не вернул task_id');

        const rows = await supabasePatch('video_orders', {
          id: 'eq.' + String(order.id),
          max_id: 'eq.' + maxId,
          status: 'eq.creating'
        }, {
          status: 'processing',
          task_id: id,
          updated_at: new Date().toISOString()
        });
        if (!rows.length) throw new Error('Не удалось сохранить task_id видео-заказа');

        try {
          await supabasePost('transactions', {
            user_id: maxId,
            type: 'video_generation',
            amount: -price,
            description: 'Генерация видео Wan 2.6 · 15 секунд',
            order_id: null
          });
        } catch (txError) {
          console.error('[VIDEO TRANSACTION]', txError.response?.data || txError.message);
        }

        return res.json({
          ok: true,
          order: rows[0],
          balance: reservedUsers[0]?.balance ?? newBalance,
          task_id: id,
          provider: 'Wan 2.6',
          duration: VIDEO_DURATION
        });
      } catch (providerError) {
        await supabasePatch('users', { max_id: 'eq.' + maxId }, { balance });
        await supabasePatch('video_orders', { id: 'eq.' + String(order.id), max_id: 'eq.' + maxId }, {
          status: 'failed',
          error: safeText(providerError.response?.data?.message || providerError.message || 'Ошибка PiAPI Wan 2.6', 1000),
          updated_at: new Date().toISOString()
        });
        throw providerError;
      }
    } catch (error) {
      console.error('[POST /api/video/generate]', error.response?.data || error.message);
      res.status(400).json({ ok: false, error: error.message || 'Не удалось запустить генерацию видео' });
    }
  });

  app.get('/api/video/orders', async (req, res) => {
    try {
      const auth = requireMaxUser(req);
      const maxId = String(auth.user.id);
      const orders = await supabaseGet('video_orders', {
        max_id: 'eq.' + maxId,
        select: '*',
        order: 'created_at.desc',
        limit: 30
      });
      for (const order of orders) {
        if (order.status === 'processing') await processVideoOrder(req, order);
      }
      res.json({ ok: true, orders });
    } catch (error) {
      console.error('[GET /api/video/orders]', error.response?.data || error.message);
      res.status(400).json({ ok: false, error: error.message || 'Не удалось получить видео-заказы' });
    }
  });
}

const originalListen = express.application.listen;
express.application.listen = function patchedListen(...args) {
  installVideoRoutes(this);
  return originalListen.apply(this, args);
};

const originalSend = express.response.send;
const style = `<style id="ai-video-wan-runtime-style">
#ai-video-flow-sheet .video-runtime-state{margin-top:12px;padding:11px 12px;border-radius:14px;border:1px solid rgba(99,219,255,.13);background:rgba(99,219,255,.05);color:rgba(255,255,255,.62);font-size:8.5px;line-height:1.5}
#ai-video-flow-sheet .video-runtime-state.error{border-color:rgba(255,97,112,.22);background:rgba(255,97,112,.07);color:#ffb7bf}
#ai-video-flow-sheet .video-runtime-state.success{border-color:rgba(24,201,150,.20);background:rgba(24,201,150,.06);color:#a1efd5}
#ai-video-flow-sheet .video-runtime-result{margin-top:12px;padding:9px;border-radius:16px;background:rgba(3,2,7,.42);border:1px solid rgba(255,255,255,.06)}
#ai-video-flow-sheet .video-runtime-result video{display:block;width:100%;max-height:58vh;border-radius:13px;background:#000}
</style>`;

const script = `<script id="ai-video-wan-runtime-script">
(function(){
  if(window.__AI_VIDEO_RUNTIME__)return;
  window.__AI_VIDEO_RUNTIME__=true;

  function initData(){try{return window.WebApp&&window.WebApp.initData||''}catch(e){return ''}}
  function authHeaders(){var h={'Content-Type':'application/json'},d=initData();if(d)h['X-MAX-Init-Data']=d;return h}
  function setState(sheet,text,kind){var state=sheet.querySelector('.video-runtime-state');if(!state){state=document.createElement('div');state.className='video-runtime-state';sheet.querySelector('.box').appendChild(state)}state.className='video-runtime-state'+(kind?' '+kind:'');state.textContent=text;state.style.display=text?'block':'none';return state}
  function resultBox(sheet,url){var box=sheet.querySelector('.video-runtime-result');if(!box){box=document.createElement('div');box.className='video-runtime-result';sheet.querySelector('.box').appendChild(box)}box.innerHTML='<video controls playsinline preload="metadata"></video>';box.querySelector('video').src=url;box.style.display='block'}
  function dataUrlForFile(file,maxSide,quality){return new Promise(function(resolve,reject){var reader=new FileReader();reader.onerror=function(){reject(new Error('Не удалось прочитать файл'))};reader.onload=function(){var img=new Image();img.onload=function(){var scale=Math.min(1,maxSide/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));var ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',quality))};img.onerror=function(){reject(new Error('Не удалось обработать изображение'))};img.src=reader.result};reader.readAsDataURL(file)})}
  async function collectAssets(sheet,type){var input=sheet.querySelector('#vf-files');if(type==='character')return[];if(!input||!input.files||!input.files.length)throw new Error(type==='singing'?'Выберите фотографию':'Выберите фотографию');var files=[].slice.call(input.files);if(type==='singing'&&files.length!==1)throw new Error('Для поющего фото выберите одно изображение');if(type==='photos'&&files.length!==1)throw new Error('Для видео из фото в текущей версии выберите одно фото');return [await dataUrlForFile(files[0],1600,.82)]}
  function collectPayload(sheet){var type=sheet.dataset.type,payload={type,assets:[]};if(type==='photos'){var active=sheet.querySelector('.chip.active');payload.style=active?active.dataset.style:'cinematic';payload.prompt=(sheet.querySelector('#vf-prompt')||{}).value||''}else if(type==='singing'){payload.action=(sheet.querySelector('#vf-action')||{}).value||'sing';payload.prompt=(sheet.querySelector('#vf-prompt')||{}).value||''}else{payload.character=(sheet.querySelector('#vf-character')||{}).value||'homeless';payload.recipient=(sheet.querySelector('#vf-recipient')||{}).value||'';payload.prompt=(sheet.querySelector('#vf-prompt')||{}).value||'';payload.location=(sheet.querySelector('#vf-location')||{}).value||'street'}return payload}
  async function refreshBalance(){try{var r=await fetch('/api/user',{headers:{'X-MAX-Init-Data':initData()}}),d=await r.json();if(!d.ok||!d.user)return;var value=Math.round(Number(d.user.balance||0))+' ₽',el=document.getElementById('balance-value'),home=document.getElementById('ai-home-account-balance-value');if(el)el.textContent=value;if(home)home.textContent=value}catch(e){}}
  async function poll(sheet,orderId){for(var i=0;i<90;i++){await new Promise(function(resolve){setTimeout(resolve,4000)});var response=await fetch('/api/video/orders',{headers:{'X-MAX-Init-Data':initData()}}),data=await response.json();if(!data.ok)throw new Error(data.error||'Ошибка проверки видео');var order=(data.orders||[]).find(function(x){return String(x.id)===String(orderId)});if(!order)continue;if(order.status==='completed'&&order.video_url){setState(sheet,'Видео готово. Wan 2.6 создал 15-секундный ролик.','success');resultBox(sheet,order.video_url);refreshBalance();return true}if(order.status==='failed')throw new Error(order.error||'Генерация видео завершилась ошибкой');setState(sheet,'Wan 2.6 создаёт видео… Это может занять несколько минут.','')};throw new Error('Время ожидания генерации истекло. Проверьте раздел позже.')}
  async function bindSubmit(sheet){var button=sheet.querySelector('.submit');if(!button||button.dataset.videoRuntimeBound==='1')return;button.dataset.videoRuntimeBound='1';button.addEventListener('click',async function(){if(button.disabled)return;button.disabled=true;setState(sheet,'Подготавливаем материалы и запускаем Wan 2.6 · 15 секунд…','');var result=sheet.querySelector('.video-runtime-result');if(result)result.style.display='none';try{var payload=collectPayload(sheet);payload.assets=await collectAssets(sheet,payload.type);var response=await fetch('/api/video/generate',{method:'POST',headers:authHeaders(),body:JSON.stringify(payload)}),data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||'Не удалось запустить генерацию');await poll(sheet,data.order.id)}catch(error){console.error('[AI VIDEO WAN RUNTIME]',error);setState(sheet,error.message||'Ошибка генерации видео','error');button.disabled=false}})}
  function patch(){var sheet=document.getElementById('ai-video-flow-sheet');if(!sheet)return;var button=sheet.querySelector('.submit');if(button&&!button.dataset.videoRuntimeBound)bindSubmit(sheet)}
  function start(){patch();new MutationObserver(patch).observe(document.body,{subtree:true,childList:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
</script>`;

express.response.send = function patchedSend(body) {
  try {
    if (typeof body === 'string' && body.includes('<body') && !body.includes('ai-video-wan-runtime-script')) {
      const marker = '</body>';
      const index = body.toLowerCase().lastIndexOf(marker);
      if (index >= 0) body = body.slice(0, index) + style + '\n' + script + '\n' + body.slice(index);
    }
  } catch (error) {
    console.error('[AI VIDEO WAN RUNTIME INJECT]', error.message);
  }
  return originalSend.call(this, body);
};

console.log('[AI VIDEO WAN RUNTIME] loaded:', { model: 'Wan 2.6', duration: VIDEO_DURATION, resolution: VIDEO_RESOLUTION, prices: VIDEO_PRICES });
