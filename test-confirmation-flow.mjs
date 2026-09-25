import { processTurn, createSession, setSubmitListingImpl } from './server/conversationManager.mjs';
import { sendConversationTurn } from './src/services/conversationManager.ts';

// Mock submitListing so tests don't need a running HTTP server
setSubmitListingImpl(async (listing) => ({
  success: true,
  listing_id: 'mock-listing-id-' + Date.now(),
  status: 'active',
}));

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
console.log('\n=== PATH 2: haan → Kuch badalna hai? → haan → price → 15 ===');
{
  const sid = 'test-path-2';
  await setupCompleteListing(sid);

  // Farmer says "haan"
  const r1 = await processTurn(sid, 'haan');
  assert('Stage 1: asks Kuch badalna hai?', r1.agent_message, 'Kuch badalna hai?');

  // Farmer says "haan" (yes, I want to change something)
  const r2 = await processTurn(sid, 'haan');
  assert('Stage 2: asks which field', r2.state, 'CONFIRMING');
  assertIncludes('Stage 2: asks what to change', r2.agent_message, 'badalna');

  // Farmer says "price" — select field to change
  const r3 = await processTurn(sid, 'price');
  assert('Stage 3: asks new price', r3.state, 'CONFIRMING');
  assertIncludes('Stage 3: asks for price', r3.agent_message, 'rupaye');

  // Farmer gives new price
  const r4 = await processTurn(sid, '15');
  // After correction, should re-confirm
  assert('After correction: re-confirms', r4.state, 'CONFIRMING');
  assertIncludes('After correction: shows updated confirmation', r4.agent_message, 'pandrah rupaye');
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
  assert('Stage 2: asks which field', r2.state, 'CONFIRMING');
  assertIncludes('Stage 2: asks what to change', r2.agent_message, 'badalna');

  // Farmer says "quantity" — select field to change
  const r3 = await processTurn(sid, 'quantity');
  assert('Stage 3: asks new quantity', r3.state, 'CONFIRMING');
  assertIncludes('Stage 3: asks for quantity', r3.agent_message, 'bechna');

  // Farmer gives new quantity
  const r4 = await processTurn(sid, '5');
  assert('After correction: re-confirms', r4.state, 'CONFIRMING');
  assertIncludes('After correction: updated quantity', r4.agent_message, 'paanch kilo');
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
  assertIncludes('1. Asks how much', r1.agent_message, 'kitna');
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
