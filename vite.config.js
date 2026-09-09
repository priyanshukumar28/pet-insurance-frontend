import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Dev talks to the API through this proxy so the browser only ever sees
// http://localhost:5173 — that keeps the httpOnly refresh cookie *first-party*,
// so a tab refresh restores the session instead of logging you out.
// Point VITE_API_URL at "/api" (see .env) to route through it.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_DEV_API_PROXY || 'https://pet-insurance.infotechclinic.com';

  return {
    // Served under "/admin/" when bundled with the customer site on one host
    // (VITE_BASE=/admin/ in .env.production); "/" for standalone / local dev.
    base: env.VITE_BASE || '/',
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          secure: true,
          cookieDomainRewrite: '',
        },
        // Pet photos (proposal + certificate) are served by the backend at
        // /uploads — proxy them too so thumbnails resolve in dev.
        '/uploads': {
          target,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
