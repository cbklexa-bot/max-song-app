const axios = require('axios');

// Forces a clear speech sequence for character congratulations:
// initial silence -> recipient name -> short pause -> congratulations.
// The total spoken script is kept short enough for a 15-second video.
const originalPost = axios.post.bind(axios);

function isCharacterPiApiWanTask(url, data) {
  if (!String(url || '').includes('api.piapi.ai/api/v1/task') || !data || data.model !== 'Wan' || !data.input || !data.input.audio) return false;
  return data.task_type === 'wan26-txt2video'
    || (data.task_type === 'wan26-img2video' && String(data.input.prompt || '').includes('Personalized recipient request'));
}

axios.post = async function patchedSpeechOrderPost(url, data, config) {
  if (isCharacterPiApiWanTask(url, data)) {
    const prompt = String(data.input.prompt || '');
    const recipient = prompt.match(/Recipient:\s*([^\.\n]+)/i)?.[1]?.trim() || '';
    const speechOrder = [
      'MANDATORY FINAL SPEECH TIMING FOR THIS 15-SECOND VIDEO:',
      'Keep the total spoken congratulations to a maximum of 30 words including the recipient name, so the speech fits comfortably inside 15 seconds.',
      'The first 0.4 to 0.6 seconds of the video must be completely silent before any speech starts.',
      recipient ? `After that initial silence, the first spoken utterance must be exactly the full recipient name "${recipient}".` : 'After that initial silence, the first spoken utterance must be the full recipient name.',
      'Pronounce the entire name clearly, completely and slowly enough to be fully intelligible as a standalone utterance.',
      'Then make a natural pause of approximately 0.7 to 1.0 seconds.',
      'Only after that pause begin the congratulations and wishes.',
      'Never merge, overlap, clip, swallow, shorten or rush any part of the recipient name into the following phrase.',
      'The name must finish completely before any congratulation words begin.',
      'Do not add extra introductory words, greetings, filler words or repeated name variants.'
    ].join(' ');

    data = {
      ...data,
      input: {
        ...data.input,
        prompt: [prompt, speechOrder].join(' ')
      }
    };
  }

  return originalPost(url, data, config);
};

console.log('[AI VIDEO SPEECH ORDER] loaded: initial silence -> name -> pause -> congratulations, max 30 spoken words');
