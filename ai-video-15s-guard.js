const axios = require('axios');

const originalPost = axios.post;
const VIDEO_TASK_URL = 'https://api.piapi.ai/api/v1/task';

function addRefs(prompt, count) {
  const refs = Array.from({ length: count }, (_, i) => '@image_' + (i + 1)).join(', ');
  const safe = String(prompt || '').trim();
  return safe + (safe ? '. ' : '') + 'Use the provided reference images ' + refs + ' in the order supplied.';
}

axios.post = async function patchedAxiosPost(url, data, config) {
  if (url === VIDEO_TASK_URL && data && data.model === 'kling') {
    const body = JSON.parse(JSON.stringify(data));
    const input = body.input || {};

    if (body.task_type === 'video_generation') {
      body.task_type = 'omni_video_generation';
      body.config = body.config || { service_mode: 'public' };
      body.config.service_mode = body.config.service_mode || 'public';

      const elements = Array.isArray(input.elements) ? input.elements : [];
      const imageUrls = elements
        .map((item) => item && item.image_url)
        .filter(Boolean)
        .slice(0, 7);

      if (imageUrls.length) {
        input.images = imageUrls;
        input.prompt = addRefs(input.prompt, imageUrls.length);
      } else if (input.image_url) {
        input.images = [input.image_url];
        input.prompt = addRefs(input.prompt, 1);
      }

      delete input.elements;
      delete input.image_url;
      delete input.mode;
      delete input.prefer_multi_shots;

      input.version = '3.0';
      input.resolution = '720p';
      input.duration = 15;
      input.aspect_ratio = input.aspect_ratio || '9:16';
      if (typeof input.enable_audio !== 'boolean') input.enable_audio = false;

      body.input = input;
    } else if (body.task_type === 'omni_video_generation') {
      input.version = '3.0';
      input.resolution = input.resolution || '720p';
      input.duration = 15;
      input.aspect_ratio = input.aspect_ratio || '9:16';
      body.input = input;
    }

    console.log('[AI VIDEO 15S] PiAPI task normalized:', JSON.stringify({
      task_type: body.task_type,
      duration: body.input?.duration,
      resolution: body.input?.resolution,
      enable_audio: body.input?.enable_audio,
      images: Array.isArray(body.input?.images) ? body.input.images.length : 0
    }));

    return originalPost.call(this, url, body, config);
  }

  return originalPost.call(this, url, data, config);
};

console.log('[AI VIDEO 15S] module loaded');
