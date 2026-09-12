const axios = require('axios');

if (!process.env.AI_VIDEO_DURATION_PATCHED) {
  process.env.AI_VIDEO_DURATION_PATCHED = '1';
  const originalPost = axios.post;

  axios.post = function patchedAxiosPost(url, data, config) {
    try {
      if (
        url === 'https://api.piapi.ai/api/v1/task' &&
        data &&
        data.model === 'kling' &&
        data.task_type === 'video_generation' &&
        data.input
      ) {
        const next = JSON.parse(JSON.stringify(data));
        if (Array.isArray(next.input.elements) && next.input.elements.length) {
          // Kling Elements (1.6) supports 5s or 10s.
          next.input.duration = 10;
        } else {
          // Kling 3.0 supports 3–15s; use a proper gift-length video.
          next.input.duration = 15;
        }
        console.log('[AI VIDEO DURATION] generation duration:', next.input.duration);
        return originalPost.call(this, url, next, config);
      }
    } catch (error) {
      console.error('[AI VIDEO DURATION] patch error:', error.message);
    }
    return originalPost.call(this, url, data, config);
  };
}

console.log('[AI VIDEO DURATION] module loaded');
