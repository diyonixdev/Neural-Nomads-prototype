import { processTurn, createSession } from './server/conversationManager.mjs';

let pass = 0;
let fail = 0;

function assert(label, actual, expected) {
  if (actual === expected) {
    console.log(`  PASS: ${label}`);
    pass++;
  } else {
    console.log(`  FAIL: ${label} — got "${actual}", expected "${expected}"`);
    fail++;
  }
}

function assertIncludes(label, actual, expected) {
  if (actual && actual.includes(expected)) {
    console.log(`  PASS: ${label}`);
    pass++;
  } else {
    console.log(`  FAIL: ${label} — got "${JSON.stringify(actual)}", expected to include "${expected}"`);
    fail++;
  }
}

function assertNotIncludes(label, actual, unexpected) {
  if (!actual || !actual.includes(unexpected)) {
    console.log(`  PASS: ${label}`);
    pass++;
  } else {
    console.log(`  FAIL: ${label} — got "${actual}", should NOT include "${unexpected}"`);
    fail++;
  }
}

// Helper: set up a complete listing ready for confirmation
async function setupCompleteListing(sessionId) {
  createSession(sessionId);
  await processTurn(sessionId, 'Namaste');
  await processTurn(sessionId, 'Main Diya Raghav hoon, 2 kilo tamatar, 10 rupaye kilo, Ghaziabad se, 9876543210');
}

// ============================================================
console.log('=== PATH 1: haan → Kuch badalna hai? → nahi → submit ===');
{
  const sid = 'test-path-1';
  await setupCompleteListing(sid);

  // Turn: confirmation message should be shown
  // Now farmer says "haan"
  const r1 = await processTurn(sid, 'haan');
  assert('Stage 1: asks Kuch badalna hai?', r1.agent_message, 'Kuch badalna hai?');
  assert('Stage 1: still CONFIRMING', r1.state, 'CONFIRMING');
  assert('Stage 1: listing preserved', r1.listing.farmer_name, 'Diya Raghav');

  // Farmer says "nahi"
  const r2 = await processTurn(sid, 'nahi');
  assert('Stage 2: submits listing', r2.state, 'SUCCESS');
  assert('Stage 2: listing_id present', r2.listing_id != null, true);
}

// ============================================================
console.log('\n=== PATH 2: haan → Kuch badalna hai? → haan → correction flow ===');
{
  const sid = 'test-path-2';
  await setupCompleteListing(sid);

  // Farmer says "haan"
  const r1 = await processTurn(sid, 'haan');
  assert('Stage 1: asks Kuch badalna hai?', r1.agent_message, 'Kuch badalna hai?');

  // Farmer says "haan" (yes, I want to change something)
  const r2 = await processTurn(sid, 'haan');
  assert('Stage 2: enters correction flow', r2.state, 'ASKING');
  // Should ask what to change
  assertIncludes('Stage 2: asks what to change', r2.agent_message, 'badalna');

  // Farmer says "price" — change the price
  const r3 = await processTurn(sid, '15');
  // After correction, should re-confirm
  assert('After correction: re-confirms', r3.state, 'CONFIRMING');
  assertIncludes('After correction: shows updated confirmation', r3.agent_message, 'pandrah rupaye');
}

// ============================================================
console.log('\n=== PATH 3: theek hai → Kuch badalna hai? → nahi → submit ===');
{
  const sid = 'test-path-3';
  await setupCompleteListing(sid);

  // Farmer says "theek hai"
  const r1 = await processTurn(sid, 'theek hai');
  assert('Stage 1: asks Kuch badalna hai?', r1.agent_message, 'Kuch badalna hai?');

  // Farmer says "nahi"
  const r2 = await processTurn(sid, 'nahi');
  assert('Stage 2: submits listing', r2.state, 'SUCCESS');
}

// ============================================================
console.log('\n=== PATH 4: haan → Kuch badalna hai? → nahi sab theek hai → submit ===');
{
  const sid = 'test-path-4';
  await setupCompleteListing(sid);

  // Farmer says "haan"
  const r1 = await processTurn(sid, 'haan');
  assert('Stage 1: asks Kuch badalna hai?', r1.agent_message, 'Kuch badalna hai?');

  // Farmer says "nahi sab theek hai"
  const r2 = await processTurn(sid, 'nahi sab theek hai');
  assert('Stage 2: submits listing', r2.state, 'SUCCESS');
}

// ============================================================
console.log('\n=== PATH 5: haan → Kuch badalna hai? → haan, price change → correction ===');
{
  const sid = 'test-path-5';
  await setupCompleteListing(sid);

  // Farmer says "haan"
  const r1 = await processTurn(sid, 'haan');
  assert('Stage 1: asks Kuch badalna hai?', r1.agent_message, 'Kuch badalna hai?');

  // Farmer says "haan, price change" — wants to change price
  const r2 = await processTurn(sid, 'haan, price change');
  assert('Stage 2: enters correction flow', r2.state, 'ASKING');

  // Farmer gives new price
  const r3 = await processTurn(sid, '25');
  assert('After correction: re-confirms', r3.state, 'CONFIRMING');
  assertIncludes('After correction: updated price in confirmation', r3.agent_message, 'pachees rupaye');
}

// ============================================================
console.log('\n=== PATH 6: haan → Kuch badalna hai? → haan → haan → correction ===');
{
  const sid = 'test-path-6';
  await setupCompleteListing(sid);

  // Farmer says "haan"
  const r1 = await processTurn(sid, 'haan');
  assert('Stage 1: asks Kuch badalna hai?', r1.agent_message, 'Kuch badalna hai?');

  // Farmer says "haan" (yes, want to change) but doesn't specify what
  const r2 = await processTurn(sid, 'haan');
  assert('Stage 2: asks what to change', r2.state, 'ASKING');
  assertIncludes('Stage 2: asks what to change', r2.agent_message, 'badalna');

  // Farmer says "quantity"
  const r3 = await processTurn(sid, '5');
  assert('After correction: re-confirms', r3.state, 'CONFIRMING');
  assertIncludes('After correction: updated quantity', r3.agent_message, 'paanch kilo');
}

// ============================================================
console.log('\n=== PATH 7: haan → Kuch badalna hai? → cancel → cancelled ===');
{
  const sid = 'test-path-7';
  await setupCompleteListing(sid);

  // Farmer says "haan"
  const r1 = await processTurn(sid, 'haan');
  assert('Stage 1: asks Kuch badalna hai?', r1.agent_message, 'Kuch badalna hai?');

  // Farmer says "cancel"
  const r2 = await processTurn(sid, 'cancel');
  assert('Stage 2: cancels listing', r2.state, 'CANCELLED');
}

// ============================================================
console.log('\n=== BARE NAHI AT STAGE 1 → ASKS Kuch badalna hai? ===');
{
  const sid = 'test-bare-nahi';
  await setupCompleteListing(sid);

  // Farmer says "nahi" directly (without first saying "haan")
  const r1 = await processTurn(sid, 'nahi');
  // Should ask "Kuch badalna hai?" instead of submitting
  assert('Bare nahi: asks Kuch badalna hai?', r1.agent_message, 'Kuch badalna hai?');
  assert('Bare nahi: still CONFIRMING', r1.state, 'CONFIRMING');

  // Now farmer says "nahi" again
  const r2 = await processTurn(sid, 'nahi');
  assert('Second nahi: submits listing', r2.state, 'SUCCESS');
}

// ============================================================
console.log(`\n=============================`);
console.log(`Results: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
