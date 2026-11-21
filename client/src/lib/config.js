const fromEnv = import.meta.env.VITE_SERVER_URL;

// In a production build a missing VITE_SERVER_URL would silently point every phone at "localhost".
if (import.meta.env.PROD && !fromEnv) {
  console.error(
    '[Kozia Mafia] Brak VITE_SERVER_URL w buildzie! Ustaw ją w Vercel → Settings → Environment Variables (adres serwera z Render) i zrób Redeploy.'
  );
}

export const SERVER_URL = (fromEnv || 'http://localhost:4000').replace(/\/$/, '');
export const SERVER_URL_MISSING = import.meta.env.PROD && !fromEnv;
