// Final public price for the only available video product.
// Loaded before ai-video-wan-runtime.js so the runtime itself uses 350 ₽.
process.env.VIDEO_PRICE = '350';
process.env.VIDEO_PHOTOS_PRICE = '350';
process.env.VIDEO_SINGING_PRICE = '350';
process.env.VIDEO_CHARACTER_PRICE = '350';

const express = require('express');
const originalSend = express.response.send;

express.response.send = function patchedVideoPriceSend(body) {
  try {
    if (typeof body === 'string' && body.includes('327 ₽')) {
      body = body.replace(/327 ₽/g, '350 ₽');
    }
  } catch (error) {
    console.error('[AI VIDEO PRICE V2]', error.message);
  }
  return originalSend.call(this, body);
};

console.log('[AI VIDEO PRICE V2] video price fixed at 350 ₽');
