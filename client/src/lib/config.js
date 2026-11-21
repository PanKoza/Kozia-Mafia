/* global __SERVER_URL__ */
// Injected at build time from the SERVER_URL env variable (see vite.config.js).
const fromEnv = typeof __SERVER_URL__ !== 'undefined' ? __SERVER_URL__ : '';

// In a production build a missing SERVER_URL would silently point every phone at "localhost".
if (import.meta.env.PROD && !fromEnv) {
  console.error(
    '[Kozia Mafia] Brak SERVER_URL w buildzie! Ustaw ją w Vercel → Settings → Environment Variables (adres serwera z Render) i zrób Redeploy.'
  );
}

export const SERVER_URL = (fromEnv || 'http://localhost:4000').replace(/\/$/, '');
export const SERVER_URL_MISSING = import.meta.env.PROD && !fromEnv;
