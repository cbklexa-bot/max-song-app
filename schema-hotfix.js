// Compatibility layer for the actual Supabase schema used by this project.
// The legacy server uses user_id, while orders/transactions store the MAX ID in max_id.
const axios = require('axios');

function tableFromUrl(url) {
  const match = String(url || '').match(/\/rest\/v1\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function normalizeQuery(url, query) {
  const table = tableFromUrl(url);
  if ((table === 'orders' || table === 'transactions') && query && Object.prototype.hasOwnProperty.call(query, 'user_id')) {
    const next = { ...query, max_id: query.user_id };
    delete next.user_id;
    return next;
  }
  return query;
}

function normalizeBody(url, body) {
  const table = tableFromUrl(url);
  if ((table === 'orders' || table === 'transactions') && body && Object.prototype.hasOwnProperty.call(body, 'user_id')) {
    const next = { ...body, max_id: body.user_id };
    delete next.user_id;
    return next;
  }
  return body;
}

const originalGet = axios.get.bind(axios);
const originalPost = axios.post.bind(axios);
const originalPatch = axios.patch.bind(axios);

axios.get = (url, config = {}) => originalGet(url, {
  ...config,
  params: normalizeQuery(url, config.params)
});

axios.post = (url, data, config = {}) => originalPost(url, normalizeBody(url, data), config);

axios.patch = (url, data, config = {}) => originalPatch(url, normalizeBody(url, data), {
  ...config,
  params: normalizeQuery(url, config.params)
});

console.log('[SCHEMA HOTFIX] orders/transactions user_id -> max_id enabled');
