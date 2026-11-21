import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Reads .env files AND process.env (Vercel build env). Only SERVER_URL is exposed to the client.
  const env = loadEnv(mode, process.cwd(), '');
  const serverUrl = env.SERVER_URL || env.VITE_SERVER_URL || '';
  return {
    plugins: [react()],
    server: { port: 5173 },
    define: {
      __SERVER_URL__: JSON.stringify(serverUrl),
    },
  };
});
