import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        timeout: 20000,
        proxyTimeout: 20000,
        configure: (proxy) => {
          proxy.on('error', (err, _req, _res: any) => {
            console.log('[vite proxy] /api backend not reachable (ECONNREFUSED) - client will use local fallback. Start it with: npm run dev:ai. Error:', (err as any)?.message);
            // Send error response instead of leaving request hanging (fixes infinite spinner)
            try {
              if (_res && !_res.headersSent && _res.writeHead) {
                _res.writeHead(502, { 'Content-Type': 'application/json' });
                _res.end(JSON.stringify({ error: 'Backend unavailable', detail: (err as any)?.message || 'ECONNREFUSED' }));
              }
            } catch {}
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log(`[vite proxy] ${req.method} ${req.url} -> http://localhost:8787${req.url}`);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log(`[vite proxy] response ${proxyRes.statusCode} for ${req.method} ${req.url}`);
          });
        },
      },
    },
  },
});
