import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

console.log('[DEBUG] firebase.mjs module executing');
console.log('[DEBUG] process.cwd() =', process.cwd());

// --- Load .env from project root ---
const __dirnameEnv = path.dirname(fileURLToPath(import.meta.url));
console.log('[DEBUG] __dirnameEnv =', __dirnameEnv);

const candidates = [path.resolve(__dirnameEnv, '..', '.env'), path.resolve(process.cwd(), '.env')];
let envLoadedFrom = null;
for (const p of candidates) {
  try {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      
      raw.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eq = trimmed.indexOf('=');
        if (eq === -1) return;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      });
      envLoadedFrom = p;
      break;
    }
  } catch {}
}
console.log('[DEBUG] .env loaded from:', envLoadedFrom ?? 'NOWHERE');

// --- Check all env vars ---
console.log('[DEBUG] FIREBASE_SERVICE_ACCOUNT_PATH =', process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? '(undefined)');
console.log('[DEBUG] Length of FIREBASE_SERVICE_ACCOUNT_PATH =', (process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '').length);

// --- Resolve service account path ---
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

let db = null;
let firebaseApp = null;

console.log('[Firebase] Initializing...');
console.log(`[Firebase] Service account path: ${serviceAccountPath ?? '(not set)'}`);

if (!serviceAccountPath) {
  console.error('[Firebase] ERROR: FIREBASE_SERVICE_ACCOUNT_PATH is not set in .env');
  console.error('[Firebase] Set it in .env to point to your Firebase service-account JSON.');
} else {
  const normalizedPath = serviceAccountPath.replace(/\//g, path.sep).replace(/\\/g, path.sep);
  const resolvedPath = path.resolve(normalizedPath);
  console.log(`[Firebase] Normalized path: ${normalizedPath}`);
  console.log(`[Firebase] Resolved path: ${resolvedPath}`);

  const exists = fs.existsSync(resolvedPath);
  console.log(`[DEBUG] Service account file exists: ${exists}`);

  if (!exists) {
    console.error(`[Firebase] ERROR: Service account file NOT FOUND at: ${resolvedPath}`);
    console.error('[Firebase] Download it from Firebase Console > Project Settings > Service accounts > Generate new private key.');
  } else {
    try {
      const serviceAccountRaw = fs.readFileSync(resolvedPath, 'utf8');
      const serviceAccount = JSON.parse(serviceAccountRaw);

      const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
      const missing = requiredFields.filter((f) => !serviceAccount[f]);
      if (missing.length > 0) {
        console.error(`[Firebase] ERROR: Service account JSON is missing fields: ${missing.join(', ')}`);
      } else if (serviceAccount.type !== 'service_account') {
        console.error(`[Firebase] ERROR: Service account JSON has type="${serviceAccount.type}", expected "service_account"`);
      } else {
        console.log('[Firebase] Service account JSON is valid');

        if (!admin.getApps().length) {
          firebaseApp = admin.initializeApp({
            credential: admin.cert(serviceAccount),
          });
          console.log('[Firebase] admin.initializeApp() completed');
        } else {
          firebaseApp = admin.app();
          console.log('[Firebase] Reusing existing Firebase app');
        }

        db = getFirestore(firebaseApp);
        console.log('[Firebase] Firestore initialized successfully');
      }
    } catch (err) {
      console.error(`[Firebase] ERROR: Failed to initialize Firebase Admin SDK: ${err.message}`);
      console.error(`[Firebase] Error stack: ${err.stack}`);
    }
  }
}

if (!db) {
  console.error('[Firebase] WARNING: Firestore is NOT available. db is null. Writes will fail.');
}

export { admin, db, firebaseApp };
