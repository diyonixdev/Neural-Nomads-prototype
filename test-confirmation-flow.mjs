import { processTurn, createSession, setSubmitListingImpl } from './server/conversationManager.mjs';
import { sendConversationTurn } from './src/services/conversationManager.ts';

// Mock submitListing so tests don't need a running HTTP server.
// submitCount proves the listing is created EXACTLY once per confirmation.
let submitCount = 0;
setSubmitListingImpl(async (listing) => {
  submitCount++;
  return {
    success: true,
    listing_id: 'mock-listing-id-' + submitCount,
    status: 'active',
  };
});

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

// Helper: set up a complete listing ready for confirmation.
// Strict field order: product → name → location → quantity → quality → price → phone.
async function setupCompleteListing(sessionId) {
  createSession(sessionId);
  await processTurn(sessionId, 'Namaste');
  await processTurn(sessionId, 'tamatar');
  await processTurn(sessionId, 'Diya Raghav');
  await processTurn(sessionId, 'Ghaziabad');
  await processTurn(sessionId, '2 kilo');
  await processTurn(sessionId, 'Grade A');
  await processTurn(sessionId, '10 rupaye kilo');
  const r = await processTurn(sessionId, '9876543210');
  if (r.state !== 'CONFIRMING') {
    throw new Error('setup did not reach CONFIRMING: state=' + r.state + ' missing=' + JSON.stringify(r.missing_fields) + ' msg=' + r.agent_message);
  }
  submitCount = 0;
  return r;
}

// ============================================================
console.log('=== PATH 1: haan → submit immediately (single-stage) ===');
{
  const sid = 'test-path-1';
  await setupCompleteListing(sid);

  const r1 = await processTurn(sid, 'haan');
  assert('Single-stage: first haan submits', r1.state, 'SUCCESS');
  assert('Single-stage: listing_id present', r1.listing_id != null, true);
  assert('Single-stage: created exactly once', submitCount, 1);
  assertIncludes('Single-stage: success message', r1.agent_message, 'Aapki listing ho gayi. FarmDirect se dhanyawaad!');
  assert('Single-stage: listing preserved', r1.listing.farmer_name, 'Diya Raghav');
  assertNotIncludes('Single-stage: no second prompt', r1.agent_message, 'Kuch badalna hai');
}

// ============================================================
console.log('\n=== PATH 2: nahi → Kya badalna hai ji? → price → 15 → haan → submit ===');
{
  const sid = 'test-path-2';
  await setupCompleteListing(sid);

  const r1 = await processTurn(sid, 'nahi');
  assert('Correction: asks what to change', r1.agent_message, 'Kya badalna hai ji?');
  assert('Correction: still CONFIRMING', r1.state, 'CONFIRMING');
  assert('Correction: not submitted yet', submitCount, 0);

  const r2 = await processTurn(sid, 'price');
  assert('Correction: field selected', r2.state, 'CONFIRMING');
  assertIncludes('Correction: asks new price', r2.agent_message, 'rupaye');

  const r3 = await processTurn(sid, '15');
  assert('After correction: re-confirms', r3.state, 'CONFIRMING');
  assertIncludes('After correction: updated confirmation', r3.agent_message, 'pandrah rupaye');
  assert('After correction: still not submitted', submitCount, 0);

  const r4 = await processTurn(sid, 'haan');
  assert('Final haan: submits', r4.state, 'SUCCESS');
  assert('Final haan: created exactly once', submitCount, 1);
  assert('Final haan: new price stored', r4.listing.asking_price, 15);
}

// ============================================================
console.log('\n=== PATH 3: theek hai → submit immediately ===');
{
  const sid = 'test-path-3';
  await setupCompleteListing(sid);

  const r1 = await processTurn(sid, 'theek hai');
  assert('theek hai: submits', r1.state, 'SUCCESS');
  assert('theek hai: created exactly once', submitCount, 1);
}

// ============================================================
console.log('\n=== PATH 4: nahi sab theek hai → submit (nothing to change) ===');
{
  const sid = 'test-path-4';
  await setupCompleteListing(sid);

  const r1 = await processTurn(sid, 'nahi sab theek hai');
  assert('nahi sab theek hai: submits', r1.state, 'SUCCESS');
  assert('nahi sab theek hai: created exactly once', submitCount, 1);
}

// ============================================================
console.log('\n=== PATH 5: haan, price change → correction → 25 → haan → submit ===');
{
  const sid = 'test-path-5';
  await setupCompleteListing(sid);

  const r1 = await processTurn(sid, 'haan, price change');
  assert('Price change: enters correction flow', r1.state, 'CONFIRMING');
  assertIncludes('Price change: asks new price', r1.agent_message, 'rupaye');
  assert('Price change: not submitted yet', submitCount, 0);

  const r2 = await processTurn(sid, '25');
  assert('After correction: re-confirms', r2.state, 'CONFIRMING');
  assertIncludes('After correction: updated price in confirmation', r2.agent_message, 'pachees rupaye');

  const r3 = await processTurn(sid, 'haan');
  assert('Final haan: submits', r3.state, 'SUCCESS');
  assert('Final haan: created exactly once', submitCount, 1);
}

// ============================================================
console.log('\n=== PATH 6: nahi → quantity → 5 → haan → submit ===');
{
  const sid = 'test-path-6';
  await setupCompleteListing(sid);

  const r1 = await processTurn(sid, 'nahi');
  assert('Quantity change: asks what to change', r1.agent_message, 'Kya badalna hai ji?');

  const r2 = await processTurn(sid, 'quantity');
  assert('Quantity change: asks new quantity', r2.state, 'CONFIRMING');
  assertIncludes('Quantity change: asks how much', r2.agent_message, 'bechna');

  const r3 = await processTurn(sid, '5');
  assert('After correction: re-confirms', r3.state, 'CONFIRMING');
  assertIncludes('After correction: updated quantity', r3.agent_message, 'paanch kilo');

  const r4 = await processTurn(sid, 'haan');
  assert('Final haan: submits', r4.state, 'SUCCESS');
  assert('Final haan: created exactly once', submitCount, 1);
}

// ============================================================
console.log('\n=== PATH 7: cancel → cancelled (never submitted) ===');
{
  const sid = 'test-path-7';
  await setupCompleteListing(sid);

  const r1 = await processTurn(sid, 'cancel');
  assert('cancel: cancels listing', r1.state, 'CANCELLED');
  assert('cancel: never submitted', submitCount, 0);
}

// ============================================================
console.log('\n=== BARE NAHI → Kya badalna hai ji? → (nahi again → summary) → sab theek hai → submit ===');
{
  const sid = 'test-bare-nahi';
  await setupCompleteListing(sid);

  const r1 = await processTurn(sid, 'nahi');
  assert('Bare nahi: asks Kya badalna hai ji?', r1.agent_message, 'Kya badalna hai ji?');
  assert('Bare nahi: still CONFIRMING', r1.state, 'CONFIRMING');
  assert('Bare nahi: not submitted', submitCount, 0);

  const r2 = await processTurn(sid, 'nahi');
  assert('Second nahi: back to summary', r2.state, 'CONFIRMING');
  assertIncludes('Second nahi: summary shown', r2.agent_message, 'Sab sahi hai');
  assert('Second nahi: still not submitted', submitCount, 0);

  const r3 = await processTurn(sid, 'sab theek hai');
  assert('sab theek hai: submits', r3.state, 'SUCCESS');
  assert('sab theek hai: created exactly once', submitCount, 1);
}

// ============================================================
console.log('\n=== REGRESSION: greeting in non-IDLE state (client-side) ===');
{
  // Use the CLIENT-SIDE conversation manager directly — this is the actual
  // runtime path used by VoiceAssistant.tsx
  const sid = 'test-client-greeting-' + Date.now();

  // Start conversation: greeting moves session to LISTENING
  const r0 = await sendConversationTurn(sid, 'Namaste');
  assertIncludes('IDLE greeting: still works', r0.agent_message, 'FarmDirect se bol raha hoon');

  // Provide product — session moves to ASKING
  const r1 = await sendConversationTurn(sid, '10 kilo tamatar');
  assert('After tamatar: ASKING', r1.state, 'ASKING');

  // Say "Namaste" while session is in ASKING state (non-IDLE)
  const r2 = await sendConversationTurn(sid, 'Namaste');
  assertIncludes('ASKING Namaste: natural response', r2.agent_message, 'FarmDirect se bol raha hoon');
  assertNotIncludes('ASKING Namaste: no Maaf kijiye', r2.agent_message, 'Maaf kijiye');

  // Also test "Hello" mid-conversation
  const r3 = await sendConversationTurn(sid, 'Hello');
  assertIncludes('ASKING Hello: natural response', r3.agent_message, 'FarmDirect se bol raha hoon');
  assertNotIncludes('ASKING Hello: no Maaf kijiye', r3.agent_message, 'Maaf kijiye');

  // Also test Hindi greeting
  const r4 = await sendConversationTurn(sid, 'नमस्ते');
  assertIncludes('ASKING Hindi greeting: natural response', r4.agent_message, 'FarmDirect se bol raha hoon');

  // Non-greeting unusable input during ASKING should still produce a re-ask
  const r5 = await sendConversationTurn(sid, 'xyzabc');
  assertNotIncludes('Non-greeting: no FarmDirect', r5.agent_message, 'FarmDirect se bol raha hoon');
}

// ============================================================
console.log('\n=== REGRESSION: product-question generation ===');
{
  // 1. "Aalu" as full sentence → asks for quantity using the product name
  const sid1 = 'test-prodq-' + Date.now();
  await sendConversationTurn(sid1, 'Namaste');
  const r1 = await sendConversationTurn(sid1, 'Main aalu bechna chahta hoon');
  assertIncludes('1. Asks for quantity with product name', r1.agent_message.toLowerCase(), 'aalu');
  // Strict order is product → name, so the next question is the name question.
  assertIncludes('1. Asks for name next', r1.agent_message, 'naam kya hai');
  assert('1. Product is stored', r1.listing.product, 'Aalu');

  // 2. "Aalu" then "2 kilo" → quantity stored, product NOT re-asked
  const r2 = await sendConversationTurn(sid1, '2 kilo');
  assert('2. Quantity stored', r2.listing.quantity, 2);
  assert('2. Product preserved', r2.listing.product, 'Aalu');
  assertNotIncludes('2. Does not ask for product again', r2.agent_message, 'kya bechna');

  // 3. "Tamatar" → asks dynamically with product name
  const sid2 = 'test-prodq-tamatar-' + Date.now();
  await sendConversationTurn(sid2, 'Namaste');
  const r3 = await sendConversationTurn(sid2, 'Main tamatar bechna chahta hoon');
  assertIncludes('3. Tamatar: asks with product name', r3.agent_message.toLowerCase(), 'tamatar');

  // 4. "Aalu 2 kilo" in one turn → does not ask for quantity
  const sid3 = 'test-prodq-combo-' + Date.now();
  await sendConversationTurn(sid3, 'Namaste');
  const r4 = await sendConversationTurn(sid3, 'aalu 2 kilo');
  assert('4. Product extracted', r4.listing.product, 'Aalu');
  assert('4. Quantity extracted', r4.listing.quantity, 2);
  assert('4. Next field is not quantity', r4.next_field !== 'quantity', true);

  // 5. "2 kilo" after product known → updates quantity, moves to next field
  const sid4 = 'test-prodq-next-' + Date.now();
  await sendConversationTurn(sid4, 'Namaste');
  await sendConversationTurn(sid4, 'Main tamatar bechna chahta hoon');
  const r5 = await sendConversationTurn(sid4, '2 kilo');
  assert('5. Quantity stored', r5.listing.quantity, 2);
  assert('5. Product preserved', r5.listing.product, 'Tomato');
  assert('5. Moves to next field (not quantity)', r5.next_field !== 'quantity', true);

  // 6. Unrecognized input still uses existing fallback
  const sid5 = 'test-prodq-unknown-' + Date.now();
  await sendConversationTurn(sid5, 'Namaste');
  const r6 = await sendConversationTurn(sid5, 'xyzabc');
  assertIncludes('6. Unknown input: re-asks', r6.agent_message, 'kya bechna');
}

// ============================================================
console.log(`\n=============================`);
console.log(`Results: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
