const axios = require('axios');

// Character congratulations speech control.
// Required sequence: initial silence -> full recipient name -> short pause -> congratulations.
// The spoken text is deliberately short enough for a 15-second Wan 2.6 video.

const originalPost = axios.post.bind(axios);

function isCharacterPiApiWanTask(url, data) {
  if (!String(url || '').includes('api.piapi.ai/api/v1/task') || !data || data.model !== 'Wan' || !data.input || !data.input.audio) return false;
  return data.task_type === 'wan26-txt2video'
    || (data.task_type === 'wan26-img2video' && String(data.input.prompt || '').includes('Personalized recipient request'));
}

function extractRecipient(prompt) {
  const text = String(prompt || '');
  const english = text.match(/Recipient:\s*([^\.\n]+)/i)?.[1]?.trim();
  if (english) return english;

  const russian = text.match(/(?:Персональное поздравление для|Поздравить)\s+([^\.\n]+?)(?:\.|\s+с\s+(?:дн|юб|праз|днём)|\s+Повод:|\s+Пожелания:)/i)?.[1]?.trim();
  return russian || '';
}

axios.post = async function patchedSpeechOrderPost(url, data, config) {
  if (isCharacterPiApiWanTask(url, data)) {
    const prompt = String(data.input.prompt || '');
    const recipient = extractRecipient(prompt);

    const characterSpeechRules = [
      'CHARACTER SPEECH SCRIPT RULES FOR THIS 15-SECOND CONGRATULATION VIDEO:',
      'The very beginning of the video contains approximately 0.5 seconds of complete silence and no speech.',
      recipient
        ? `After this initial silence, the character MUST clearly and fully pronounce the recipient name "${recipient}" as the FIRST spoken phrase.`
        : 'After this initial silence, the character MUST clearly and fully pronounce the recipient name as the FIRST spoken phrase.',
      'The recipient name is not an introduction to another sentence; it is a separate standalone spoken utterance.',
      'Do not start speaking before the first 0.5 seconds.',
      'Do not cut, clip, swallow, shorten, merge or overlap any syllable or letter of the recipient name.',
      'The entire recipient name must be audible from the very first letter/syllable to the final letter/syllable.',
      'After the complete name, leave a clearly audible natural pause of approximately 0.7 seconds.',
      'Only then begin the actual congratulation and wishes.',
      'The congratulations must begin AFTER the name and AFTER the pause, never during the name.',
      'Keep the whole spoken script to a maximum of 28 words including the recipient name, so it comfortably fits the 15-second duration.',
      'Do not add filler words, greetings, repeated names, improvisational introductions or extra sentences.',
      'Prioritize intelligibility of the recipient name over any additional wishes if the available speaking time becomes limited.',
      'This speech-order instruction is mandatory and has higher priority than stylistic improvisation.'
    ].join(' ');

    data = {
      ...data,
      input: {
        ...data.input,
        prompt: [prompt, characterSpeechRules].join(' ')
      }
    };

    console.log('[AI VIDEO SPEECH ORDER] character:', recipient || 'unknown', '-> silence -> full name -> pause -> congratulations');
  }

  return originalPost(url, data, config);
};

console.log('[AI VIDEO SPEECH ORDER] loaded: 0.5s silence -> full recipient name -> pause -> congratulations, max 28 words');
