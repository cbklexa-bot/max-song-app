const express = require('express');
const axios = require('axios');

const originalListen = express.application.listen;
const AUDIO_HOST = 's.bmnmny.cn';
const ROUTE_FLAG = Symbol('maxAudioMimeFixInstalled');

console.log('[AUDIO MIME FIX] loaded');

function allowedUrl(raw) {
  const url = new URL(String(raw || '').trim());
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== AUDIO_HOST) {
    throw new Error('Audio host is not allowed');
  }
  return url.toString();
}

function installAfterServerStarts(app) {
  if (app[ROUTE_FLAG]) return;

  const replaceRoutes = () => {
    if (!app._router?.stack) return;

    app._router.stack = app._router.stack.filter((layer) => {
      const routePath = layer?.route?.path;
      return routePath !== '/api/audio';
    });

    app.route('/api/audio').get(async (req, res) => {
      try {
        console.log('[AUDIO MIME FIX] raw request', {
          url: req.url || '',
          originalUrl: req.originalUrl || '',
          queryUrl: req.query?.url || '',
          range: req.headers.range || ''
        });

        const url = allowedUrl(req.query?.url);
        const range = String(req.headers.range || '').trim();
        const headers = {
          Accept: '*/*',
          'Accept-Encoding': 'identity',
          'User-Agent': 'Mozilla/5.0'
        };
        if (range) headers.Range = range;

        console.log('[AUDIO MIME FIX] upstream request', range || 'full', url);

        const upstream = await axios.get(url, {
          responseType: 'stream',
          timeout: 60000,
          maxRedirects: 5,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          headers,
          validateStatus: (status) => status >= 200 && status < 400
        });

        const upstreamHeaders = upstream.headers || {};
        const contentType = String(upstreamHeaders['content-type'] || '').split(';')[0].trim();
        const fallbackType = /\.mp3(?:$|\?)/i.test(url)
          ? 'audio/mpeg'
          : 'audio/mp4';

        console.log('[AUDIO MIME FIX] upstream response', {
          status: upstream.status,
          contentType,
          contentLength: upstreamHeaders['content-length'] || '',
          acceptRanges: upstreamHeaders['accept-ranges'] || '',
          contentRange: upstreamHeaders['content-range'] || ''
        });

        res.status(upstream.status === 206 ? 206 : 200);
        res.setHeader('Content-Type', contentType.startsWith('audio/') ? contentType : fallbackType);
        res.setHeader('Accept-Ranges', upstreamHeaders['accept-ranges'] || 'bytes');
        if (upstreamHeaders['content-length']) res.setHeader('Content-Length', upstreamHeaders['content-length']);
        if (upstreamHeaders['content-range']) res.setHeader('Content-Range', upstreamHeaders['content-range']);
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('X-Max-Audio-Fix', 'mime-v3');

        upstream.data.once('error', (error) => {
          console.error('[AUDIO MIME FIX STREAM]', error.message);
          if (!res.headersSent) res.status(502).end();
          else if (!res.writableEnded && !res.destroyed) res.end();
        });

        upstream.data.pipe(res);
      } catch (error) {
        console.error('[GET /api/audio MIME FIX]', error.response?.status || '', error.message);
        if (!res.headersSent) res.status(502).send('Не удалось получить аудиофайл');
        else if (!res.writableEnded && !res.destroyed) res.end();
      }
    });

    console.log('[AUDIO MIME FIX] route installed');
  };

  setImmediate(replaceRoutes);
  app[ROUTE_FLAG] = true;
}

express.application.listen = function patchedListen(...args) {
  const app = this;
  const server = originalListen.apply(app, args);
  installAfterServerStarts(app);
  return server;
};
