import { db } from './firebase.mjs';

async function testFirestore() {
  console.log('[Test] Starting Firestore connectivity test...');

  if (!db) {
    console.error('[Test] FAILED: Firestore database object is null.');
    console.error('[Test] Check that FIREBASE_SERVICE_ACCOUNT_PATH is set in .env and the file exists.');
    process.exit(1);
  }

  try {
    const testDocRef = db.collection('_connectivity_test').doc('ping');
    const testData = { ok: true, timestamp: new Date().toISOString() };

    console.log('[Test] Writing test document to Firestore...');
    await testDocRef.set(testData);
    console.log('[Test] Write successful.');

    console.log('[Test] Reading test document back...');
    const snap = await testDocRef.get();

    if (!snap.exists) {
      console.error('[Test] FAILED: Document read returned empty.');
      process.exit(1);
    }

    console.log('[Test] Read successful. Data:', snap.data());

    console.log('[Test] Deleting test document...');
    await testDocRef.delete();
    console.log('[Test] Delete successful.');

    console.log('');
    console.log('============================================');
    console.log('  FIRESTORE CONNECTIVITY TEST PASSED');
    console.log('  Node.js -> Firebase Admin SDK -> Firestore');
    console.log('============================================');
    process.exit(0);
  } catch (err) {
    console.error('[Test] FAILED with error:', err.message);
    if (err.message.includes('PERMISSION_DENIED')) {
      console.error('[Test] HINT: Firestore Security Rules are blocking access.');
      console.error('[Test] Go to Firebase Console -> Firestore -> Rules and allow reads/writes for testing.');
    }
    if (err.message.includes('not found') || err.message.includes('NOT_FOUND')) {
      console.error('[Test] HINT: Firestore database may not exist yet.');
      console.error('[Test] Go to Firebase Console -> Firestore -> Create database.');
    }
    process.exit(1);
  }
}

testFirestore();
