const PORT = 8787;
const BASE = `http://localhost:${PORT}`;

const VALID_PAYLOAD = {
  farmer_name: 'Raj Kumar',
  phone: '+919876543210',
  product: 'Wheat',
  quantity: 10,
  unit: 'kg',
  asking_price: 30,
  price_unit: 'kg',
  location: 'Ghaziabad',
  quality: 'Good',
  intent: 'sell',
  source: 'voice_agent',
};

let createdListingId = null;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  PASS: ${name}`);
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(`        ${err.message}`);
    process.exitCode = 1;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, json, text };
}

async function run() {
  console.log('[Test] Starting POST /api/listings tests...\n');

  // --- Test 1: Valid payload ---
  console.log('[Test 1] POST /api/listings with valid payload');
  await test('Returns 201', async () => {
    const r = await req('POST', '/api/listings', VALID_PAYLOAD);
    assert(r.status === 201, `Expected 201, got ${r.status}`);
  });
  await test('Response has success=true', async () => {
    const r = await req('POST', '/api/listings', VALID_PAYLOAD);
    assert(r.json?.success === true, 'success is not true');
  });
  await test('Response has listing_id', async () => {
    const r = await req('POST', '/api/listings', VALID_PAYLOAD);
    assert(r.json?.listing_id, 'listing_id missing');
    createdListingId = r.json.listing_id;
  });
  await test('Response has status=created', async () => {
    const r = await req('POST', '/api/listings', VALID_PAYLOAD);
    assert(r.json?.status === 'created', `Expected "created", got "${r.json?.status}"`);
  });
  await test('Response listing has created_at', async () => {
    const r = await req('POST', '/api/listings', VALID_PAYLOAD);
    assert(r.json?.listing?.created_at, 'created_at missing in listing');
  });
  await test('Response listing has all required fields', async () => {
    const r = await req('POST', '/api/listings', VALID_PAYLOAD);
    const l = r.json?.listing;
    assert(l?.farmer_name === 'Raj Kumar', 'farmer_name mismatch');
    assert(l?.phone === '+919876543210', 'phone mismatch');
    assert(l?.product === 'Wheat', 'product mismatch');
    assert(l?.quantity === 10, 'quantity mismatch');
    assert(l?.unit === 'kg', 'unit mismatch');
    assert(l?.asking_price === 30, 'asking_price mismatch');
    assert(l?.location === 'Ghaziabad', 'location mismatch');
  });

  // --- Test 2: Validation - missing required fields ---
  console.log('\n[Test 2] POST /api/listings with missing fields');
  await test('Returns 400 for empty body', async () => {
    const r = await req('POST', '/api/listings', {});
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });
  await test('Error message mentions validation', async () => {
    const r = await req('POST', '/api/listings', {});
    assert(r.json?.error?.includes('Validation'), `Error: ${r.json?.error}`);
  });
  await test('Returns 400 for missing farmer_name', async () => {
    const bad = { ...VALID_PAYLOAD, farmer_name: '' };
    const r = await req('POST', '/api/listings', bad);
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });
  await test('Returns 400 for invalid unit', async () => {
    const bad = { ...VALID_PAYLOAD, unit: 'liters' };
    const r = await req('POST', '/api/listings', bad);
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  // --- Test 3: Malformed JSON ---
  console.log('\n[Test 3] POST /api/listings with malformed JSON');
  await test('Returns 400 for malformed JSON', async () => {
    const res = await fetch(`${BASE}/api/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ bad json',
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  // --- Test 4: GET /api/health still works ---
  console.log('\n[Test 4] GET /api/health regression');
  await test('Returns 200', async () => {
    const r = await req('GET', '/api/health');
    assert(r.status === 200, `Expected 200, got ${r.status}`);
  });
  await test('Response has status=ok', async () => {
    const r = await req('GET', '/api/health');
    assert(r.json?.status === 'ok', 'status is not ok');
  });

  // --- Cleanup: Delete test listings ---
  console.log('\n[Cleanup] Deleting test listings from Firestore');
  if (createdListingId) {
    const { db } = await import('./server/firebase.mjs');
    if (db) {
      await db.collection('listings').doc(createdListingId).delete();
      console.log(`  Deleted test listing: ${createdListingId}`);
    }
  }

  // Delete any other test-* listings created during tests
  if (createdListingId) {
    const { db } = await import('./server/firebase.mjs');
    if (db) {
      const snap = await db.collection('listings').where('source', '==', 'voice_agent').get();
      for (const doc of snap.docs) {
        if (doc.data().farmer_name === 'Raj Kumar' && doc.data().product === 'Wheat') {
          await doc.ref.delete();
          console.log(`  Deleted additional test listing: ${doc.id}`);
        }
      }
    }
  }

  console.log('\n============================================');
  if (process.exitCode) {
    console.log('  SOME TESTS FAILED');
  } else {
    console.log('  ALL TESTS PASSED');
  }
  console.log('============================================\n');
}

run();
