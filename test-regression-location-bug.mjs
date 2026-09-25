import { processTurn, createSession } from './server/conversationManager.mjs';

let pass = 0, fail = 0;
function check(label, actual, expected) {
  if (actual === expected) { console.log('  PASS: '+label); pass++; }
  else { console.log('  FAIL: '+label+' — got "'+actual+'", expected "'+expected+'"'); fail++; }
}

console.log('=== REGRESSION: Name turn must not create location ===');
{
  const sid = 'reg-name';
  createSession(sid);
  await processTurn(sid, 'Aalu');
  // Force ask for name by setting state/last_asked (simulating flow)
  // ProcessTurn handles state transitions; instead use direct session manipulation if needed.
  // For simplicity: create session and manually set last_asked, then process "Tira"
  // But processTurn resets based on flow. Alternative: directly call extractTurnData logic not exported.
  // Instead verify via full flow up to name.
  const r = await processTurn(sid, 'Tira');
  check('name turn farmer_name', r.listing.farmer_name, 'Tira');
  check('name turn location (must NOT be Tira)', r.listing.location, null);
}

console.log('=== LOCATION TURN STILL WORKS ===');
{
  const sid = 'reg-loc';
  createSession(sid);
  await processTurn(sid, 'Ghaziabad');
  // Need to put session in location-asking state. ProcessTurn from idle may not ask location.
  // Instead, directly test with session.last_asked = 'location' using a minimal simulation.
  // We'll rely on extractTurnData behavior via a helper if available; since not exported easily,
  // we'll test using full flow: Aalu -> Tira -> 2 kg -> Ghaziabad -> Grade A -> 10 rupaye kilo
}

console.log('=== FULL FLOW ===');
{
  const sid = 'reg-flow';
  createSession(sid);
  let r = await processTurn(sid, 'Aalu'); check('flow product', r.listing.product, 'Aalu');
  r = await processTurn(sid, 'Tira'); check('flow name', r.listing.farmer_name, 'Tira'); check('flow name-no-loc', r.listing.location, null);
  r = await processTurn(sid, '2 kg'); check('flow qty', r.listing.quantity, 2);
  r = await processTurn(sid, 'Ghaziabad'); check('flow loc', r.listing.location, 'Ghaziabad');
  r = await processTurn(sid, 'Grade A'); check('flow quality', r.listing.quality, 'Grade A');
  r = await processTurn(sid, '10 rupaye kilo'); check('flow price', r.listing.asking_price, 10);
  check('flow name!=loc', r.listing.farmer_name !== r.listing.location, true);
}

console.log('\n=== SUMMARY ===');
console.log('PASS: '+pass+'  FAIL: '+fail);
process.exit(fail > 0 ? 1 : 0);
