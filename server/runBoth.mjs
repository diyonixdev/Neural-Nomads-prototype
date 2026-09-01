import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const spawnOpts = { stdio: 'inherit', shell: true, cwd: root };

console.log('[dev:all] Starting AI backend + Vite frontend...');
console.log('[dev:all] If port 5173 is busy, Vite will auto-pick 5176 (allowed by CORS now).');
console.log('[dev:all] AI backend: http://localhost:8787  |  Frontend: http://localhost:5173');

const ai = spawn('node', ['server/aiIntentApi.mjs'], spawnOpts);
const vite = spawn('npx', ['vite'], spawnOpts);

const cleanup = () => {
  try { ai.kill(); } catch {}
  try { vite.kill(); } catch {}
};

process.on('SIGINT', () => { cleanup(); process.exit(0); });
process.on('SIGTERM', () => { cleanup(); process.exit(0); });

ai.on('exit', (code) => {
  console.log(`[dev:all] AI backend exited with ${code}`);
  if (code !== 0) console.log('[dev:all] Tip: check .env - AI_API_KEY / AI_API_MODEL');
});
vite.on('exit', (code) => {
  console.log(`[dev:all] Vite exited with ${code}`);
  cleanup();
  process.exit(code ?? 0);
});
