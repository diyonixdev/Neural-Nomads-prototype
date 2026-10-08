// ============================================================
// TEST A–J — Twilio confirmation / reprompt / dashboard fixes
// ============================================================
// No real phone call anywhere: TwiML is produced by invoking
// handleSpeechResult() with a fake request/response pair.
//
//   A  affirmation variants submit immediately, exact success message
//   B  exactly one submission — repeated affirmations never resubmit
//   C  no confirmation-summary loop, no field corruption from non-data turns
//   D  non-affirmative / field-data turns never submit
//   E  name correction still works end-to-end
//   F  quantity + price correction still works, corrected values submitted
//   G  empty / fragment STT → short reprompt, never the summary
//   H  duplicate webhook skipped — processTurn not called, no extra turn
//   I  TwiML shapes: continuing Gather+Redirect, terminal Say+Hangup
//   J  Twilio listing reaches GET /api/listings and the dashboard service
//
import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import { register } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Node's type-stripping loader does not resolve extensionless relative
// specifiers ("../data/mockData"), which Vite/TS do. Teach it to retry with a
// .ts suffix so src/services/farmerInventoryService.ts can be imported here.
const tsExtHook = `export async function resolve(specifier, context, nextResolve) {
  try { return await nextResolve(specifier, context); }
  catch (err) {
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && !/\\.[cm]?[jt]s$/.test(specifier)) {
      try { return await nextResolve(specifier + '.ts', context); } catch {}
    }
    throw err;
  }
}`;
register('data:text/javascript,' + encodeURIComponent(tsExtHook), import.meta.url);

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const TEST_PORT = 8799;
const TEST_API = `http://localhost:${TEST_PORT}/api/listings`;

// MUST be set before conversationManager.mjs is imported (it reads it at load).
process.env.LISTINGS_API_URL = TEST_API;

const cm = await import('./server/conversationManager.mjs');
const { processTurn, createSession, getSession, setSubmitListingImpl, SUCCESS_MESSAGE } = cm;
const { handleSpeechResult } = await import('./server/twilioVoice.mjs');

// --- output -------------------------------------------------------------------
const realLog = console.log.bind(console);
const realErr = console.error.bind(console);
console.log = (...args) => {
  const s = String(args[0] ?? '');
  if (/^\[/.test(s)) return; // library diagnostics
  realLog(...args);
};
console.error = (...args) => {
  const s = String(args[0] ?? '');
  if (/^\[/.test(s)) return;
  realErr(...args);
};

const results = [];
let current = null;
const startTest = (id, name) => {
  current = { id, name, pass: 0, fail: 0 };
  results.push(current);
  realLog(`\n=== ${id}: ${name} ===`);
};
const check = (label, cond, detail = '') => {
  if (cond) {
    current.pass++;
    realLog(`  PASS  ${label}`);
  } else {
    current.fail++;
    realLog(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
};

// --- submit counter (TEST A–I run with a mocked submit) ----------------------
let submits = 0;
const submittedPayloads = [];
const installSubmitMock = () =>
  setSubmitListingImpl(async (listing) => {
    submits++;
    submittedPayloads.push({ ...listing });
    return { success: true, listing_id: `ls-test-${submits}`, status: 'active' };
  });

// Tests A–I never touch the network; TEST J switches the mock off for real.
installSubmitMock();

// --- standard drive to CONFIRMING --------------------------------------------
const SETUP_TURN = {
  product: 'tamatar',
  name: 'Diya Raghav',
  location: 'Ghaziabad',
  qty: '50 kilo',
  quality: 'Grade A',
  price: '20 rupaye kilo',
  phone: '9876543210',
};

async function setupComplete(sid) {
  createSession(sid);
  await processTurn(sid, 'Namaste');
  await processTurn(sid, SETUP_TURN.product);
  await processTurn(sid, SETUP_TURN.name);
  await processTurn(sid, SETUP_TURN.location);
  await processTurn(sid, SETUP_TURN.qty);
  await processTurn(sid, SETUP_TURN.quality);
  await processTurn(sid, SETUP_TURN.price);
  const r = await processTurn(sid, SETUP_TURN.phone);
  if (r.state !== 'CONFIRMING') {
    throw new Error(`setup failed for ${sid}: state=${r.state} missing=${JSON.stringify(r.missing_fields)} msg=${r.agent_message}`);
  }
  submits = 0;
  submittedPayloads.length = 0;
  return r;
}

// ============================================================
startTest('A', 'Affirmation variants submit immediately with the exact success message');
{
  const variants = [
    'सब सही है',
    'Han sab sahi hai',
    'sab kuch theek hai',
    'sab badhiya hai',
    'Theek hai sab kuch',
    'Haan sab sahi hai',
    'हाँ',
    'सब ठीक है',
    'theek hai',
    'yes',
    'ji haan',
    'bilkul',
    'sahi hai',
  ];
  for (const v of variants) {
    const sid = `test-A-${variants.indexOf(v)}`;
    const pre = await setupComplete(sid);
    const r = await processTurn(sid, v);
    check(
      `"${v}" → SUCCESS, 1 submit, exact message`,
      r.state === 'SUCCESS'
        && submits === 1
        && r.agent_message === SUCCESS_MESSAGE
        && r.listing.product === 'Tomato'
        && r.listing.farmer_name === 'Diya Raghav',
      JSON.stringify({ state: r.state, submits, msg: r.agent_message, product: r.listing.product })
    );
    void pre;
  }
  check('exact success message constant', SUCCESS_MESSAGE === 'Aapki listing ho gayi. FarmDirect se dhanyawaad!', SUCCESS_MESSAGE);
}

// ============================================================
startTest('B', 'Exactly one submission — repeated affirmations never resubmit');
{
  const sid = 'test-B';
  await setupComplete(sid);
  const r1 = await processTurn(sid, 'Haan');
  const r2 = await processTurn(sid, 'Haan');
  const r3 = await processTurn(sid, 'सब सही है');
  const r4 = await processTurn(sid, 'yes please');
  check('first affirmation submits', r1.state === 'SUCCESS' && submits === 1, JSON.stringify({ state: r1.state, submits }));
  check('repeat stays SUCCESS with no extra submit', r2.state === 'SUCCESS' && submits === 1, JSON.stringify({ state: r2.state, submits }));
  check('devanagari repeat stays SUCCESS with no extra submit', r3.state === 'SUCCESS' && submits === 1, JSON.stringify({ state: r3.state, submits }));
  check('fourth affirmation still no extra submit', r4.state === 'SUCCESS' && submits === 1, JSON.stringify({ state: r4.state, submits }));
  check('repeat returns the same success message', r2.agent_message === SUCCESS_MESSAGE && r4.agent_message === SUCCESS_MESSAGE, r4.agent_message);
  check('listing intact after repeats', r4.listing.product === 'Tomato' && r4.listing.farmer_name === 'Diya Raghav');
}

// ============================================================
startTest('C', 'No confirmation-summary loop and no field corruption from non-data turns');
{
  const junk = ['ummm', 'prompt echo', 'Ghaziabad', 'Rahul', 'Dear', 'achha'];
  for (const v of junk) {
    const sid = `test-C-${junk.indexOf(v)}`;
    await setupComplete(sid);
    const r = await processTurn(sid, v);
    const summary = /Ek baar dekh lo|Sab sahi hai\?/i.test(r.agent_message || '');
    check(
      `"${v}" → short re-prompt (no summary loop), product untouched, no submit`,
      r.state === 'CONFIRMING'
        && !summary
        && r.listing.product === 'Tomato'
        && r.listing.farmer_name === 'Diya Raghav'
        && r.listing.location === 'Ghaziabad'
        && submits === 0,
      JSON.stringify({ state: r.state, msg: r.agent_message, product: r.listing.product, name: r.listing.farmer_name, submits })
    );
  }
}

// ============================================================
startTest('D', 'Non-affirmative / field-data turns never submit');
{
  const never = ['Ghaziabad', '2 kilo', 'Rahul', 'ummm', 'Mere paas tamatar hai'];
  for (const v of never) {
    const sid = `test-D-${never.indexOf(v)}`;
    await setupComplete(sid);
    const r = await processTurn(sid, v);
    check(
      `"${v}" → not SUCCESS, no submit`,
      r.state !== 'SUCCESS' && submits === 0,
      JSON.stringify({ state: r.state, submits })
    );
  }

  // A bare number is legitimate field data: it may change the price, but the
  // turn itself must not submit.
  {
    const sid = 'test-D-num';
    await setupComplete(sid);
    const r = await processTurn(sid, '25');
    check('bare "25" → price updated, still CONFIRMING, no submit', r.state === 'CONFIRMING' && r.listing.asking_price === 25 && submits === 0, JSON.stringify({ state: r.state, price: r.listing.asking_price, submits }));
  }

  // A change keyword must still open the correction flow, not submit.
  {
    const sid = 'test-D-price';
    await setupComplete(sid);
    const r = await processTurn(sid, 'price');
    check('"price" → asks for the new price, no submit', r.state !== 'SUCCESS' && submits === 0 && /rupaye/i.test(r.agent_message || ''), JSON.stringify({ state: r.state, msg: r.agent_message }));
  }

  // A negation must never submit.
  {
    const sid = 'test-D-nahi';
    await setupComplete(sid);
    const r = await processTurn(sid, 'nahi');
    check('"nahi" → correction question, no submit', r.state === 'CONFIRMING' && /Kya badalna hai/i.test(r.agent_message || '') && submits === 0, JSON.stringify({ state: r.state, msg: r.agent_message, submits }));
  }
}

// ============================================================
startTest('E', 'Name correction still works end-to-end');
{
  const sid = 'test-E';
  await setupComplete(sid);
  const r1 = await processTurn(sid, 'Nahi, naam galat hai');
  check('asks for the corrected name', /naam kya hai/i.test(r1.agent_message || ''), r1.agent_message);
  const r2 = await processTurn(sid, 'Rahul');
  check('name updated in the re-confirmation', r2.listing.farmer_name === 'Rahul' && /Rahul/.test(r2.agent_message || ''), JSON.stringify({ name: r2.listing.farmer_name, msg: r2.agent_message }));
  const r3 = await processTurn(sid, 'Sab sahi hai');
  check('submits once with the corrected name', r3.state === 'SUCCESS' && submits === 1 && r3.listing.farmer_name === 'Rahul', JSON.stringify({ state: r3.state, submits, name: r3.listing.farmer_name }));
  check('corrected name is in the submitted payload', submittedPayloads[0]?.farmer_name === 'Rahul', JSON.stringify(submittedPayloads[0]));
}

// ============================================================
startTest('F', 'Quantity + price correction still works, corrected values submitted');
{
  const sid = 'test-F';
  await setupComplete(sid);
  check('baseline quantity 50 / price 20', (await getSession(sid)).listing.quantity === 50 && (await getSession(sid)).listing.asking_price === 20);

  const r1 = await processTurn(sid, 'Nahi, quantity change karni hai');
  check('asks for the new quantity', /Kitna bechna/i.test(r1.agent_message || ''), r1.agent_message);
  const r2 = await processTurn(sid, '80');
  check('quantity 50 → 80', r2.listing.quantity === 80, String(r2.listing.quantity));

  const r3 = await processTurn(sid, 'Nahi, price change karna hai');
  check('asks for the new price', /rupaye/i.test(r3.agent_message || ''), r3.agent_message);
  const r4 = await processTurn(sid, '25');
  check('price 20 → 25', r4.listing.asking_price === 25, String(r4.listing.asking_price));

  const r5 = await processTurn(sid, 'Han sab sahi hai');
  check('submits once with corrected quantity + price', r5.state === 'SUCCESS' && submits === 1 && r5.listing.quantity === 80 && r5.listing.asking_price === 25, JSON.stringify({ state: r5.state, submits, qty: r5.listing.quantity, price: r5.listing.asking_price }));

  const p = submittedPayloads[0];
  const required = ['product', 'farmer_name', 'phone', 'quantity', 'unit', 'location', 'quality', 'asking_price', 'price_unit', 'intent'];
  check('payload carries every required key', required.every((k) => p && Object.prototype.hasOwnProperty.call(p, k)), JSON.stringify(p));
  check('payload carries the corrected values', p?.quantity === 80 && p?.asking_price === 25, JSON.stringify({ q: p?.quantity, pr: p?.asking_price }));
}

// ============================================================
// TwiML helpers ------------------------------------------------------------
const makeResponse = () => ({
  statusCode: null,
  headers: null,
  headersSent: false,
  writableEnded: false,
  body: null,
  writeHead(status, headers) {
    this.statusCode = status;
    this.headers = headers;
    this.headersSent = true;
  },
  end(chunk) {
    this.body = chunk == null ? '' : String(chunk);
    this.writableEnded = true;
  },
});

async function twilioTurn(callSid, speechResult) {
  const body = new URLSearchParams({ CallSid: callSid, SpeechResult: speechResult }).toString();
  const req = new EventEmitter();
  req.headers = {};
  const res = makeResponse();
  const done = handleSpeechResult(req, res);
  req.emit('data', Buffer.from(body));
  req.emit('end');
  await done;
  if (!res.writableEnded) throw new Error(`no TwiML for ${JSON.stringify(speechResult)}`);
  return res.body;
}

async function driveToConfirming(callSid) {
  const steps = ['Namaste', 'tamatar', 'Diya Raghav', 'Ghaziabad', '50 kilo', 'Grade A', '20 rupaye kilo', '9876543210'];
  let last = '';
  for (const s of steps) last = await twilioTurn(callSid, s);
  // Driving to CONFIRMING never submits — reset so each TwiML test measures
  // only its own call.
  submits = 0;
  submittedPayloads.length = 0;
  return last;
}

// ============================================================
startTest('G', 'Empty / fragment STT during CONFIRMING → short reprompt, never the summary');
{
  const callSid = 'call-G';
  await driveToConfirming(callSid);

  const empty = await twilioTurn(callSid, '');
  check('empty result still gets a continuing Gather', empty.includes('<Gather') && empty.includes('<Redirect'), empty);
  check('empty result does NOT replay the summary', !/Ek baar dekh lo|Sab sahi hai\?/i.test(empty), empty);
  check('empty result asks for a plain yes', /haan bol dijiye/i.test(empty), empty);

  const fragment = await twilioTurn(callSid, 'The');
  check('fragment still gets a continuing Gather', fragment.includes('<Gather') && fragment.includes('<Redirect'), fragment);
  check('fragment does NOT replay the summary', !/Ek baar dekh lo|Sab sahi hai\?/i.test(fragment), fragment);

  check('reprompt turns do not submit', submits === 0, String(submits));
}

// ============================================================
startTest('H', 'Duplicate webhook is skipped — processTurn not called');
{
  const callSid = 'call-H';
  await driveToConfirming(callSid);
  const session = getSession(callSid);
  const turnsBefore = session.turns.length;
  const stateBefore = session.state;
  const productBefore = session.listing.product;

  const dup = await twilioTurn(callSid, 'Ghaziabad');
  check('duplicate gets a TwiML answer (never a dropped request)', dup.includes('<Gather') && dup.includes('<Redirect'), dup);
  check('duplicate does not push an agent turn (processTurn skipped)', getSession(callSid).turns.length === turnsBefore, `turns ${turnsBefore} → ${getSession(callSid).turns.length}`);
  check('duplicate leaves state and listing untouched', getSession(callSid).state === stateBefore && getSession(callSid).listing.product === productBefore, JSON.stringify({ state: getSession(callSid).state, product: getSession(callSid).listing.product }));
  check('duplicate does not submit', submits === 0, String(submits));

  // The canonical product echo must also be skipped.
  const turnsBefore2 = getSession(callSid).turns.length;
  await twilioTurn(callSid, 'Tomato');
  check('canonical product echo does not push an agent turn', getSession(callSid).turns.length === turnsBefore2, `turns ${turnsBefore2} → ${getSession(callSid).turns.length}`);

  // And the call still completes normally afterwards.
  const done = await twilioTurn(callSid, 'Han sab sahi hai');
  check('call still completes after duplicates', /<Say/.test(done) && done.includes('<Hangup') && submits === 1, JSON.stringify({ submits, twiml: done.slice(0, 120) }));
}

// ============================================================
startTest('I', 'TwiML shapes: continuing Gather+Redirect, terminal Say+Hangup');
{
  const callSid = 'call-I';
  const first = await twilioTurn(callSid, 'Namaste');
  check('continuing turn has Gather', first.includes('<Gather'), first);
  check('continuing turn has Redirect after Gather', first.includes('</Gather>') && first.includes('<Redirect'), first);
  check('Gather is never the last verb', !/<\/Gather>\s*<\/Response>\s*$/.test(first), first);
  check('Gather keeps speech input + actionOnEmptyResult', first.includes('input="speech"') && first.includes('actionOnEmptyResult="true"'), first);

  await driveToConfirming(callSid);
  const confirming = await twilioTurn(callSid, 'price');
  check('correction turn keeps Gather + Redirect', confirming.includes('<Gather') && confirming.includes('<Redirect') && !/<\/Gather>\s*<\/Response>\s*$/.test(confirming), confirming);

  const terminal = await twilioTurn(callSid, '30');
  const afterPrice = await twilioTurn(callSid, 'Han sab sahi hai');
  check('terminal turn has no Gather', !afterPrice.includes('<Gather'), afterPrice);
  check('terminal turn hangs up', afterPrice.includes('<Hangup'), afterPrice);
  check('terminal turn speaks the exact success message', afterPrice.includes(SUCCESS_MESSAGE), afterPrice);
  check('terminal turn created exactly one listing', submits === 1, String(submits));
  void terminal;
}

// ============================================================
// TEST J — real end-to-end against a throwaway API server --------------------
startTest('J', 'Twilio listing reaches GET /api/listings and the Producer Dashboard service');

let child = null;
let childOut = [];
const createdListingIds = [];

async function waitForHealth(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

// The browser reaches /api/listings through the Vite proxy; emulate that here
// so farmerInventoryService is exercised with its production URL.
const realFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (input, init) => {
  const url = typeof input === 'string' && input.startsWith('/')
    ? `http://localhost:${TEST_PORT}${input}`
    : input;
  return realFetch(url, init);
};

try {
  child = spawn(process.execPath, ['server/aiIntentApi.mjs'], {
    cwd: ROOT,
    env: { ...process.env, AI_INTENT_PORT: String(TEST_PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => childOut.push(String(d)));
  child.stderr.on('data', (d) => childOut.push(String(d)));

  const healthy = await waitForHealth(`http://localhost:${TEST_PORT}/health`);
  check('test API server came up on :8799', healthy, childOut.join('').slice(-500));

  if (healthy) {
    // Switch off the submit mock so the manager really POSTs the listing.
    setSubmitListingImpl(null);

    const sid = 'test-J';
    const final = await processTurn(sid, 'Namaste');
    void final;
    const drive = ['tamatar', 'Diya Raghav', 'Ghaziabad', '50 kilo', 'Grade A', '20 rupaye kilo', '9876543210'];
    let r = null;
    for (const t of drive) r = await processTurn(sid, t);
    check('drive reached CONFIRMING without the mock', r?.state === 'CONFIRMING', JSON.stringify({ state: r?.state, msg: r?.agent_message }));

    const done = await processTurn(sid, 'Haan sab sahi hai');
    check('real submission returns SUCCESS', done.state === 'SUCCESS' && !!done.listing_id, JSON.stringify({ state: done.state, id: done.listing_id, msg: done.agent_message }));
    check('exact success message on the real path', done.agent_message === SUCCESS_MESSAGE, done.agent_message);
    if (done.listing_id) createdListingIds.push(done.listing_id);

    // --- GET /api/listings ---
    const listRes = await realFetch(`http://localhost:${TEST_PORT}/api/listings`);
    const listBody = await listRes.json();
    const listed = Array.isArray(listBody?.listings) ? listBody.listings : [];
    check('GET /api/listings responds 200 with an array', listRes.status === 200 && Array.isArray(listed), JSON.stringify({ status: listRes.status, keys: Object.keys(listBody || {}) }));
    const mine = listed.filter((l) => l.listing_id === done.listing_id);
    check('the created listing appears exactly once', mine.length === 1, `count=${mine.length}`);
    check('stored payload keeps all 10 required keys', ['product', 'farmer_name', 'phone', 'quantity', 'unit', 'location', 'quality', 'asking_price', 'price_unit', 'intent'].every((k) => mine[0] && k in mine[0]), JSON.stringify(mine[0]));
    check('stored payload keeps the collected values', mine[0]?.product === 'Tomato' && mine[0]?.farmer_name === 'Diya Raghav' && mine[0]?.quantity === 50 && mine[0]?.asking_price === 20, JSON.stringify(mine[0]));

    // --- Producer Dashboard bridge ---
    const { farmerInventoryService } = await import('./src/services/farmerInventoryService.ts');
    const all = await farmerInventoryService.syncFromApi();
    const mineProduce = all.filter((p) => p.id === done.listing_id);
    check('dashboard service sees the Twilio listing', mineProduce.length === 1, `count=${mineProduce.length}`);

    const forFarmer = farmerInventoryService.getMyProduce('f-001');
    const shown = forFarmer.filter((p) => p.id === done.listing_id);
    check('getMyProduce("f-001") shows it (Producer Dashboard source)', shown.length === 1, `count=${shown.length}`);

    const p = shown[0];
    if (p) {
      check('mapped Produce has a usable quantityKg', p.quantityKg === 50, String(p.quantityKg));
      check('mapped Produce names the product', /Tomato/i.test(p.name || ''), p.name);
      check('raw voice fields survive on the mapped object', p.farmer_name === 'Diya Raghav' && p.phone === '9876543210', JSON.stringify({ farmer_name: p.farmer_name, phone: p.phone }));
      check('mapping is not duplicated by id', forFarmer.filter((x) => x.id === done.listing_id).length === 1);
    } else {
      check('mapped Produce has a usable quantityKg', false, 'listing missing');
      check('mapped Produce names the product', false, 'listing missing');
      check('raw voice fields survive on the mapped object', false, 'listing missing');
      check('mapping is not duplicated by id', false, 'listing missing');
    }

    // The bridge is read-only: re-syncing must not create anything.
    const before = listed.length;
    await farmerInventoryService.syncFromApi();
    const listRes2 = await realFetch(`http://localhost:${TEST_PORT}/api/listings`);
    const listBody2 = await listRes2.json();
    check('re-sync creates no duplicate listing', (listBody2?.listings?.length ?? -1) === before, `${before} → ${listBody2?.listings?.length}`);
  }
} catch (err) {
  check('TEST J ran without throwing', false, err?.stack || String(err));
} finally {
  // --- cleanup: remove test data from Firestore ---
  try {
    if (createdListingIds.length) {
      const { db } = await import('./server/firebase.mjs');
      if (db) {
        for (const id of createdListingIds) await db.collection('listings').doc(id).delete();
        realLog(`\n  [cleanup] deleted ${createdListingIds.length} test listing(s) from Firestore`);
      }
    }
  } catch (e) {
    realErr(`  [cleanup] failed to delete test listings: ${e?.message || e}`);
  }
  if (child) {
    child.kill();
    child = null;
  }
  globalThis.fetch = realFetch;
}

// ============================================================
// Summary ---------------------------------------------------------------------
realLog('\n================= SUMMARY =================');
let pass = 0;
let fail = 0;
for (const r of results) {
  pass += r.pass;
  fail += r.fail;
  realLog(`  ${r.id}: ${r.name} — ${r.pass} passed, ${r.fail} failed`);
}
realLog(`-------------------------------------------`);
realLog(`TEST A–J: ${pass} passed, ${fail} failed`);
realLog(`===========================================\n`);
process.exit(fail === 0 ? 0 : 1);
