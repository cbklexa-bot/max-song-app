const axios = require('axios');

// Forces a clear speech sequence for character congratulations:
// recipient name first -> short pause -> congratulations.
// This module is intentionally separate from the fixed character profiles.

const originalPost = axios.post.bind(axios);

function isPiApiWanTask(url, data) {
  return String(url || '').includes('api.piapi.ai/api/v1/task')
    && data
    && data.model === 'Wan'
    && data.task_type === 'wan26-txt2video'
    && data.input
    && data.input.audio;
}

axios.post = async function patchedSpeechOrderPost(url, data, config) {
  if (isPiApiWanTask(url, data)) {
    const recipient = String(data.input.prompt || '').match(/Recipient:\s*([^\.\n]+)/i)?.[1]?.trim() || '';
    const speechOrder = [
      'MANDATORY SPEECH ORDER FOR THE CONGRATULATION:',
      recipient ? `The first spoken utterance must be exactly the recipient name "${recipient}".` : 'The first spoken utterance must be the recipient name.',
      'Pronounce the entire name clearly and completely as a standalone utterance.',
      'After saying the name, make a short natural pause of approximately 0.6 to 1.0 seconds.',
      'Only after that pause begin the congratulations and wishes.',
      'Never merge, overlap, clip, swallow or rush the end of the recipient name into the following phrase.',
      'The recipient name must be fully audible before any other words are spoken.'
    ].join(' ');

    data = {
      ...data,
      input: {
        ...data.input,
        prompt: [String(data.input.prompt || ''), speechOrder].join(' ')
      }
    };
  }

  return originalPost(url, data, config);
};

console.log('[AI VIDEO SPEECH ORDER] loaded: name -> pause -> congratulations');
