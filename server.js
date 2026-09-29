const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const cors = require('cors');

const app = express();
app.disable('x-powered-by');

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-MAX-Init-Data', 'Range'],
  exposedHeaders: ['Accept-Ranges', 'Content-Length', 'Content-Range', 'Content-Type'],
  credentials: false
}));

app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  console.log(
    '[REQUEST]',
    new Date().toISOString(),
    req.method,
    req.originalUrl,
    'Origin:', req.headers.origin || '-',
    'UA:', req.headers['user-agent'] || '-'
  );
  next();
});

const PORT = process.env.PORT || 10000;
const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const PIAPI_KEY = process.env.PIAPI_KEY || '';
const SONG_PRICE = 200;
const AUDIO_PROXY_HOSTS = new Set(['s.bmnmny.cn', 'cn.m4a.bmnmny.cn', 'cn2.m4a.bmnmny.cn', 'cn3.m4a.bmnmny.cn']);
const AUDIO_STORAGE_BUCKET = 'songs';
const AUDIO_ACCESS_TTL_SECONDS = 24 * 60 * 60;
const AUDIO_ACCESS_SECRET = MAX_BOT_TOKEN || SUPABASE_KEY;

const dbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json',
  Prefer: 'return=representation'
};

function checkConfig() {
  return {
    maxBotTokenConfigured: Boolean(MAX_BOT_TOKEN),
    supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_KEY),
    piapiConfigured: Boolean(PIAPI_KEY)
  };
}

function decodeInitDataValue(value) {
  try {
    return decodeURIComponent(value.replace(/\+/g, '%20'));
  } catch (_) {
    return value;
  }
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
  ) {
    throw new Error('Invalid MAX initData signature');
  }

  if (decodedParams.auth_date) {
    const authDate = Number(decodedParams.auth_date);
    if (!Number.isNaN(authDate)) {
      const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
      if (ageSeconds > 3600) throw new Error('MAX initData expired');
    }
  }

  let user = null;
  if (decodedParams.user) {
    try {
      user = JSON.parse(decodedParams.user);
    } catch (_) {
      user = null;
    }
  }

  return { params: decodedParams, user };
}

function requireMaxUser(req) {
  const initData =
    req.headers['x-max-init-data'] ||
    req.query.initData ||
    req.body?.initData || '';

  if (!initData) throw new Error('MAX initData is missing');

  const result = validateMaxInitData(initData);
  if (!result.user || !result.user.id) throw new Error('MAX user data is missing');
  return result;
}

async function supabaseGet(table, query) {
  const response = await axios.get(
    SUPABASE_URL + '/rest/v1/' + table,
    { headers: dbHeaders, params: query }
  );
  return response.data;
}

async function supabasePost(table, body) {
  const response = await axios.post(
    SUPABASE_URL + '/rest/v1/' + table,
    body,
    { headers: dbHeaders }
  );
  return response.data;
}

async function supabasePatch(table, query, body) {
  const response = await axios.patch(
    SUPABASE_URL + '/rest/v1/' + table,
    body,
    { headers: dbHeaders, params: query }
  );
  return response.data;
}

function encodeStoragePath(storagePath) {
  return String(storagePath || '')
    .split('/')
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join('/');
}

function getStorageObjectUrl(storagePath) {
  return (
    SUPABASE_URL +
    '/storage/v1/object/authenticated/' +
    AUDIO_STORAGE_BUCKET +
    '/' +
    encodeStoragePath(storagePath)
  );
}

function getStorageUploadUrl(storagePath) {
  return (
    SUPABASE_URL +
    '/storage/v1/object/' +
    AUDIO_STORAGE_BUCKET +
    '/' +
    encodeStoragePath(storagePath)
  );
}

function getAudioExtension(sourceUrl, contentType) {
  const normalizedType = String(contentType || '').toLowerCase().split(';')[0];

  if (normalizedType === 'audio/mpeg') return 'mp3';
  if (
    normalizedType === 'audio/mp4' ||
    normalizedType === 'audio/x-m4a' ||
    normalizedType === 'audio/m4a'
  ) return 'm4a';

  try {
    const pathname = new URL(sourceUrl).pathname.toLowerCase();
    if (pathname.endsWith('.mp3')) return 'mp3';
    if (pathname.endsWith('.m4a')) return 'm4a';
  } catch (_) {}

  return 'm4a';
}

async function saveExternalAudioToStorage(orderId, variant, sourceUrl, timeoutMs = 120000) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase storage is not configured');
  }

  const source = getAllowedAudioUrl(sourceUrl);

  const sourceResponse = await axios.get(source.toString(), {
    responseType: 'arraybuffer',
    timeout: timeoutMs,
    maxContentLength: 50 * 1024 * 1024,
    maxBodyLength: 50 * 1024 * 1024,
    headers: { 'Accept-Encoding': 'identity' }
  });

  const sourceContentType =
    String(sourceResponse.headers['content-type'] || '')
      .toLowerCase()
      .split(';')[0];

  const extension = getAudioExtension(
    source.toString(),
    sourceContentType
  );

  const storagePath =
    String(orderId) + '/variant-' + String(variant) + '.' + extension;

  const uploadContentType =
    sourceContentType.startsWith('audio/')
      ? sourceContentType
      : extension === 'mp3'
        ? 'audio/mpeg'
        : 'audio/mp4';

  try {
    await axios.post(
      getStorageUploadUrl(storagePath),
      sourceResponse.data,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: 'Bearer ' + SUPABASE_KEY,
          'Content-Type': uploadContentType,
          'x-upsert': 'true'
        },
        timeout: 120000,
        maxContentLength: 50 * 1024 * 1024,
        maxBodyLength: 50 * 1024 * 1024
      }
    );
  } catch (uploadError) {
    console.error(
      '[SONG STORAGE UPLOAD]',
      'order=' + String(orderId),
      'variant=' + String(variant),
      'status=' + String(uploadError.response?.status || ''),
      uploadError.response?.data || uploadError.message
    );
    throw uploadError;
  }

  console.log(
    '[SONG STORAGE] saved order=' +
      String(orderId) +
      ' variant=' +
      String(variant) +
      ' path=' +
      storagePath
  );

  return storagePath;
}

function audioSignatureIsValid(userId, orderId, variant, exp, sig) {
  if (!AUDIO_ACCESS_SECRET || !sig) return false;

  const numericExp = Number(exp);
  if (!Number.isInteger(numericExp)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (
    numericExp <= now ||
    numericExp > now + AUDIO_ACCESS_TTL_SECONDS + 60
  ) {
    return false;
  }

  const payload = [
    String(userId),
    String(orderId),
    String(variant),
    String(numericExp)
  ].join(':');

  const expected = crypto
    .createHmac('sha256', AUDIO_ACCESS_SECRET)
    .update(payload, 'utf8')
    .digest('hex');

  const a = Buffer.from(String(sig), 'hex');
  const b = Buffer.from(expected, 'hex');

  return (
    a.length === b.length &&
    crypto.timingSafeEqual(a, b)
  );
}

function buildAudioAccessUrl(req, userId, orderId, variant, download = false) {
  const exp =
    Math.floor(Date.now() / 1000) + AUDIO_ACCESS_TTL_SECONDS;

  const payload = [
    String(userId),
    String(orderId),
    String(variant),
    String(exp)
  ].join(':');

  const signature = crypto
    .createHmac('sha256', AUDIO_ACCESS_SECRET)
    .update(payload, 'utf8')
    .digest('hex');

  const forwardedProto = String(
    req.headers['x-forwarded-proto'] || ''
  )
    .split(',')[0]
    .trim();

  const protocol = forwardedProto || req.protocol || 'https';
  const host = req.get('host');

  let url =
    protocol +
    '://' +
    host +
    '/api/audio?orderId=' +
    encodeURIComponent(orderId) +
    '&variant=' +
    encodeURIComponent(variant) +
    '&exp=' +
    encodeURIComponent(exp) +
    '&sig=' +
    encodeURIComponent(signature);

  if (download) url += '&download=1';

  return url;
}

async function getOrderForAudio(orderId) {
  const rows = await supabaseGet('orders', {
    id: 'eq.' + String(orderId),
    select: '*',
    limit: 1
  });

  return rows[0] || null;
}

async function migrateLegacyOrderAudio(order) {
  const patch = {};
  let changed = false;

  for (const [variant, urlField, pathField] of [
    [1, 'audio_url', 'storage_path'],
    [2, 'audio_url_2', 'storage_path_2']
  ]) {
    if (order[pathField] || !order[urlField]) continue;

    try {
      const storedPath = await saveExternalAudioToStorage(
        order.id,
        variant,
        order[urlField],
        15000
      );

      patch[pathField] = storedPath;
      changed = true;
    } catch (error) {
      console.error(
        '[SONG STORAGE MIGRATION]',
        'order=' + String(order.id),
        'variant=' + String(variant),
        error.response?.status || '',
        error.message
      );
    }
  }

  const selectedVariant = Number(order.selected_variant || 0);
  const selectedPath =
    selectedVariant === 1
      ? patch.storage_path || order.storage_path
      : selectedVariant === 2
        ? patch.storage_path_2 || order.storage_path_2
        : null;

  if (
    order.status === 'completed' &&
    selectedPath &&
    order.storage_path_selected !== selectedPath
  ) {
    patch.storage_path_selected = selectedPath;
    changed = true;
  }

  if (!changed) return order;

  patch.storage_saved_at = new Date().toISOString();

  try {
    const updatedRows = await supabasePatch(
      'orders',
      { id: 'eq.' + String(order.id) },
      patch
    );

    if (updatedRows[0]) Object.assign(order, updatedRows[0]);
    else Object.assign(order, patch);
  } catch (error) {
    console.error(
      '[SONG STORAGE DB PATCH]',
      'order=' + String(order.id),
      error.response?.data || error.message
    );
  }

  return order;
}

async function migrateLegacySongsOnStartup() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;

  try {
    const orders = await supabaseGet('orders', {
      status: 'in.(preview,completed)',
      select:
        'id,user_id,status,audio_url,audio_url_2,selected_variant,storage_path,storage_path_2,storage_path_selected',
      order: 'id.asc',
      limit: 100
    });

    console.log(
      '[SONG STORAGE] legacy migration scan:',
      orders.length,
      'orders'
    );

    for (const order of orders) {
      await migrateLegacyOrderAudio(order);
    }

    console.log('[SONG STORAGE] legacy migration scan finished');
  } catch (error) {
    console.error(
      '[SONG STORAGE] startup migration error:',
      error.response?.data || error.message
    );
  }
}

async function getUserByMaxId(maxUserId) {
  const rows = await supabaseGet('users', {
    max_id: 'eq.' + String(maxUserId),
    select: '*',
    limit: 1
  });
  return rows.length ? rows[0] : null;
}

async function createUser(maxUser) {
  const fullName =
    [maxUser.first_name, maxUser.last_name]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    maxUser.username ||
    'MAX пользователь';

  const rows = await supabasePost('users', {
    max_id: String(maxUser.id),
    name: fullName,
    balance: 0
  });

  return rows[0];
}

async function getOrCreateUser(maxUser) {
  let user = await getUserByMaxId(maxUser.id);
  if (user) return user;

  try {
    return await createUser(maxUser);
  } catch (error) {
    if (error.response?.status === 409) {
      user = await getUserByMaxId(maxUser.id);
      if (user) return user;
    }
    throw error;
  }
}

function getPiApiHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-api-key': PIAPI_KEY
  };
}

async function createPiApiTask(prompt) {
  const response = await axios.post(
    'https://api.piapi.ai/api/v1/task',
    {
      model: 'suno',
      task_type: 'music',
      input: {
        gpt_description_prompt: prompt,
        make_instrumental: false
      }
    },
    { headers: getPiApiHeaders(), timeout: 60000 }
  );
  return response.data;
}

async function getPiApiTask(taskId) {
  const response = await axios.get(
    'https://api.piapi.ai/api/v1/task/' + encodeURIComponent(taskId),
    { headers: getPiApiHeaders(), timeout: 60000 }
  );
  return response.data;
}

function getTaskStatus(taskResponse) {
  const result = taskResponse?.data ?? taskResponse;
  return String(
    result?.status ||
    result?.task_status ||
    result?.data?.status ||
    'unknown'
  ).toLowerCase();
}

function extractPiApiSongs(taskResponse) {
  const result = taskResponse?.data ?? taskResponse;
  const output = result?.output;
  if (!output) return [];

  let songs = [];
  if (Array.isArray(output)) songs = output;
  else if (Array.isArray(output.songs)) songs = output.songs;
  else if (Array.isArray(output.data)) songs = output.data;
  else if (output.audio_url || output.audioUrl || output.url) songs = [output];

  return songs.map((song) => ({
    audioUrl:
      song.audio_url ||
      song.audioUrl ||
      song.url ||
      song.source_audio_url ||
      null,
    title:
      song.title ||
      song.name ||
      song.prompt ||
      'Ваша песня'
  })).filter((song) => Boolean(song.audioUrl));
}

function getAllowedAudioUrl(rawUrl) {
  const url = new URL(String(rawUrl || '').trim());
  if (!['https:', 'http:'].includes(url.protocol)) {
    throw new Error('Only HTTP(S) audio URLs are allowed');
  }
  if (!AUDIO_PROXY_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error('Audio host is not allowed');
  }
  return url;
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'max-song-app',
    config: checkConfig(),
    time: new Date().toISOString()
  });
});

app.get('/api/max-bot-check', async (req, res) => {
  try {
    if (!MAX_BOT_TOKEN) {
      return res.status(500).json({ ok: false, error: 'MAX_BOT_TOKEN is not configured' });
    }

    const response = await axios.get(
      'https://platform-api2.max.ru/users/@me',
      {
        headers: { Authorization: 'Bearer ' + MAX_BOT_TOKEN },
        timeout: 15000
      }
    );

    const bot = response.data || {};
    res.json({
      ok: true,
      tokenAcceptedByMax: true,
      bot: {
        id: bot.user_id || bot.id || null,
        name: bot.name || null,
        username: bot.username || null
      }
    });
  } catch (error) {
    const status = error.response?.status || 500;
    const data = error.response?.data || null;
    console.error('[GET /api/max-bot-check]', status, data || error.message);
    res.status(status).json({
      ok: false,
      tokenAcceptedByMax: false,
      status,
      error: data?.message || data?.error || error.message || 'MAX API error'
    });
  }
});

app.get('/api/max-probe', (req, res) => {
  res.json({
    ok: true,
    service: 'max-song-app',
    cors: true,
    time: new Date().toISOString(),
    origin: req.headers.origin || null,
    userAgent: req.headers['user-agent'] || ''
  });
});

app.get('/api/user', async (req, res) => {
  try {
    const auth = requireMaxUser(req);
    const user = await getOrCreateUser(auth.user);
    const orders = await supabaseGet('orders', {
      user_id: 'eq.' + String(user.max_id),
      select: '*',
      order: 'created_at.desc',
      limit: 20
    });

    res.json({ ok: true, user, orders });
  } catch (error) {
    console.error('[GET /api/user]', error.response?.data || error.message);
    res.status(401).json({ ok: false, error: error.message || 'Authorization error' });
  }
});

app.post('/api/topup', async (req, res) => {
  try {
    const auth = requireMaxUser(req);
    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ ok: false, error: 'Некорректная сумма' });
    }

    const user = await getOrCreateUser(auth.user);
    let bonus = 0;
    if (amount >= 800) bonus = amount * 0.2;
    else if (amount >= 400) bonus = amount * 0.1;

    const totalCredit = amount + bonus;
    const newBalance = Number(user.balance || 0) + totalCredit;

    const updatedRows = await supabasePatch(
      'users',
      { max_id: 'eq.' + String(user.max_id) },
      { balance: newBalance }
    );

    await supabasePost('transactions', {
      user_id: user.max_id,
      type: 'topup_test',
      amount: totalCredit,
      description: 'Тестовое пополнение без реальной оплаты'
    });

    res.json({
      ok: true,
      testMode: true,
      added: totalCredit,
      bonus,
      balance: updatedRows[0]?.balance ?? newBalance
    });
  } catch (error) {
    console.error('[POST /api/topup]', error.response?.data || error.message);
    res.status(400).json({ ok: false, error: error.message || 'Ошибка пополнения' });
  }
});

app.post('/api/generate-song', async (req, res) => {
  try {
    const auth = requireMaxUser(req);
    const user = await getOrCreateUser(auth.user);

    const existingOrders = await supabaseGet('orders', {
      user_id: 'eq.' + String(user.max_id),
      status: 'in.(processing,preview,purchasing)',
      select: 'id,status,created_at',
      order: 'created_at.desc',
      limit: 1
    });

    if (existingOrders.length) {
      return res.status(409).json({
        ok: false,
        error: 'У вас уже есть песня, ожидающая покупки. Сначала выберите вариант и оплатите её.',
        order: existingOrders[0]
      });
    }

    if (Number(user.balance || 0) < SONG_PRICE) {
      return res.status(400).json({
        ok: false,
        error: 'Для генерации нужен баланс минимум 200 ₽. Пополните баланс и попробуйте снова.'
      });
    }

    const genre = String(req.body.genre || '').trim();
    const vocal = String(req.body.vocal || '').trim();
    const prompt = String(req.body.prompt || '').trim();

    if (!prompt) {
      return res.status(400).json({ ok: false, error: 'Введите описание песни' });
    }

    const fullPrompt = [
      genre ? 'Жанр: ' + genre : '',
      vocal ? 'Вокал: ' + vocal : '',
      'Описание: ' + prompt
    ].filter(Boolean).join('. ');

    const piApiResult = await createPiApiTask(fullPrompt);
    const piData = piApiResult?.data ?? piApiResult;
    const taskId = piData?.id || piData?.task_id || piApiResult?.id || piApiResult?.task_id;

    if (!taskId) {
      console.error('[PIAPI CREATE TASK]', JSON.stringify(piApiResult));
      return res.status(502).json({ ok: false, error: 'PiAPI не вернул task_id' });
    }

    const orderRows = await supabasePost('orders', {
      user_id: user.max_id,
      genre,
      vocal,
      prompt,
      status: 'processing',
      task_id: String(taskId),
      price: SONG_PRICE
    });

    res.json({
      ok: true,
      demo: true,
      order: orderRows[0] || null,
      task_id: String(taskId)
    });
  } catch (error) {
    console.error('[POST /api/generate-song]', error.response?.data || error.message);
    res.status(400).json({ ok: false, error: error.message || 'Не удалось запустить генерацию' });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const auth = requireMaxUser(req);
    const user = await getOrCreateUser(auth.user);

    const orders = await supabaseGet('orders', {
      user_id: 'eq.' + String(user.max_id),
      select: '*',
      order: 'created_at.desc',
      limit: 50
    });

    for (const order of orders) {
      if (order.status !== 'processing' || !order.task_id) continue;

      try {
        const taskResponse = await getPiApiTask(order.task_id);
        const status = getTaskStatus(taskResponse);
        const songs = extractPiApiSongs(taskResponse);

        if (
          songs.length > 0 ||
          ['completed', 'success', 'succeeded', 'done'].includes(status)
        ) {
          const song1 = songs[0] || {};
          const song2 = songs[1] || {};
          const patch = {
            status: songs.length > 0 ? 'preview' : 'processing'
          };

          if (song1.audioUrl) {
            patch.audio_url = song1.audioUrl;

            if (!order.storage_path) {
              try {
                patch.storage_path = await saveExternalAudioToStorage(
                  order.id,
                  1,
                  song1.audioUrl
                );
              } catch (storageError) {
                console.error(
                  '[SONG STORAGE PREVIEW]',
                  'order=' + String(order.id),
                  'variant=1',
                  storageError.response?.status || '',
                  storageError.message
                );
              }
            }
          }

          if (song1.title) patch.title = song1.title;

          if (song2.audioUrl) {
            patch.audio_url_2 = song2.audioUrl;

            if (!order.storage_path_2) {
              try {
                patch.storage_path_2 = await saveExternalAudioToStorage(
                  order.id,
                  2,
                  song2.audioUrl
                );
              } catch (storageError) {
                console.error(
                  '[SONG STORAGE PREVIEW]',
                  'order=' + String(order.id),
                  'variant=2',
                  storageError.response?.status || '',
                  storageError.message
                );
              }
            }
          }

          if (song2.title) patch.title_2 = song2.title;

          if (patch.storage_path || patch.storage_path_2) {
            patch.storage_saved_at = new Date().toISOString();
          }

          const updatedRows = await supabasePatch('orders', {
            id: 'eq.' + String(order.id),
            user_id: 'eq.' + String(user.max_id)
          }, patch);

          if (updatedRows[0]) Object.assign(order, updatedRows[0]);
        } else if (['failed', 'error', 'cancelled', 'canceled'].includes(status)) {
          const updatedRows = await supabasePatch('orders', {
            id: 'eq.' + String(order.id),
            user_id: 'eq.' + String(user.max_id)
          }, { status: 'failed' });

          if (updatedRows[0]) Object.assign(order, updatedRows[0]);
        }
      } catch (taskError) {
        console.error('[PIAPI TASK CHECK]', order.task_id, taskError.response?.data || taskError.message);
      }
    }

    const responseOrders = orders.map((order) => ({
      ...order,
      audio_play_url:
        buildAudioAccessUrl(req, user.max_id, order.id, 1),
      audio_play_url_2:
        buildAudioAccessUrl(req, user.max_id, order.id, 2),
      audio_download_url:
        buildAudioAccessUrl(
          req,
          user.max_id,
          order.id,
          1,
          true
        ),
      audio_download_url_2:
        buildAudioAccessUrl(
          req,
          user.max_id,
          order.id,
          2,
          true
        ),
      audio_play_url_selected:
        order.selected_variant
          ? buildAudioAccessUrl(
              req,
              user.max_id,
              order.id,
              Number(order.selected_variant)
            )
          : buildAudioAccessUrl(
              req,
              user.max_id,
              order.id,
              1
            ),
      audio_download_url_selected:
        order.selected_variant
          ? buildAudioAccessUrl(
              req,
              user.max_id,
              order.id,
              Number(order.selected_variant),
              true
            )
          : buildAudioAccessUrl(
              req,
              user.max_id,
              order.id,
              1,
              true
            )
    }));

    res.json({ ok: true, orders: responseOrders });
  } catch (error) {
    console.error('[GET /api/orders]', error.response?.data || error.message);
    res.status(400).json({ ok: false, error: error.message || 'Не удалось получить заказы' });
  }
});

app.post('/api/unlock-song', async (req, res) => {
  try {
    const auth = requireMaxUser(req);
    const user = await getOrCreateUser(auth.user);
    const orderId = req.body.orderId;
    const selectedVariant = Number(req.body.variant || 1);

    if (!orderId) return res.status(400).json({ ok: false, error: 'orderId не указан' });
    if (selectedVariant !== 1 && selectedVariant !== 2) {
      return res.status(400).json({ ok: false, error: 'Некорректный вариант песни' });
    }

    const rows = await supabaseGet('orders', {
      id: 'eq.' + String(orderId),
      user_id: 'eq.' + String(user.max_id),
      select: '*',
      limit: 1
    });

    if (!rows.length) return res.status(404).json({ ok: false, error: 'Заказ не найден' });
    const order = rows[0];

    if (order.status !== 'preview') {
      return res.status(400).json({ ok: false, error: 'Этот заказ пока нельзя разблокировать' });
    }

    const selectedAudioUrl =
      selectedVariant === 1 ? order.audio_url : order.audio_url_2;
    const selectedTitle =
      selectedVariant === 1 ? order.title : order.title_2;

    let selectedStoragePath =
      selectedVariant === 1
        ? order.storage_path
        : order.storage_path_2;

    if (!selectedAudioUrl && !selectedStoragePath) {
      return res.status(400).json({
        ok: false,
        error: 'Выбранный вариант песни отсутствует'
      });
    }

    // Не списываем деньги, пока выбранный файл не сохранён постоянно.
    if (!selectedStoragePath) {
      try {
        selectedStoragePath = await saveExternalAudioToStorage(
          order.id,
          selectedVariant,
          selectedAudioUrl
        );

        const storagePatch =
          selectedVariant === 1
            ? {
                storage_path: selectedStoragePath,
                storage_path_selected: selectedStoragePath,
                storage_saved_at: new Date().toISOString()
              }
            : {
                storage_path_2: selectedStoragePath,
                storage_path_selected: selectedStoragePath,
                storage_saved_at: new Date().toISOString()
              };

        const storedRows = await supabasePatch(
          'orders',
          {
            id: 'eq.' + String(order.id),
            user_id: 'eq.' + String(user.max_id),
            status: 'eq.preview'
          },
          storagePatch
        );

        if (storedRows[0]) Object.assign(order, storedRows[0]);
      } catch (storageError) {
        console.error(
          '[SONG STORAGE UNLOCK]',
          'order=' + String(order.id),
          storageError.response?.status || '',
          storageError.message
        );

        return res.status(503).json({
          ok: false,
          error:
            'Не удалось сохранить аудиофайл. Деньги не списаны. Попробуйте ещё раз.'
        });
      }
    }

    const balance = Number(user.balance || 0);
    if (balance < SONG_PRICE) {
      return res.status(400).json({ ok: false, error: 'Недостаточно средств для покупки' });
    }

    const reserveRows = await supabasePatch('orders', {
      id: 'eq.' + String(order.id),
      user_id: 'eq.' + String(user.max_id),
      status: 'eq.preview'
    }, { status: 'purchasing' });

    if (!reserveRows.length) {
      return res.status(409).json({ ok: false, error: 'Заказ уже обрабатывается или был куплен' });
    }

    const newBalance = balance - SONG_PRICE;
    let updatedUserRows;

    try {
      updatedUserRows = await supabasePatch('users', {
        max_id: 'eq.' + String(user.max_id)
      }, { balance: newBalance });
    } catch (balanceError) {
      await supabasePatch('orders', {
        id: 'eq.' + String(order.id),
        user_id: 'eq.' + String(user.max_id),
        status: 'eq.purchasing'
      }, { status: 'preview' });
      throw balanceError;
    }

    const updatedOrderRows = await supabasePatch('orders', {
      id: 'eq.' + String(order.id),
      user_id: 'eq.' + String(user.max_id),
      status: 'eq.purchasing'
    }, {
      status: 'completed',
      selected_variant: selectedVariant,
      audio_url_selected: selectedAudioUrl,
      storage_path_selected: selectedStoragePath,
      title_selected: selectedTitle || 'Ваша песня'
    });

    if (!updatedOrderRows.length) {
      await supabasePatch('users', {
        max_id: 'eq.' + String(user.max_id)
      }, { balance });

      await supabasePatch('orders', {
        id: 'eq.' + String(order.id),
        user_id: 'eq.' + String(user.max_id),
        status: 'eq.purchasing'
      }, { status: 'preview' });

      return res.status(409).json({
        ok: false,
        error: 'Не удалось завершить покупку. Средства не списаны.'
      });
    }

    try {
      await supabasePost('transactions', {
        user_id: user.max_id,
        type: 'song_purchase',
        amount: -SONG_PRICE,
        description: 'Покупка полной версии песни',
        order_id: order.id
      });
    } catch (transactionError) {
      console.error('[TRANSACTION LOG]', transactionError.response?.data || transactionError.message);
    }

    res.json({
      ok: true,
      user: updatedUserRows[0] || { ...user, balance: newBalance },
      order: updatedOrderRows[0],
      audioUrl: buildAudioAccessUrl(
        req,
        user.max_id,
        order.id,
        selectedVariant,
        true
      ),
      title: selectedTitle || 'Ваша песня'
    });
  } catch (error) {
    console.error('[POST /api/unlock-song]', error.response?.data || error.message);
    res.status(400).json({ ok: false, error: error.message || 'Не удалось купить песню' });
  }
});

app.get('/api/audio', async (req, res) => {
  try {
    const orderId = String(req.query.orderId || '').trim();
    const variant = Number(req.query.variant || 1);
    const exp = Number(req.query.exp || 0);
    const sig = String(req.query.sig || '').trim();

    // Новый режим: подпись выдаётся только через авторизованный /api/orders.
    // Она привязана к пользователю + orderId + variant + expiry.
    if (orderId && sig && exp) {
      if (variant !== 1 && variant !== 2) {
        return res.status(400).send('Некорректный вариант песни');
      }

      const order = await getOrderForAudio(orderId);
      if (!order) {
        return res.status(404).send('Песня не найдена');
      }

      const ownerId = String(order.user_id || order.max_id || '');
      if (!ownerId) {
        return res.status(404).send('Пользователь не найден');
      }

      if (!audioSignatureIsValid(
        ownerId,
        orderId,
        variant,
        exp,
        sig
      )) {
        return res.status(403).send('Ссылка на аудио недействительна');
      }

      const storagePath =
        variant === 1
          ? order.storage_path || ''
          : order.storage_path_2 || '';

      // Старые заказы, которые ещё не успели мигрировать,
      // продолжают работать через старый внешний URL.
      if (!storagePath) {
        const legacyUrl =
          variant === 1
            ? order.audio_url
            : order.audio_url_2;

        if (!legacyUrl) {
          return res.status(404).send('Аудиофайл не найден');
        }

        const url = getAllowedAudioUrl(legacyUrl);
        const headers = {
          'Accept-Encoding': 'identity'
        };

        if (req.headers.range) {
          headers.Range = String(req.headers.range);
        }

        const response = await axios.get(url.toString(), {
          responseType: 'stream',
          timeout: 60000,
          headers,
          validateStatus: (status) => status >= 200 && status < 400,
          maxRedirects: 5
        });

        const contentType =
          response.headers['content-type'] || 'audio/mp4';

        res.status(response.status === 206 ? 206 : 200);
        res.setHeader(
          'Content-Type',
          contentType.includes('audio/')
            ? contentType
            : 'audio/mp4'
        );
        res.setHeader(
          'Accept-Ranges',
          response.headers['accept-ranges'] || 'bytes'
        );

        if (response.headers['content-length']) {
          res.setHeader(
            'Content-Length',
            response.headers['content-length']
          );
        }

        if (response.headers['content-range']) {
          res.setHeader(
            'Content-Range',
            response.headers['content-range']
          );
        }

        if (req.query.download === '1') {
          const fileName = String(
            order.title_selected ||
              order.title ||
              order.title_2 ||
              'song'
          )
            .replace(/[\\/:*?"<>|]/g, '_')
            .slice(0, 80);

          res.setHeader(
            'Content-Disposition',
            'attachment; filename="' +
              encodeURIComponent(fileName) +
              '.m4a"'
          );
        }

        response.data.on('error', (streamError) => {
          console.error(
            '[AUDIO LEGACY STREAM]',
            streamError.message
          );
          if (!res.headersSent) res.status(502).end();
          else res.end();
        });

        response.data.pipe(res);
        return;
      }

      const storageResponse = await axios.get(
        getStorageObjectUrl(storagePath),
        {
          responseType: 'stream',
          timeout: 60000,
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: 'Bearer ' + SUPABASE_KEY,
            'Accept-Encoding': 'identity',
            ...(req.headers.range
              ? { Range: String(req.headers.range) }
              : {})
          },
          validateStatus: (status) => status >= 200 && status < 400,
          maxRedirects: 3
        }
      );

      const contentType =
        storageResponse.headers['content-type'] ||
        (String(storagePath).endsWith('.mp3')
          ? 'audio/mpeg'
          : 'audio/mp4');

      res.status(storageResponse.status === 206 ? 206 : 200);
      res.setHeader(
        'Content-Type',
        contentType.includes('audio/')
          ? contentType
          : 'audio/mp4'
      );
      res.setHeader(
        'Accept-Ranges',
        storageResponse.headers['accept-ranges'] || 'bytes'
      );

      if (storageResponse.headers['content-length']) {
        res.setHeader(
          'Content-Length',
          storageResponse.headers['content-length']
        );
      }

      if (storageResponse.headers['content-range']) {
        res.setHeader(
          'Content-Range',
          storageResponse.headers['content-range']
        );
      }

      res.setHeader(
        'Cache-Control',
        'private, max-age=3600'
      );

      if (req.query.download === '1') {
        const fileName = String(
          order.title_selected ||
            order.title ||
            order.title_2 ||
            'song'
        )
          .replace(/[\\/:*?"<>|]/g, '_')
          .slice(0, 80);

        const extension = String(storagePath)
          .toLowerCase()
          .endsWith('.mp3')
          ? 'mp3'
          : 'm4a';

        res.setHeader(
          'Content-Disposition',
          'attachment; filename="' +
            encodeURIComponent(fileName) +
            '.' +
            extension +
            '"'
        );
      }

      storageResponse.data.on('error', (streamError) => {
        console.error(
          '[SONG STORAGE STREAM]',
          streamError.message
        );
        if (!res.headersSent) res.status(502).end();
        else res.end();
      });

      storageResponse.data.pipe(res);
      return;
    }

    // Старый endpoint /api/audio?url=... сохраняем без изменений
    // для обратной совместимости со старыми клиентами.
    const url = getAllowedAudioUrl(req.query.url);
    const range = String(req.headers.range || '').trim();

    const headers = {
      'Accept-Encoding': 'identity'
    };
    if (range) headers.Range = range;

    const response = await axios.get(url.toString(), {
      responseType: 'stream',
      timeout: 60000,
      headers,
      validateStatus: (status) => status >= 200 && status < 400,
      maxRedirects: 5
    });

    const contentType =
      response.headers['content-type'] || 'audio/mp4';

    res.status(response.status === 206 ? 206 : 200);
    res.setHeader(
      'Content-Type',
      contentType.includes('audio/')
        ? contentType
        : 'audio/mp4'
    );
    res.setHeader(
      'Accept-Ranges',
      response.headers['accept-ranges'] || 'bytes'
    );

    if (response.headers['content-length']) {
      res.setHeader(
        'Content-Length',
        response.headers['content-length']
      );
    }

    if (response.headers['content-range']) {
      res.setHeader(
        'Content-Range',
        response.headers['content-range']
      );
    }

    if (response.headers['cache-control']) {
      res.setHeader(
        'Cache-Control',
        response.headers['cache-control']
      );
    }

    response.data.on('error', (streamError) => {
      console.error(
        '[AUDIO PROXY STREAM]',
        streamError.message
      );
      if (!res.headersSent) res.status(502).end();
      else res.end();
    });

    response.data.pipe(res);
  } catch (error) {
    console.error(
      '[GET /api/audio]',
      error.response?.status || '',
      error.message
    );

    if (!res.headersSent) {
      res.status(502).send('Не удалось получить аудиофайл');
    } else {
      res.end();
    }
  }
});

app.get('/api/download', async (req, res) => {
  try {
    const url = getAllowedAudioUrl(req.query.url).toString();

    const response = await axios.get(url, {
      responseType: 'stream',
      timeout: 60000,
      headers: { 'Accept-Encoding': 'identity' },
      maxRedirects: 5
    });

    res.setHeader('Content-Type', response.headers['content-type'] || 'audio/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="song.m4a"');
    response.data.pipe(res);
  } catch (error) {
    console.error('[GET /api/download]', error.response?.data || error.message);
    res.status(500).send('Не удалось скачать файл');
  }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ ok: false, error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
  console.log('MAX Song App server started on port ' + PORT);
  console.log('Config:', checkConfig());

  // Миграция старых песен запускается после старта и не блокирует приложение.
  setTimeout(() => {
    migrateLegacySongsOnStartup().catch((error) => {
      console.error(
        '[SONG STORAGE] unhandled migration error:',
        error
      );
    });
  }, 8000);
});