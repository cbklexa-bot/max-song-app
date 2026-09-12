const axios = require('axios');

// Fixed character profiles for the "Поздравление от персонажа" product.
// This module is preloaded before ai-video-wan-runtime.js and transparently
// upgrades character Wan requests from text-to-video to image-to-video.

const RAW_BASE = 'https://raw.githubusercontent.com/cbklexa-bot/max-song-app/main/public/assets/video-gifts/characters/';

const CHARACTER_PROFILES = {
  homeless: {
    image: RAW_BASE + encodeURIComponent('бомж поздравитель.jpg').replace(/%2F/g, '/'),
    prompt: `A charismatic funny homeless street character delivering a personalized congratulations directly to the recipient. He is an adult man with a distinctive expressive face, scruffy beard, slightly messy hair, worn but recognizable casual clothing, authentic street appearance, humorous and warm personality. He looks a little rough but is clearly kind-hearted, energetic and charismatic rather than threatening or depressing. He is standing in a recognizable urban courtyard near an old residential neighborhood, with slightly worn walls, benches, old trees, urban details and authentic Russian street atmosphere. The location feels real, lived-in and cinematic, but not dirty or extreme. His performance is expressive, confident and comedic. He speaks directly to the camera as if personally addressing the recipient. He uses natural Russian speech, lively facial expressions, natural hand gestures and subtle body movement. His humor is cheeky and street-smart but friendly. Maintain the exact same character identity, facial appearance, clothing style, age, proportions and overall visual design from the provided reference image. Do not redesign the character, replace the face, or change the environment concept. The character should feel like a recurring recognizable host of the AI-gifts service, with consistent appearance across every generated video.`
  },
  boss_baby: {
    image: RAW_BASE + encodeURIComponent('босс малокосос поздравитель.jpg').replace(/%2F/g, '/'),
    prompt: `A highly realistic small child portrayed as a serious corporate CEO, creating a humorous contrast between his very young appearance and his extremely serious professional behavior. The child has a confident facial expression, focused eyes and authoritative body language. He is sitting in a large luxurious black leather executive chair behind an expensive modern CEO desk in a premium corporate office. The office contains elegant dark wood details, large windows, modern architecture, subtle city skyline elements, premium business furniture and cinematic professional lighting. The child wears a perfectly tailored miniature business suit, white shirt and elegant tie. His appearance must remain realistic and age-appropriate while his behavior is comically serious and businesslike. He addresses the recipient directly as if the recipient were an important business partner or employee. His delivery is confident, calm, slightly arrogant and extremely serious, creating the humor. He can make subtle CEO-style gestures such as leaning forward, pointing, placing hands on the desk or adjusting posture. Natural Russian speech, believable lip movement, expressive eyes and realistic facial animation. Maintain the exact same child identity, face, hairstyle, clothing, chair, office environment and overall visual design from the provided reference image. Do not age the child, transform the child into an adult, or change the location concept.`
  },
  young_woman: {
    image: RAW_BASE + encodeURIComponent('девушка поздравитель.jpg').replace(/%2F/g, '/'),
    prompt: `A beautiful adult young woman, approximately 25–30 years old, charismatic, attractive, modern and confident. She has a warm expressive face, natural beauty, stylish appearance and a friendly slightly playful personality. She is always located in the same elegant modern lifestyle setting: a stylish contemporary apartment or premium studio with warm cinematic lighting, tasteful interior design, soft decorative lights, modern furniture and a clean luxurious atmosphere. She wears a fashionable modern outfit appropriate for a stylish social-media host. Her appearance is elegant, attractive and contemporary without being overly sexualized. She speaks directly to the camera as if recording a personalized video message specifically for the recipient. Her communication style is warm, charming, confident, slightly playful and emotionally engaging. Natural Russian speech, believable lip synchronization, expressive eyes, subtle smiles, natural head movement and elegant hand gestures. Maintain the exact same face, hairstyle, clothing concept, body proportions, personality, visual identity and location from the reference image. She must look like the same recurring character in every video.`
  },
  grandpa: {
    image: RAW_BASE + encodeURIComponent('дедушка поздравитель.jpg').replace(/%2F/g, '/'),
    prompt: `A kind elderly Russian grandfather, approximately 75–85 years old, with a warm expressive face, natural wrinkles, gray hair and a gentle charismatic personality. He feels authentic, familiar and emotionally comforting. He is sitting in a cozy traditional living room with warm lighting, comfortable armchair, wooden furniture, family-style interior details, books, a small table and subtle nostalgic elements. The room should feel like a real loved family home. The grandfather speaks directly to the recipient as if he personally knows them and genuinely cares about them. His personality is warm, wise, slightly humorous and affectionate. His delivery is calm and sincere but can include small jokes and playful moments. He naturally smiles, nods, gestures with his hands and occasionally leans toward the camera while speaking. Natural Russian speech, authentic elderly facial expressions, believable lip synchronization and realistic movement. Preserve the exact same face, age, hairstyle, clothing style, chair, room and visual identity from the reference image. Do not make him younger, and do not turn him into a generic old man. He must remain the same recognizable grandfather character.`
  },
  secret_agent: {
    image: RAW_BASE + encodeURIComponent('агент поздравитель.jpg').replace(/%2F/g, '/'),
    prompt: `A charismatic serious male secret agent, approximately 35–45 years old, with a sharp intelligent face, controlled emotions, confident posture and professional spy appearance. He is permanently located inside a sophisticated covert intelligence office. The environment contains dark walls, cinematic low-key lighting, computer monitors, classified documents, subtle high-tech equipment, encrypted communication screens and discreet surveillance elements. The office should feel like a modern secret intelligence headquarters rather than a fantasy environment. He wears an elegant dark suit or professional spy-style clothing. His appearance is clean, precise and highly controlled. He speaks directly to the recipient as if delivering a confidential classified briefing. His voice and behavior are serious and professional, but the content can contain dry humor and playful spy references. Minimal but deliberate hand gestures. Controlled facial expressions. Occasional serious glance toward the camera. Natural Russian speech, clear pronunciation and believable lip synchronization. Maintain the exact same face, hairstyle, clothing style, office, lighting concept and character identity from the provided reference image. Never redesign him or move him to another environment.`
  },
  tv_host: {
    image: RAW_BASE + encodeURIComponent('ведущий поздравитель.jpg').replace(/%2F/g, '/'),
    prompt: `A charismatic energetic professional male TV and stage host, approximately 35–50 years old, with a highly expressive face, confident posture, excellent stage presence and natural entertainer personality. He is permanently located in a premium television and concert studio. The environment contains professional stage lighting, large LED screens, subtle colorful light effects, a polished studio floor, modern broadcast equipment and a festive entertainment atmosphere. He wears an elegant stylish stage outfit suitable for a professional television presenter. He speaks directly to the camera like a professional celebrity host announcing a special personalized celebration. His performance is energetic, confident, enthusiastic and emotionally engaging. He uses expressive gestures, smiles, changes facial expression naturally and creates the feeling of a live television celebration dedicated personally to the recipient. Natural Russian speech, excellent pronunciation, believable lip synchronization, realistic body movement and professional presenter energy. Maintain the exact same face, hairstyle, clothing style, studio environment and overall visual identity from the reference image in every generation. Do not turn him into a generic presenter.`
  }
};

function detectCharacter(prompt) {
  const text = String(prompt || '');
  if (text.includes('funny charismatic street character')) return 'homeless';
  if (text.includes('strict but comedic boss')) return 'boss_baby';
  if (text.includes('Recipient:') && text.includes('Script and wishes:')) {
    // The current runtime does not expose character_id in the PiAPI body.
    // The frontend's character-specific label is therefore appended by the UI
    // into the hidden prompt in the next UI/runtime revision. Keep this fallback
    // disabled rather than risking the wrong face for an order.
  }
  if (text.includes('funny kind grandfather')) return 'grandpa';
  if (text.includes('humorous detective')) return null;
  if (text.includes('energetic TV host')) return 'tv_host';
  return null;
}

function enrichCharacterTask(body, characterId) {
  const profile = CHARACTER_PROFILES[characterId];
  if (!profile || !body || !body.input) return body;

  body.task_type = 'wan26-img2video';
  body.input = {
    ...body.input,
    image: profile.image,
    prompt: [
      profile.prompt,
      'Personalized recipient:',
      String(body.input.prompt || '')
    ].join(' '),
    audio: true
  };

  return body;
}

const originalPost = axios.post.bind(axios);
axios.post = async function patchedAxiosPost(url, data, config) {
  if (String(url || '').includes('api.piapi.ai/api/v1/task') && data && data.model === 'Wan' && data.task_type === 'wan26-txt2video') {
    const characterId = detectCharacter(data.input?.prompt);
    if (characterId) {
      data = enrichCharacterTask({ ...data, input: { ...data.input } }, characterId);
      console.log('[AI VIDEO CHARACTER PROFILES] Wan character upgraded:', characterId);
    }
  }
  return originalPost(url, data, config);
};

console.log('[AI VIDEO CHARACTER PROFILES] loaded:', Object.keys(CHARACTER_PROFILES));
module.exports = { CHARACTER_PROFILES, detectCharacter };
