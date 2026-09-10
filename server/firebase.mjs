import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirnameEnv = path.dirname(fileURLToPath(import.meta.url));
const candidates = [path.resolve(__dirnameEnv, '..', '.env'), path.resolve(process.cwd(), '.env')];
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
      break;
    }
  } catch {}
}

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

let db = null;
let firebaseApp = null;

if (!serviceAccountPath) {
  console.warn('[Firebase] FIREBASE_SERVICE_ACCOUNT_PATH is not set in environment.');
} else if (!fs.existsSync(serviceAccountPath)) {
  console.error(`[Firebase] Service account credential file not found at path: ${serviceAccountPath}`);
} else {
  try {
    const serviceAccountRaw = fs.readFileSync(serviceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(serviceAccountRaw);

    if (!admin.getApps().length) {
      firebaseApp = admin.initializeApp({
        credential: admin.cert(serviceAccount),
      });
    } else {
      firebaseApp = admin.app();
    }

    db = getFirestore(firebaseApp);
    console.log('[Firebase] Firebase Admin SDK initialized successfully.');
  } catch (err) {
    console.error(`[Firebase] Failed to initialize Firebase Admin SDK: ${err.message}`);
  }
}

export { admin, db, firebaseApp };
