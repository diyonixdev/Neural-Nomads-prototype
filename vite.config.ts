import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function apiServerPlugin(): Plugin {
  return {
    name: 'api-server-middleware',
    async configureServer(server) {
      try {
        // @ts-expect-error - aiIntentApi is an mjs module
        const { apiHandler } = await import('./server/aiIntentApi.mjs');
        server.middlewares.use(async (req, res, next) => {
          const rawUrl = req.url || '';
          const pathname = rawUrl.split('?')[0];
          if (
            pathname.startsWith('/api') ||
            pathname === '/health' ||
            pathname === '/docs' ||
            pathname === '/openapi.json'
          ) {
            try {
              await apiHandler(req, res);
            } catch (err) {
              console.error('[Vite API Middleware Error]', err);
              next(err);
            }
          } else {
            next();
          }
        });
        console.log('[api-server] Successfully mounted FarmDirect API on Vite dev server middleware.');
      } catch (err) {
        console.error('[api-server] Failed to load server/aiIntentApi.mjs:', err);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), apiServerPlugin()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
