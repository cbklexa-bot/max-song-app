const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
const supabaseKey = (process.env.SUPABASE_KEY || '').trim();
const PIAPI_KEY = (process.env.PIAPI_KEY || '').trim();

console.log('DEBUG SUPABASE_URL:', `"${supabaseUrl}"`);

const dbHeaders = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
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
    'Хор': 'choir, chorus, multiple voices'
  };

  return `${genreMap[genre] || 'pop'}, ${vocalMap[vocal] || 'male vocal'}, russian song`;
}

app.get('/api/user/:maxId', async (req, res) => {
  const { maxId } = req.params;
  const rawName = req.query.name || 'Пользователь MAX';
  const name = decodeURIComponent(rawName);

  if (!maxId || maxId === 'undefined' || maxId === 'null') {
    return res.status(400).json({ success: false, message: 'Некорректный ID пользователя' });
  }

  try {
    const userRes = await axios.get(`${supabaseUrl}/rest/v1/users?max_id=eq.${encodeURIComponent(maxId)}&select=*`, { headers: dbHeaders });
    let user = userRes.data[0];

    if (!user) {
      const createRes = await axios.post(`${supabaseUrl}/rest/v1/users`, { max_id: maxId, name: name, balance: 0 }, { headers: dbHeaders });
      user = createRes.data[0];
    }

    const ordersRes = await axios.get(`${supabaseUrl}/rest/v1/orders?max_id=eq.${encodeURIComponent(maxId)}&status=in.(processing,preview)&select=id,status`, { headers: dbHeaders });
    
    res.json({ 
      success: true, 
      user, 
      hasActiveGeneration: ordersRes.data && ordersRes.data.length > 0 
    });
  } catch (err) {
    console.error('[DB ERROR]:', err.response?.data || err.message);
    res.status(500).json({ success: false, message: err.response?.data?.message || err.message });
  }
});

app.post('/api/topup', async (req, res) => {
  const { maxId, amount } = req.body;
  const numAmount = Number(amount);

  if (!maxId || maxId === 'undefined' || maxId === 'null') {
    return res.status(400).json({ success: false, message: 'Не передан ID пользователя' });
  }

  if (!numAmount || numAmount < 200) {
    return res.status(400).json({ success: false, message: 'Минимальное пополнение 200 ₽' });
  }

  let bonusPercent = 0;
  if (numAmount >= 800) bonusPercent = 20;
  else if (numAmount >= 400) bonusPercent = 10;

  const bonusAmount = Math.floor((numAmount * bonusPercent) / 100);
  const totalCredited = numAmount + bonusAmount;

  try {
    const userRes = await axios.get(`${supabaseUrl}/rest/v1/users?max_id=eq.${encodeURIComponent(maxId)}&select=balance`, { headers: dbHeaders });
    const currentBalance = Number(userRes.data[0]?.balance || 0);
    const newBalance = currentBalance + totalCredited;

    await axios.patch(`${supabaseUrl}/rest/v1/users?max_id=eq.${encodeURIComponent(maxId)}`, { balance: newBalance }, { headers: dbHeaders });
    
    // Используем правильное имя колонки user_max_id для таблицы transactions
    await axios.post(`${supabaseUrl}/rest/v1/transactions`, { user_max_id: maxId, amount: totalCredited, type: 'topup' }, { headers: dbHeaders });

    res.json({
      success: true,
      message: `Баланс пополнен на ${totalCredited} ₽! (Бонус: ${bonusAmount} ₽)`,
      newBalance
    });
  } catch (err) {
    console.error('[TOPUP ERROR]:', err.response?.data || err.message);
    res.status(500).json({ success: false, message: err.response?.data?.message || err.response?.data?.details || err.message });
  }
});

app.post('/api/generate-song', async (req, res) => {
  const { maxId, genre, vocal, prompt } = req.body;
  const SONG_PRICE = 200;

  if (!maxId || maxId === 'undefined') {
    return res.status(400).json({ success: false, message: 'Не передан ID пользователя' });
  }

  try {
    const userRes = await axios.get(`${supabaseUrl}/rest/v1/users?max_id=eq.${encodeURIComponent(maxId)}&select=balance`, { headers: dbHeaders });
    const balance = Number(userRes.data[0]?.balance || 0);

    if (balance < SONG_PRICE) {
      return res.status(400).json({ success: false, message: `Недостаточно средств. Ваш баланс: ${balance} ₽` });
    }

    const fullPrompt = `${prompt}. Стиль: ${getSunoStyleTags(genre, vocal)}`;

    const piApiResponse = await axios.post('https://api.piapi.ai/api/v1/task', {
      model: 'suno',
      task_type: 'music',
      input: { gpt_description_prompt: fullPrompt, make_instrumental: false }
    }, {
      headers: { 'x-api-key': PIAPI_KEY, 'Content-Type': 'application/json' }
    });

    const taskId = piApiResponse.data?.data?.task_id || piApiResponse.data?.task_id;
    if (!taskId) return res.status(500).json({ success: false, message: 'Не удалось получить Task ID от PiAPI.' });

    const orderRes = await axios.post(`${supabaseUrl}/rest/v1/orders`, {
      max_id: maxId, genre, vocal, prompt, task_id: taskId, status: 'processing'
    }, { headers: dbHeaders });

    res.json({ success: true, message: 'Генерация запущена!', order: orderRes.data[0] });
  } catch (err) {
    console.error('[GENERATE ERROR]:', err.response?.data || err.message);
    const errMsg = err.response?.data?.message || err.message;
    res.status(500).json({ success: false, message: 'Ошибка генерации: ' + errMsg });
  }
});

app.post('/api/unlock-song', async (req, res) => {
  const { maxId, orderId, audioUrl, title } = req.body;
  const SONG_PRICE = 200;

  if (!maxId || maxId === 'undefined') {
    return res.status(400).json({ success: false, message: 'Не передан ID пользователя' });
  }

  try {
    const userRes = await axios.get(`${supabaseUrl}/rest/v1/users?max_id=eq.${encodeURIComponent(maxId)}&select=balance`, { headers: dbHeaders });
    const currentBalance = Number(userRes.data[0]?.balance || 0);

    if (currentBalance < SONG_PRICE) {
      return res.status(400).json({ success: false, message: 'Недостаточно средств на балансе!' });
    }

    const newBalance = currentBalance - SONG_PRICE;

    await axios.patch(`${supabaseUrl}/rest/v1/users?max_id=eq.${encodeURIComponent(maxId)}`, { balance: newBalance }, { headers: dbHeaders });
    await axios.patch(`${supabaseUrl}/rest/v1/orders?id=eq.${orderId}`, {
      status: 'completed', audio_url: audioUrl, title: title || 'Именная песня'
    }, { headers: dbHeaders });
    
    // Используем правильное имя колонки user_max_id для таблицы transactions
    await axios.post(`${supabaseUrl}/rest/v1/transactions`, { user_max_id: maxId, amount: -SONG_PRICE, type: 'song_unlock' }, { headers: dbHeaders });

    res.json({ success: true, message: 'Песня разблокирована!', newBalance });
  } catch (err) {
    console.error('[UNLOCK ERROR]:', err.response?.data || err.message);
    res.status(500).json({ success: false, message: err.response?.data?.message || err.response?.data?.details || err.message });
  }
});

app.get('/api/orders/:maxId', async (req, res) => {
  const { maxId } = req.params;

  if (!maxId || maxId === 'undefined') {
    return res.status(400).json({ success: false, message: 'Не передан ID пользователя' });
  }

  try {
    const ordersRes = await axios.get(`${supabaseUrl}/rest/v1/orders?max_id=eq.${encodeURIComponent(maxId)}&order=created_at.desc`, { headers: dbHeaders });
    const orders = ordersRes.data || [];

    for (let order of orders) {
      if (order.status === 'processing' && order.task_id && PIAPI_KEY) {
        try {
          const checkRes = await axios.get(`https://api.piapi.ai/api/v1/task/${order.task_id}`, {
            headers: { 'x-api-key': PIAPI_KEY }
          });

          const taskData = checkRes.data?.data || checkRes.data;
          if (taskData) {
            const taskStatus = (taskData.status || '').toLowerCase();
            if (taskStatus === 'completed' || taskStatus === 'success') {
              const output = taskData.output || {};
              const clips = output.clips || output.data || (Array.isArray(output) ? output : []);

              const getUrl = (item) => item?.audio_url || item?.url || item?.audio || item?.stream_url || '';
              const getTitle = (item, defaultTitle) => item?.title || defaultTitle;

              const url1 = getUrl(clips[0]) || getUrl(output) || '';
              const url2 = getUrl(clips[1]) || '';
              const title1 = getTitle(clips[0], `Вариант 1 (${order.genre})`);
              const title2 = getTitle(clips[1], `Вариант 2 (${order.genre})`);

              await axios.patch(`${supabaseUrl}/rest/v1/orders?id=eq.${order.id}`, {
                status: 'preview', 
                audio_url: url1, 
                audio_url_2: url2, 
                title: title1, 
                title_2: title2
              }, { headers: dbHeaders });

              order.status = 'preview';
              order.audio_url = url1;
              order.audio_url_2 = url2;
              order.title = title1;
              order.title_2 = title2;
            } else if (taskStatus === 'failed') {
              await axios.patch(`${supabaseUrl}/rest/v1/orders?id=eq.${order.id}`, { status: 'failed' }, { headers: dbHeaders });
              order.status = 'failed';
            }
          }
        } catch (e) {
          console.error('[TASK CHECK ERROR]:', e.message);
        }
      }
    }

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.response?.data?.message || err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
