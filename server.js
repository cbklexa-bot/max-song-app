const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');

const app = express();

/*
 * Этот сервис одновременно:
 * 1) отдаёт frontend из /public;
 * 2) принимает API-запросы Mini App;
 * 3) сервером обращается к Supabase и PiAPI.
 *
 * Frontend обращается к API относительными URL (/api/...),
 * поэтому для основного сценария CORS между frontend и backend не нужен.
 */

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

// Оставляем CORS для диагностики/внешних вызовов.
// Основной frontend использует same-origin requests.
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

const supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
const supabaseKey = (process.env.SUPABASE_KEY || '').trim();
const PIAPI_KEY = (process.env.PIAPI_KEY || '').trim();
const MAX_BOT_TOKEN = (process.env.MAX_BOT_TOKEN || '').trim();

const SONG_PRICE = 200;
const MAX_INITDATA_MAX_AGE_SECONDS = 24 * 60 * 60;

const dbHeaders = {
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation'
};

function getSunoStyleTags(genre, vocal) {
  const genreMap = {
    'Поп': 'pop, modern pop, catchy synth',
    'Танцевальная': 'dance, EDM, club dance beat, energetic synth',
    'Народная': 'russian folk, accordion, ethno folk, traditional',
    'Шансон': 'russian chanson, acoustic guitar, accordion, emotional',
    'Рок': 'rock, electric guitar, drive drums',
    'Рэп': 'hip hop, rap, trap beat',
    'Акустика': 'acoustic guitar, chill, warm vocal focus',
    'Джаз': 'jazz, smooth jazz, saxophone',
    'Электроника': 'synthwave, electro pop, electronic'
  };

  const vocalMap = {
    'Женский соло': 'female vocal, clear solo female singer',
    'Мужской соло': 'male vocal, clear solo male singer',
    'Дуэт': 'duet, male and female voices',
    'Хор': 'choir, chorus, multiple voices',
    'Детский голос': 'child vocal, clear child voice'
  };

  return `${genreMap[genre] || 'pop'}, ${vocalMap[vocal] || 'male vocal'}, russian song`;
}

/**
 * MAX initData validation.
 *
 * MAX documentation:
 * - WebApp.initData содержит данные для валидации;
 * - из WebAppData берём пары key=value;
 * - hash исключаем;
 * - значения URL-decode;
 * - сортируем по ключам;
 * - создаём launch_params через \n;
 * - secret_key = HMAC-SHA256("WebAppData", BOT_TOKEN);
 * - hash = hex(HMAC-SHA256(secret_key, launch_params)).
 */
function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function constantTimeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;

  const aa = Buffer.from(a.toLowerCase(), 'utf8');
  const bb = Buffer.from(b.toLowerCase(), 'utf8');

  if (aa.length !== bb.length) return false;

  return crypto.timingSafeEqual(aa, bb);
}

function parseInitData(initData) {
  if (typeof initData !== 'string' || !initData.trim()) {
    throw new Error('Пустые initData');
  }

  const outerParams = new URLSearchParams(initData);
  const webAppDataRaw = outerParams.get('WebAppData');

  // MAX может передавать WebAppData как отдельный параметр фрагмента URL.
  if (!webAppDataRaw) {
    throw new Error('В initData отсутствует WebAppData');
  }

  // WebAppData — вложенная строка key=value&key=value.
  const inner = new URLSearchParams(webAppDataRaw);

  const occurrences = {};
  for (const [key] of inner.entries()) {
    occurrences[key] = (occurrences[key] || 0) + 1;
  }

  if (occurrences.hash !== 1) {
    throw new Error('Некорректный параметр hash в WebAppData');
  }

  const originalHash = inner.get('hash');
  if (!originalHash) {
    throw new Error('Отсутствует hash');
  }

  const pairs = [];

  for (const [key, value] of inner.entries()) {
    if (key === 'hash') continue;
    pairs.push([key, safeDecode(value)]);
  }

  pairs.sort(([a], [b]) => a.localeCompare(b));

  const launchParams = pairs
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const userRaw = inner.get('user');

  let user = null;
  if (userRaw) {
    try {
      user = JSON.parse(safeDecode(userRaw));
    } catch {
      throw new Error('Не удалось разобрать user из WebAppData');
    }
  }

  const authDateRaw = inner.get('auth_date');
  const authDate = authDateRaw ? Number(safeDecode(authDateRaw)) : null;

  return {
    originalHash,
    launchParams,
    user,
    authDate
  };
}

function validateMaxInitData(initData) {
  if (!MAX_BOT_TOKEN) {
    const error = new Error('На Render не задана переменная MAX_BOT_TOKEN');
    error.code = 'MAX_BOT_TOKEN_MISSING';
    throw error;
  }

  const {
    originalHash,
    launchParams,
    user,
    authDate
  } = parseInitData(initData);

  if (!user?.id) {
    throw new Error('MAX не передал user.id');
  }

  if (authDate) {
    const now = Math.floor(Date.now() / 1000);

    // Защищаемся от слишком старых launch data.
    // При необходимости этот лимит можно увеличить.
    if (authDate > now + 300) {
      throw new Error('Некорректная дата авторизации MAX');
    }

    if (now - authDate > MAX_INITDATA_MAX_AGE_SECONDS) {
      throw new Error('Данные запуска MAX устарели. Откройте Mini App заново.');
    }
  }

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(MAX_BOT_TOKEN, 'utf8')
    .digest();

  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(launchParams, 'utf8')
    .digest('hex');

  if (!constantTimeEqualHex(calculatedHash, originalHash)) {
    const error = new Error('Не удалось подтвердить подлинность данных MAX');
    error.code = 'MAX_INITDATA_INVALID';
    throw error;
  }

  return {
    user,
    authDate
  };
}

function requireConfig() {
  const missing = [];

  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseKey) missing.push('SUPABASE_KEY');
  if (!PIAPI_KEY) missing.push('PIAPI_KEY');

  if (missing.length) {
    throw new Error(`Не заданы переменные окружения: ${missing.join(', ')}`);
  }
}

function getUserFromRequest(req) {
  const initData = req.body?.initData;

  if (!initData) {
    const error = new Error('Не переданы initData MAX');
    error.status = 400;
    throw error;
  }

  return validateMaxInitData(initData);
}

async function getUserRecord(maxId, name) {
  const userRes = await axios.get(
    `${supabaseUrl}/rest/v1/users?max_id=eq.${encodeURIComponent(maxId)}&select=*`,
    { headers: dbHeaders }
  );

  let user = userRes.data[0];

  if (!user) {
    const createRes = await axios.post(
      `${supabaseUrl}/rest/v1/users`,
      {
        max_id: maxId,
        name: name || 'Пользователь MAX',
        balance: 0
      },
      { headers: dbHeaders }
    );

    user = createRes.data[0];
  }

  return user;
}

async function getOrdersForUser(maxId) {
  const ordersRes = await axios.get(
    `${supabaseUrl}/rest/v1/orders?max_id=eq.${encodeURIComponent(maxId)}&order=created_at.desc`,
    { headers: dbHeaders }
  );

  return ordersRes.data || [];
}

// Health check — особенно полезен для проверки Render без браузера.
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'max-song-app',
    time: new Date().toISOString(),
    maxBotTokenConfigured: Boolean(MAX_BOT_TOKEN),
    supabaseConfigured: Boolean(supabaseUrl && supabaseKey),
    piapiConfigured: Boolean(PIAPI_KEY)
  });
});

/**
 * Новый профиль endpoint:
 * frontend присылает initData MAX,
 * сервер сам получает user.id и имя.
 */
app.post('/api/user', async (req, res) => {
  try {
    requireConfig();

    const { user: maxUser } = getUserFromRequest(req);

    const maxId = String(maxUser.id);
    const name =
      maxUser.first_name ||
      maxUser.name ||
      'Пользователь MAX';

    const user = await getUserRecord(maxId, name);

    const orders = await getOrdersForUser(maxId);

    res.json({
      success: true,
      user,
      hasActiveGeneration: orders.some(
        order => order.status === 'processing' || order.status === 'preview'
      ),
      max: {
        id: maxId,
        name
      }
    });
  } catch (err) {
    console.error('[USER ERROR]:', err.response?.data || err.message);

    const status = err.status || (err.code === 'MAX_INITDATA_INVALID' ? 401 : 500);

    res.status(status).json({
      success: false,
      message: err.response?.data?.message || err.message
    });
  }
});

app.post('/api/topup', async (req, res) => {
  try {
    requireConfig();

    const { user: maxUser } = getUserFromRequest(req);

    const maxId = String(maxUser.id);
    const numAmount = Number(req.body?.amount);

    if (!Number.isFinite(numAmount) || numAmount < 200) {
      return res.status(400).json({
        success: false,
        message: 'Минимальное пополнение 200 ₽'
      });
    }

    let bonusPercent = 0;
    if (numAmount >= 800) bonusPercent = 20;
    else if (numAmount >= 400) bonusPercent = 10;

    const bonusAmount = Math.floor((numAmount * bonusPercent) / 100);
    const totalCredited = numAmount + bonusAmount;

    const userRes = await axios.get(
      `${supabaseUrl}/rest/v1/users?max_id=eq.${encodeURIComponent(maxId)}&select=balance`,
      { headers: dbHeaders }
    );

    if (!userRes.data[0]) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден.'
      });
    }

    const currentBalance = Number(userRes.data[0]?.balance || 0);
    const newBalance = currentBalance + totalCredited;

    await axios.patch(
      `${supabaseUrl}/rest/v1/users?max_id=eq.${encodeURIComponent(maxId)}`,
      { balance: newBalance },
      { headers: dbHeaders }
    );

    // ВАЖНО:
    // Эта ручка в текущем проекте по-прежнему просто начисляет баланс.
    // Реальную оплату банковской картой/СБП сюда нужно подключать отдельно.
    await axios.post(
      `${supabaseUrl}/rest/v1/transactions`,
      {
        user_max_id: maxId,
        amount: totalCredited,
        type: 'topup'
      },
      { headers: dbHeaders }
    );

    res.json({
      success: true,
      message: `Баланс пополнен на ${totalCredited} ₽! (Бонус: ${bonusAmount} ₽)`,
      newBalance
    });
  } catch (err) {
    console.error('[TOPUP ERROR]:', err.response?.data || err.message);

    const status = err.status || (err.code === 'MAX_INITDATA_INVALID' ? 401 : 500);

    res.status(status).json({
      success: false,
      message:
        err.response?.data?.message ||
        err.response?.data?.details ||
        err.message
    });
  }
});

app.post('/api/generate-song', async (req, res) => {
  try {
    requireConfig();

    const { user: maxUser } = getUserFromRequest(req);

    const maxId = String(maxUser.id);
    const genre = String(req.body?.genre || 'Поп');
    const vocal = String(req.body?.vocal || 'Мужской соло');
    const prompt = String(req.body?.prompt || '').trim();

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Необходимо заполнить описание песни.'
      });
    }

    if (prompt.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Описание песни слишком длинное.'
      });
    }

    const userRes = await axios.get(
      `${supabaseUrl}/rest/v1/users?max_id=eq.${encodeURIComponent(maxId)}&select=balance`,
      { headers: dbHeaders }
    );

    if (!userRes.data[0]) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден.'
      });
    }

    const balance = Number(userRes.data[0]?.balance || 0);

    if (balance < SONG_PRICE) {
      return res.status(400).json({
        success: false,
        message: `Недостаточно средств. Ваш баланс: ${balance} ₽`
      });
    }

    const fullPrompt = `${prompt}. Стиль: ${getSunoStyleTags(genre, vocal)}`;

    const piApiResponse = await axios.post(
      'https://api.piapi.ai/api/v1/task',
      {
        model: 'suno',
        task_type: 'music',
        input: {
          gpt_description_prompt: fullPrompt,
          make_instrumental: false
        }
      },
      {
        headers: {
          'x-api-key': PIAPI_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const taskId =
      piApiResponse.data?.data?.task_id ||
      piApiResponse.data?.task_id;

    if (!taskId) {
      return res.status(500).json({
        success: false,
        message: 'Не удалось получить Task ID от PiAPI.'
      });
    }

    const orderRes = await axios.post(
      `${supabaseUrl}/rest/v1/orders`,
      {
        max_id: maxId,
        genre,
        vocal,
        prompt,
        task_id: taskId,
        status: 'processing'
      },
      { headers: dbHeaders }
    );

    res.json({
      success: true,
      message: 'Генерация запущена!',
      order: orderRes.data[0]
    });
  } catch (err) {
    console.error('[GENERATE ERROR]:', err.response?.data || err.message);

    const status = err.status || (err.code === 'MAX_INITDATA_INVALID' ? 401 : 500);

    res.status(status).json({
      success: false,
      message:
        'Ошибка генерации: ' +
        (err.response?.data?.message || err.message)
    });
  }
});

app.post('/api/unlock-song', async (req, res) => {
  try {
    requireConfig();

    const { user: maxUser } = getUserFromRequest(req);

    const maxId = String(maxUser.id);
    const orderId = req.body?.orderId;
    const audioUrl = String(req.body?.audioUrl || '');
    const title = String(req.body?.title || 'Именная песня');

    if (!orderId || !audioUrl) {
      return res.status(400).json({
        success: false,
        message: 'Не переданы данные заказа.'
      });
    }

    const userRes = await axios.get(
      `${supabaseUrl}/rest/v1/users?max_id=eq.${encodeURIComponent(maxId)}&select=balance`,
      { headers: dbHeaders }
    );

    const currentBalance = Number(userRes.data[0]?.balance || 0);

    if (currentBalance < SONG_PRICE) {
      return res.status(400).json({
        success: false,
        message: 'Недостаточно средств на балансе!'
      });
    }

    // Проверяем, что заказ действительно принадлежит пользователю.
    const orderRes = await axios.get(
      `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&max_id=eq.${encodeURIComponent(maxId)}&select=id,status`,
      { headers: dbHeaders }
    );

    if (!orderRes.data[0]) {
      return res.status(404).json({
        success: false,
        message: 'Заказ не найден.'
      });
    }

    if (orderRes.data[0].status !== 'preview') {
      return res.status(400).json({
        success: false,
        message: 'Этот заказ нельзя разблокировать в текущем статусе.'
      });
    }

    const newBalance = currentBalance - SONG_PRICE;

    await axios.patch(
      `${supabaseUrl}/rest/v1/users?max_id=eq.${encodeURIComponent(maxId)}`,
      { balance: newBalance },
      { headers: dbHeaders }
    );

    await axios.patch(
      `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&max_id=eq.${encodeURIComponent(maxId)}`,
      {
        status: 'completed',
        audio_url: audioUrl,
        title
      },
      { headers: dbHeaders }
    );

    await axios.post(
      `${supabaseUrl}/rest/v1/transactions`,
      {
        user_max_id: maxId,
        amount: -SONG_PRICE,
        type: 'song_unlock'
      },
      { headers: dbHeaders }
    );

    res.json({
      success: true,
      message: 'Песня разблокирована!',
      newBalance
    });
  } catch (err) {
    console.error('[UNLOCK ERROR]:', err.response?.data || err.message);

    const status = err.status || (err.code === 'MAX_INITDATA_INVALID' ? 401 : 500);

    res.status(status).json({
      success: false,
      message:
        err.response?.data?.message ||
        err.response?.data?.details ||
        err.message
    });
  }
});

app.get('/api/download', async (req, res) => {
  const fileUrl = String(req.query?.url || '').trim();
  const fileName = String(req.query?.name || 'song').replace(/[\\/:*?"<>|]/g, '_');

  if (!fileUrl) {
    return res.status(400).send('Не указана ссылка на файл');
  }

  if (!/^https:\/\//i.test(fileUrl)) {
    return res.status(400).send('Разрешены только HTTPS-ссылки');
  }

  try {
    const response = await axios.get(fileUrl, {
      responseType: 'stream',
      timeout: 60000
    });

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}.mp3"`
    );
    res.setHeader('Content-Type', 'audio/mpeg');

    response.data.pipe(res);
  } catch (err) {
    console.error('[DOWNLOAD ERROR]:', err.message);
    res.status(500).json({
      success: false,
      message: 'Ошибка при скачивании файла'
    });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    requireConfig();

    const { user: maxUser } = getUserFromRequest(req);
    const maxId = String(maxUser.id);

    const orders = await getOrdersForUser(maxId);

    for (const order of orders) {
      if (order.status === 'processing' && order.task_id && PIAPI_KEY) {
        try {
          const checkRes = await axios.get(
            `https://api.piapi.ai/api/v1/task/${encodeURIComponent(order.task_id)}`,
            {
              headers: { 'x-api-key': PIAPI_KEY },
              timeout: 30000
            }
          );

          const taskData = checkRes.data?.data || checkRes.data;

          if (taskData) {
            const taskStatus = String(taskData.status || '').toLowerCase();

            if (taskStatus === 'completed' || taskStatus === 'success') {
              const output = taskData.output || {};

              const clips =
                output.clips ||
                output.data ||
                (Array.isArray(output) ? output : []);

              const getUrl = item =>
                item?.audio_url ||
                item?.url ||
                item?.audio ||
                item?.stream_url ||
                '';

              const getTitle = (item, defaultTitle) =>
                item?.title || defaultTitle;

              const url1 = getUrl(clips[0]) || getUrl(output) || '';
              const url2 = getUrl(clips[1]) || '';

              const title1 = getTitle(
                clips[0],
                `Вариант 1 (${order.genre})`
              );

              const title2 = getTitle(
                clips[1],
                `Вариант 2 (${order.genre})`
              );

              await axios.patch(
                `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(order.id)}&max_id=eq.${encodeURIComponent(maxId)}`,
                {
                  status: 'preview',
                  audio_url: url1,
                  audio_url_2: url2,
                  title: title1,
                  title_2: title2
                },
                { headers: dbHeaders }
              );

              order.status = 'preview';
              order.audio_url = url1;
              order.audio_url_2 = url2;
              order.title = title1;
              order.title_2 = title2;
            } else if (taskStatus === 'failed') {
              await axios.patch(
                `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(order.id)}&max_id=eq.${encodeURIComponent(maxId)}`,
                { status: 'failed' },
                { headers: dbHeaders }
              );

              order.status = 'failed';
            }
          }
        } catch (e) {
          console.error(
            `[TASK CHECK ERROR order=${order.id}]:`,
            e.response?.data || e.message
          );
        }
      }
    }

    res.json({
      success: true,
      orders
    });
  } catch (err) {
    console.error('[ORDERS ERROR]:', err.response?.data || err.message);

    const status = err.status || (err.code === 'MAX_INITDATA_INVALID' ? 401 : 500);

    res.status(status).json({
      success: false,
      message: err.response?.data?.message || err.message
    });
  }
});

// Явно объявляем статические файлы после API.
app.use(express.static('public', {
  extensions: ['html'],
  index: 'index.html'
}));

// Главная страница.
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// Все неизвестные GET-маршруты отдаём на frontend,
// чтобы WebView не получал HTML-404, если понадобится client-side route.
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: 'API endpoint not found'
    });
  }

  res.sendFile('index.html', { root: 'public' });
});

const PORT = Number(process.env.PORT) || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Supabase configured: ${Boolean(supabaseUrl && supabaseKey)}`);
  console.log(`PiAPI configured: ${Boolean(PIAPI_KEY)}`);
  console.log(`MAX Bot Token configured: ${Boolean(MAX_BOT_TOKEN)}`);
});
