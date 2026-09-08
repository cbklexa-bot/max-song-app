const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const originalListen = express.application.listen;
const root = fs.existsSync('/data') ? '/data' : '/tmp';
const cacheDir = path.join(root, 'max-song-audio-cache');
const host = 's.bmnmny.cn';
fs.mkdirSync(cacheDir, { recursive: true });
console.log('[HARD AUDIO] loaded; cache:', cacheDir);

function allowed(raw) {
  const u = new URL(String(raw || '').trim());
  if (u.protocol !== 'https:' || u.hostname.toLowerCase() !== host) throw new Error('Audio host is not allowed');
  return u.toString();
}
function fileFor(url) {
  return path.join(cacheDir, crypto.createHash('sha256').update(url).digest('hex') + '.m4a');
}
async function download(url) {
  const file = fileFor(url);
  if (fs.existsSync(file)) return file;
  const part = file + '.part';
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      try { fs.unlinkSync(part); } catch (_) {}
      console.log('[HARD AUDIO] upstream', attempt, url);
      const r = await axios.get(url, {
        responseType: 'stream',
        timeout: 180000,
        maxRedirects: 5,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        headers: { Accept: '*/*', 'User-Agent': 'Mozilla/5.0', 'Accept-Encoding': 'identity' },
        validateStatus: s => s >= 200 && s < 400
      });
      await new Promise((resolve, reject) => {
        const out = fs.createWriteStream(part);
        const fail = e => { try { out.destroy(); } catch (_) {} try { r.data.destroy(); } catch (_) {} try { fs.unlinkSync(part); } catch (_) {} reject(e); };
        r.data.once('error', fail);
        out.once('error', fail);
        out.once('finish', () => { try { fs.renameSync(part, file); resolve(); } catch (e) { fail(e); } });
        r.data.pipe(out);
      });
      console.log('[HARD AUDIO] cached', url);
      return file;
    } catch (e) {
      last = e;
      console.error('[HARD AUDIO] failed', attempt, e.code || e.message);
      if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 1500));
    }
  }
  throw last || new Error('Audio download failed');
}

async function sendFile(req, res, file, attachment) {
  const size = (await fs.promises.stat(file)).size;
  const range = String(req.headers.range || '').trim();
  let start = 0, end = size - 1;
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/i.exec(range);
    if (!m) return res.status(416).setHeader('Content-Range', `bytes */${size}`).end();
    if (m[1] === '') {
      const suffix = Number(m[2]);
      if (!Number.isFinite(suffix) || suffix <= 0) return res.status(416).setHeader('Content-Range', `bytes */${size}`).end();
      start = Math.max(0, size - suffix);
    } else {
      start = Number(m[1]);
      end = m[2] === '' ? size - 1 : Number(m[2]);
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= size || end < start) return res.status(416).setHeader('Content-Range', `bytes */${size}`).end();
    end = Math.min(end, size - 1);
    res.status(206).setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
  } else res.status(200);
  res.setHeader('Content-Type', 'audio/mp4');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Length', String(end - start + 1));
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  if (attachment) res.setHeader('Content-Disposition', 'attachment; filename="song.m4a"');
  fs.createReadStream(file, { start, end }).pipe(res);
}

express.application.listen = function hardAudioListen(...args) {
  const router = this._router;
  let removed = 0;
  if (router?.stack) {
    const before = router.stack.length;
    router.stack = router.stack.filter(layer => {
      const p = layer?.route?.path;
      return p !== '/api/audio' && p !== '/api/download';
    });
    removed = before - router.stack.length;
  }
  console.log('[HARD AUDIO] removed legacy routes:', removed);
  this.route('/api/audio').get(async (req, res) => {
    try {
      const url = allowed(req.query.url);
      const file = await download(url);
      await sendFile(req, res, file, false);
    } catch (e) {
      console.error('[HARD AUDIO] /api/audio', e.code || e.message);
      if (!res.headersSent) res.status(502).send('Не удалось загрузить аудиофайл'); else if (!res.writableEnded) res.end();
    }
  });
  this.route('/api/download').get(async (req, res) => {
    try {
      const url = allowed(req.query.url);
      const file = await download(url);
      await sendFile(req, res, file, true);
    } catch (e) {
      console.error('[HARD AUDIO] /api/download', e.code || e.message);
      if (!res.headersSent) res.status(500).send('Не удалось скачать файл'); else if (!res.writableEnded) res.end();
    }
  });
  console.log('[HARD AUDIO] routes installed');
  return originalListen.apply(this, args);
};
