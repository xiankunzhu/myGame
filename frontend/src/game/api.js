const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

async function jsonFetch(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg = data?.error || res.statusText || 'Request failed';
    throw new Error(msg);
  }
  return data;
}

export function loadTopScores() {
  return jsonFetch('/api/scores/top');
}
export function loadMyScores(token) {
  return jsonFetch('/api/scores/me', { token });
}
export function submitScore(token, score) {
  return jsonFetch('/api/scores', { method: 'POST', body: { score }, token });
}
export function login(username, password) {
  return jsonFetch('/api/auth/login', { method: 'POST', body: { username, password } });
}
export function register(username, password) {
  return jsonFetch('/api/auth/register', { method: 'POST', body: { username, password } });
}
