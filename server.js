const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const cors = require('cors');

const app = express();

app.disable('x-powered-by');

app.use(
  cors({
    origin: [
      'https://cbklexa-bot.github.io',
      'https://max-song-app.onrender.com'
    ],
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-MAX-Init-Data'],
    credentials: false
  })
);

app.use(
  express.json({
    limit: '1mb'
  })
);

app.use((req, res, next) => {
  console.log(
    '[REQUEST]',
    new Date().toISOString(),
    req.method,
    req.originalUrl,
    'Origin:',
    req.headers.origin || '-',
    'UA:',
    req.headers['user-agent'] || '-'
  );

  next();
});

const PORT = process.env.PORT || 10000;

const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const PIAPI_KEY = process.env.PIAPI_KEY || '';

const SONG_PRICE = 200;

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

function createMaxSecretKey() {
  return crypto
    .createHmac('sha256', 'WebAppData')
    .update(MAX_BOT_TOKEN)
    .digest();
}

function validateMaxInitData(initData) {
  if (!MAX_BOT_TOKEN) {
    throw new Error('MAX_BOT_TOKEN is not configured');
  }

  if (!initData || typeof initData !== 'string') {
    throw new Error('MAX initData is missing');
  }

  const params = {};

  initData.split('&').forEach((part) => {
    const separatorIndex = part.indexOf('=');

    if (separatorIndex === -1) {
      return;
    }

    const key = part.slice(0, separatorIndex);
    const value = part.slice(separatorIndex + 1);

    params[key] = value;
  });

  const receivedHash = params.hash;

  if (!receivedHash) {
    throw new Error('MAX initData hash is missing');
  }

  const dataCheckString = Object.keys(params)
    .filter((key) => key !== 'hash')
    .sort()
    .map((key) => key + '=' + params[key])
    .join('\n');

  const secretKey = createMaxSecretKey();

  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  const receivedBuffer = Buffer.from(receivedHash, 'hex');
  const calculatedBuffer = Buffer.from(calculatedHash, 'hex');

  if (
    receivedBuffer.length !== calculatedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, calculatedBuffer)
  ) {
    throw new Error('Invalid MAX initData signature');
  }

  if (params.auth_date) {
    const authDate = Number(params.auth_date);

    if (!Number.isNaN(authDate)) {
      const ageSeconds = Math.floor(Date.now() / 1000) - authDate;

      if (ageSeconds > 3600) {
        throw new Error('MAX initData expired');
      }
    }
  }

  let user = null;

  if (params.user) {
    try {
      user = JSON.parse(decodeURIComponent(params.user));
    } catch (error) {
      try {
        user = JSON.parse(params.user);
      } catch (parseError) {
        user = null;
      }
    }
  }

  return {
    params,
    user
  };
}

function requireMaxUser(req) {
  const initData = req.headers['x-max-init-data'];

  if (!initData) {
    throw new Error('X-MAX-Init-Data header is missing');
  }

  const result = validateMaxInitData(initData);

  if (!result.user || !result.user.id) {
    throw new Error('MAX user data is missing');
  }

  return result;
}

async function supabaseGet(table, query) {
  const url = SUPABASE_URL + '/rest/v1/' + table;

  const response = await axios.get(url, {
    headers: dbHeaders,
    params: query
  });

  return response.data;
}

async function supabasePost(table, body) {
  const url = SUPABASE_URL + '/rest/v1/' + table;

  const response = await axios.post(url, body, {
    headers: dbHeaders
  });

  return response.data;
}

async function supabasePatch(table, query, body) {
  const url = SUPABASE_URL + '/rest/v1/' + table;

  const response = await axios.patch(url, body, {
    headers: dbHeaders,
    params: query
  });

  return response.data;
}

async function getUserByMaxId(maxUserId) {
  const rows = await supabaseGet('users', {
    max_user_id: 'eq.' + String(maxUserId),
    select: '*',
    limit: 1
  });

  return rows.length ? rows[0] : null;
}

async function createUser(maxUser) {
  const firstName = maxUser.first_name || '';
  const lastName = maxUser.last_name || '';
  const username = maxUser.username || '';

  const fullName =
    (firstName + ' ' + lastName).trim() ||
    username ||
    'MAX пользователь';

  const body = {
    max_user_id: String(maxUser.id),
    username: username || null,
    first_name: firstName || null,
    last_name: lastName || null,
    name: fullName,
    balance: 0
  };

  const rows = await supabasePost('users', body);

  return rows[0];
}

async function getOrCreateUser(maxUser) {
  let user = await getUserByMaxId(maxUser.id);

  if (user) {
    return user;
  }

  try {
    user = await createUser(maxUser);
    return user;
  } catch (error) {
    if (
      error.response &&
      error.response.status === 409
    ) {
      user = await getUserByMaxId(maxUser.id);

      if (user) {
        return user;
      }
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
  const url = 'https://api.piapi.ai/api/v1/task';

  const body = {
    model: 'suno',
    task_type: 'music',
    input: {
      gpt_description_prompt: prompt,
      make_instrumental: false
    }
  };

  const response = await axios.post(url, body, {
    headers: getPiApiHeaders(),
    timeout: 60000
  });

  return response.data;
}

async function getPiApiTask(taskId) {
  const url =
    'https://api.piapi.ai/api/v1/task/' +
    encodeURIComponent(taskId);

  const response = await axios.get(url, {
    headers: getPiApiHeaders(),
    timeout: 60000
  });

  return response.data;
}

function extractPiApiSongs(taskResponse) {
  const result = taskResponse && taskResponse.data
    ? taskResponse.data
    : taskResponse;

  const output = result && result.output
    ? result.output
    : null;

  if (!output) {
    return [];
  }

  let songs = [];

  if (Array.isArray(output)) {
    songs = output;
  } else if (Array.isArray(output.songs)) {
    songs = output.songs;
  } else if (Array.isArray(output.data)) {
    songs = output.data;
  } else if (output.audio_url || output.audioUrl || output.url) {
    songs = [output];
  }

  return songs
    .map((song) => {
      const audioUrl =
        song.audio_url ||
        song.audioUrl ||
        song.url ||
        song.source_audio_url ||
        null;

      const title =
        song.title ||
        song.name ||
        song.prompt ||
        'Ваша песня';

      return {
        audioUrl,
        title
      };
    })
    .filter((song) => Boolean(song.audioUrl));
}

function getTaskStatus(taskResponse) {
  const result = taskResponse && taskResponse.data
    ? taskResponse.data
    : taskResponse;

  return (
    result.status ||
    result.task_status ||
    (result.data && result.data.status) ||
    'unknown'
  );
}

/* =========================================
   HEALTH
========================================= */

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'max-song-app',
    config: checkConfig(),
    time: new Date().toISOString()
  });
});

/* =========================================
   MAX PROBE
========================================= */

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

/* =========================================
   GET USER
========================================= */

app.get('/api/user', async (req, res) => {
  try {
    const auth = requireMaxUser(req);

    const user = await getOrCreateUser(auth.user);

    const orders = await supabaseGet('orders', {
      user_id: 'eq.' + String(user.id),
      select: '*',
      order: 'created_at.desc',
      limit: 20
    });

    res.json({
      ok: true,
      user,
      orders
    });
  } catch (error) {
    console.error(
      '[GET /api/user]',
      error.response
        ? error.response.data
        : error.message
    );

    res.status(401).json({
      ok: false,
      error: error.message || 'Authorization error'
    });
  }
});

/* =========================================
   TOP UP — TEST MODE
========================================= */

app.post('/api/topup', async (req, res) => {
  try {
    const auth = requireMaxUser(req);

    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        ok: false,
        error: 'Некорректная сумма'
      });
    }

    const user = await getOrCreateUser(auth.user);

    let bonus = 0;

    if (amount >= 800) {
      bonus = amount * 0.2;
    } else if (amount >= 400) {
      bonus = amount * 0.1;
    }

    const totalCredit = amount + bonus;

    const newBalance =
      Number(user.balance || 0) + totalCredit;

    const updatedRows = await supabasePatch(
      'users',
      {
        id: 'eq.' + String(user.id)
      },
      {
        balance: newBalance
      }
    );

    await supabasePost('transactions', {
      user_id: user.id,
      type: 'topup_test',
      amount: totalCredit,
      description:
        'Тестовое пополнение без реальной оплаты'
    });

    res.json({
      ok: true,
      testMode: true,
      added: totalCredit,
      bonus,
      balance:
        updatedRows[0] && updatedRows[0].balance !== undefined
          ? updatedRows[0].balance
          : newBalance
    });
  } catch (error) {
    console.error(
      '[POST /api/topup]',
      error.response
        ? error.response.data
        : error.message
    );

    res.status(400).json({
      ok: false,
      error: error.message || 'Ошибка пополнения'
    });
  }
});

/* =========================================
   GENERATE SONG — FREE DEMO
========================================= */

app.post('/api/generate-song', async (req, res) => {
  try {
    const auth = requireMaxUser(req);

    const user = await getOrCreateUser(auth.user);

    const existingOrders = await supabaseGet('orders', {
      user_id: 'eq.' + String(user.id),
      status: 'in.(processing,preview,purchasing)',
      select: 'id,status,created_at',
      order: 'created_at.desc',
      limit: 1
    });

    if (existingOrders.length) {
      return res.status(409).json({
        ok: false,
        error:
          'У вас уже есть песня, ожидающая покупки. Сначала выберите вариант и оплатите её.',
        order: existingOrders[0]
      });
    }

    const currentBalance = Number(user.balance || 0);

    if (currentBalance < SONG_PRICE) {
      return res.status(400).json({
        ok: false,
        error:
          'Для генерации нужен баланс минимум 200 ₽. Пополните баланс и попробуйте снова.'
      });
    }

    const genre = String(req.body.genre || '').trim();
    const vocal = String(req.body.vocal || '').trim();
    const prompt = String(req.body.prompt || '').trim();

    if (!prompt) {
      return res.status(400).json({
        ok: false,
        error: 'Введите описание песни'
      });
    }

    const fullPrompt =
      [
        genre ? 'Жанр: ' + genre : '',
        vocal ? 'Вокал: ' + vocal : '',
        'Описание: ' + prompt
      ]
        .filter(Boolean)
        .join('. ');

    const piApiResult = await createPiApiTask(fullPrompt);

    const piData =
      piApiResult && piApiResult.data
        ? piApiResult.data
        : piApiResult;

    const taskId =
      piData.id ||
      piData.task_id ||
      piApiResult.id ||
      piApiResult.task_id;

    if (!taskId) {
      console.error(
        '[PIAPI CREATE TASK]',
        JSON.stringify(piApiResult)
      );

      return res.status(502).json({
        ok: false,
        error: 'PiAPI не вернул task_id'
      });
    }

    const orderRows = await supabasePost('orders', {
      user_id: user.id,
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
    console.error(
      '[POST /api/generate-song]',
      error.response
        ? error.response.data
        : error.message
    );

    res.status(400).json({
      ok: false,
      error:
        error.message ||
        'Не удалось запустить генерацию'
    });
  }
});

/* =========================================
   ORDERS
========================================= */

app.get('/api/orders', async (req, res) => {
  try {
    const auth = requireMaxUser(req);

    const user = await getOrCreateUser(auth.user);

    let orders = await supabaseGet('orders', {
      user_id: 'eq.' + String(user.id),
      select: '*',
      order: 'created_at.desc',
      limit: 50
    });

    for (const order of orders) {
      if (
        order.status !== 'processing' ||
        !order.task_id
      ) {
        continue;
      }

      try {
        const taskResponse =
          await getPiApiTask(order.task_id);

        const status =
          String(getTaskStatus(taskResponse)).toLowerCase();

        const songs =
          extractPiApiSongs(taskResponse);

        if (
          songs.length > 0 ||
          status === 'completed' ||
          status === 'success' ||
          status === 'succeeded' ||
          status === 'done'
        ) {
          const song1 = songs[0] || {};
          const song2 = songs[1] || {};

          const patch = {
            status:
              songs.length > 0
                ? 'preview'
                : 'processing'
          };

          if (song1.audioUrl) {
            patch.audio_url = song1.audioUrl;
          }

          if (song1.title) {
            patch.title = song1.title;
          }

          if (song2.audioUrl) {
            patch.audio_url_2 = song2.audioUrl;
          }

          if (song2.title) {
            patch.title_2 = song2.title;
          }

          const updatedRows =
            await supabasePatch(
              'orders',
              {
                id: 'eq.' + String(order.id),
                user_id: 'eq.' + String(user.id)
              },
              patch
            );

          if (updatedRows[0]) {
            Object.assign(
              order,
              updatedRows[0]
            );
          }
        } else if (
          status === 'failed' ||
          status === 'error' ||
          status === 'cancelled' ||
          status === 'canceled'
        ) {
          const updatedRows =
            await supabasePatch(
              'orders',
              {
                id: 'eq.' + String(order.id),
                user_id: 'eq.' + String(user.id)
              },
              {
                status: 'failed'
              }
            );

          if (updatedRows[0]) {
            Object.assign(
              order,
              updatedRows[0]
            );
          }
        }
      } catch (taskError) {
        console.error(
          '[PIAPI TASK CHECK]',
          order.task_id,
          taskError.response
            ? taskError.response.data
            : taskError.message
        );
      }
    }

    res.json({
      ok: true,
      orders
    });
  } catch (error) {
    console.error(
      '[GET /api/orders]',
      error.response
        ? error.response.data
        : error.message
    );

    res.status(400).json({
      ok: false,
      error:
        error.message ||
        'Не удалось получить заказы'
    });
  }
});

/* =========================================
   UNLOCK SONG
========================================= */

app.post('/api/unlock-song', async (req, res) => {
  try {
    const auth = requireMaxUser(req);

    const user = await getOrCreateUser(auth.user);

    const orderId = req.body.orderId;
    const selectedVariant =
      Number(req.body.variant || 1);

    if (!orderId) {
      return res.status(400).json({
        ok: false,
        error: 'orderId не указан'
      });
    }

    if (
      selectedVariant !== 1 &&
      selectedVariant !== 2
    ) {
      return res.status(400).json({
        ok: false,
        error: 'Некорректный вариант песни'
      });
    }

    const rows = await supabaseGet('orders', {
      id: 'eq.' + String(orderId),
      user_id: 'eq.' + String(user.id),
      select: '*',
      limit: 1
    });

    if (!rows.length) {
      return res.status(404).json({
        ok: false,
        error: 'Заказ не найден'
      });
    }

    const order = rows[0];

    if (order.status !== 'preview') {
      return res.status(400).json({
        ok: false,
        error:
          'Этот заказ пока нельзя разблокировать'
      });
    }

    let selectedAudioUrl = null;
    let selectedTitle = null;

    if (selectedVariant === 1) {
      selectedAudioUrl = order.audio_url;
      selectedTitle = order.title;
    } else {
      selectedAudioUrl = order.audio_url_2;
      selectedTitle = order.title_2;
    }

    if (!selectedAudioUrl) {
      return res.status(400).json({
        ok: false,
        error: 'Выбранный вариант песни отсутствует'
      });
    }

    const balance = Number(user.balance || 0);

    if (balance < SONG_PRICE) {
      return res.status(400).json({
        ok: false,
        error:
          'Недостаточно средств для покупки'
      });
    }

    const reserveRows = await supabasePatch(
      'orders',
      {
        id: 'eq.' + String(order.id),
        user_id: 'eq.' + String(user.id),
        status: 'eq.preview'
      },
      {
        status: 'purchasing'
      }
    );

    if (!reserveRows.length) {
      return res.status(409).json({
        ok: false,
        error:
          'Заказ уже обрабатывается или был куплен'
      });
    }

    const newBalance =
      balance - SONG_PRICE;

    let updatedUserRows;

    try {
      updatedUserRows = await supabasePatch(
        'users',
        {
          id: 'eq.' + String(user.id)
        },
        {
          balance: newBalance
        }
      );
    } catch (balanceError) {
      await supabasePatch(
        'orders',
        {
          id: 'eq.' + String(order.id),
          user_id: 'eq.' + String(user.id),
          status: 'eq.purchasing'
        },
        {
          status: 'preview'
        }
      );

      throw balanceError;
    }

    const updatedOrderRows =
      await supabasePatch(
        'orders',
        {
          id: 'eq.' + String(order.id),
          user_id: 'eq.' + String(user.id),
          status: 'eq.purchasing'
        },
        {
          status: 'completed',
          selected_variant: selectedVariant,
          audio_url_selected: selectedAudioUrl,
          title_selected:
            selectedTitle || 'Ваша песня'
        }
      );

    if (!updatedOrderRows.length) {
      await supabasePatch(
        'users',
        {
          id: 'eq.' + String(user.id)
        },
        {
          balance: balance
        }
      );

      await supabasePatch(
        'orders',
        {
          id: 'eq.' + String(order.id),
          user_id: 'eq.' + String(user.id),
          status: 'eq.purchasing'
        },
        {
          status: 'preview'
        }
      );

      return res.status(409).json({
        ok: false,
        error:
          'Не удалось завершить покупку. Средства не списаны.'
      });
    }

    try {
      await supabasePost('transactions', {
        user_id: user.id,
        type: 'song_purchase',
        amount: -SONG_PRICE,
        description:
          'Покупка полной версии песни',
        order_id: order.id
      });
    } catch (transactionError) {
      console.error(
        '[TRANSACTION LOG]',
        transactionError.response
          ? transactionError.response.data
          : transactionError.message
      );
    }

    res.json({
      ok: true,
      user:
        updatedUserRows[0] || {
          ...user,
          balance: newBalance
        },
      order: updatedOrderRows[0],
      audioUrl: selectedAudioUrl,
      title:
        selectedTitle || 'Ваша песня'
    });
  } catch (error) {
    console.error(
      '[POST /api/unlock-song]',
      error.response
        ? error.response.data
        : error.message
    );

    res.status(400).json({
      ok: false,
      error:
        error.message ||
        'Не удалось купить песню'
    });
  }
});

/* =========================================
   DOWNLOAD PROXY
========================================= */

app.get('/api/download', async (req, res) => {
  try {
    const url = String(req.query.url || '').trim();

    if (!url) {
      return res.status(400).send('URL is required');
    }

    if (!url.startsWith('https://')) {
      return res.status(400).send('Only HTTPS URLs are allowed');
    }

    const response = await axios.get(url, {
      responseType: 'stream',
      timeout: 60000
    });

    const contentType =
      response.headers['content-type'] ||
      'audio/mpeg';

    res.setHeader(
      'Content-Type',
      contentType
    );

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="song.mp3"'
    );

    response.data.pipe(res);
  } catch (error) {
    console.error(
      '[GET /api/download]',
      error.response
        ? error.response.data
        : error.message
    );

    res.status(500).send(
      'Не удалось скачать файл'
    );
  }
});

/* =========================================
   STATIC FRONTEND
========================================= */

app.use(
  express.static(
    path.join(__dirname, 'public')
  )
);

app.get('*', (req, res) => {
  res.sendFile(
    path.join(__dirname, 'public', 'index.html')
  );
});

/* =========================================
   ERROR HANDLER
========================================= */

app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    ok: false,
    error: 'Внутренняя ошибка сервера'
  });
});

app.listen(PORT, () => {
  console.log(
    'MAX Song App server started on port ' + PORT
  );

  console.log(
    'Config:',
    checkConfig()
  );
});
