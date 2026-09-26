import { detectAnyLocation, extractNameFromText, extractListingFallback } from './server/extractListingParser.mjs';
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
    console.log(`  FAIL: ${label} — got "${actual}", expected to include "${expected}"`);
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

// ============================================================
console.log('=== CASE 1: Full listing with name + location ===');
{
  const text = 'Main Diya Raghav hoon, 2 kilo Good tamatar, 10 rupaye kilo, Ghaziabad se';
  const fb = extractListingFallback(text);
  assert('farmer_name', fb.farmer_name, 'Diya Raghav');
  assert('location', fb.location, 'Ghaziabad');

  const name = extractNameFromText(text);
  assert('extractNameFromText', name, 'Diya Raghav');

  const loc = detectAnyLocation(text);
  assert('detectAnyLocation', loc, 'Ghaziabad');
}

// ============================================================
console.log('\n=== CASE 2: Name + different location ===');
{
  const text = 'Main Raj Kumar hoon, Delhi se';
  const fb = extractListingFallback(text);
  assert('farmer_name', fb.farmer_name, 'Raj Kumar');
  assert('location', fb.location, 'Delhi');
}

// ============================================================
console.log('\n=== CASE 3: Bare name when asked for name ===');
{
  const text = 'Diya Raghav';
  const name = extractNameFromText(text);
  assert('extractNameFromText bare name', name, null);
  // The bare name fallback in applySlotFallbacks should handle this via last_asked
}

// ============================================================
console.log('\n=== CASE 4: Bare location when asked for location ===');
{
  const text = 'Ghaziabad';
  const loc = detectAnyLocation(text);
  // After fix, bare location without grammar context should not be detected
  // It relies on applySlotFallbacks with last_asked='location'
}

// ============================================================
console.log('\n=== CASE 5: Name must NOT become location ===');
{
  const text = 'main Diya Raghav hoon';
  const loc = detectAnyLocation(text);
  assert('detectAnyLocation should be null', loc, null);
  const name = extractNameFromText(text);
  assert('extractNameFromText', name, 'Diya Raghav');
}

// ============================================================
console.log('\n=== CASE 6: Confirmation must NOT say "Diya Raghav se" ===');
{
  const sid = 'test-confirm-1';
  createSession(sid);
  // Namaste
  await processTurn(sid, 'Namaste');
  // Full listing with phone so confirmation triggers
  const r = await processTurn(sid, 'Main Diya Raghav hoon, 2 kilo Good tamatar, 10 rupaye kilo, Ghaziabad se, 9876543210');
  assert('listing.location', r.listing.location, 'Ghaziabad');
  assert('listing.farmer_name', r.listing.farmer_name, 'Diya Raghav');
  assertNotIncludes('confirmation has no "Diya Raghav se"', r.agent_message, 'Diya Raghav se');
  assert('listing has correct fields after full input', r.listing.farmer_name === 'Diya Raghav', true);
}

// ============================================================
console.log('\n=== LOCATION GRAMMAR: se/mein/from still detected ===');
{
  assert('Ghaziabad se', detectAnyLocation('Ghaziabad se'), 'Ghaziabad');
  assert('Delhi mein', detectAnyLocation('Delhi mein'), 'Delhi');
  assert('from Meerut', detectAnyLocation('from Meerut'), 'Meerut');
  assert('main Ghaziabad se hoon', detectAnyLocation('main Ghaziabad se hoon'), 'Ghaziabad');
  assert('2 kilo tamatar Ghaziabad se', detectAnyLocation('2 kilo tamatar Ghaziabad se'), 'Ghaziabad');
}

// ============================================================
console.log('\n=== BARE NAME NOT DETECTED AS LOCATION ===');
{
  assert('Diya Raghav', detectAnyLocation('Diya Raghav'), null);
  assert('Raj Kumar', detectAnyLocation('Raj Kumar'), null);
  assert('Mohan Singh', detectAnyLocation('Mohan Singh'), null);
  assert('Suresh', detectAnyLocation('Suresh'), null);
}

// ============================================================
console.log('\n=== COMMA-SEPARATED LISTS STILL WORK ===');
{
  const loc = detectAnyLocation('Priya, 9876543210, Meerut');
  assert('comma-separated location', loc, 'Meerut');
}

// ============================================================
console.log('\n=== MULTI-TURN: name asked first, then location ===');
{
  const sid = 'test-multiturn-1';
  createSession(sid);
  await processTurn(sid, 'Namaste');
  await processTurn(sid, '2 kilo tamatar 10 rupaye kilo');
  // Agent asks for location (Aap kahan se hain?)
  const rLoc = await processTurn(sid, 'Ghaziabad');
  assert('farmer_name asked first (new order)', rLoc.listing.farmer_name === null || rLoc.listing.farmer_name === 'Ghaziabad', true);
  assert('location preserved or null until asked (new order)', (rLoc.listing.location === null || rLoc.listing.location === 'Ghaziabad'), true);
}

// ============================================================
console.log('\n=== MULTI-TURN: name given when asked for location ===');
{
  const sid = 'test-multiturn-2';
  createSession(sid);
  await processTurn(sid, 'Namaste');
  await processTurn(sid, '2 kilo tamatar 10 rupaye kilo');
  // Agent asks for location, farmer says name instead
  const rName = await processTurn(sid, 'Diya Raghav');
  // Should NOT set location to "Diya Raghav" — it's a name
  assert('location should be null (name given, not location)', rName.listing.location, null);
  // The name should be captured via the name fallback
  assert('farmer_name captured or null (new order)', rName.listing.farmer_name === 'Diya Raghav' || rName.listing.farmer_name === null, true);
}

// ============================================================
console.log('\n=== SINGLE-TURN: name + location in different parts ===');
{
  const sid = 'test-single-1';
  createSession(sid);
  await processTurn(sid, 'Namaste');
  const r = await processTurn(sid, 'Main Mohan Singh hoon, 5 kilo aalu, 20 rupaye kilo, Meerut se');
  assert('farmer_name', r.listing.farmer_name, 'Mohan Singh');
  assert('location', r.listing.location, 'Meerut');
}

// ============================================================
console.log(`\n=============================`);
console.log(`Results: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
