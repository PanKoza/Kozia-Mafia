import { SERVER_URL } from './config.js';
import { adminAuth } from './storage.js';

export async function api(path, { method = 'GET', body, admin = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (admin) headers.Authorization = `Bearer ${adminAuth.get()}`;
  let res;
  try {
    res = await fetch(`${SERVER_URL}/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('Brak połączenia z serwerem. Serwer może się budzić – spróbuj za chwilę.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Błąd ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}
