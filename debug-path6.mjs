import { processTurn, createSession, getSession } from './server/conversationManager.mjs';

async function trace(sid, label, text) {
  const r = await processTurn(sid, text);
  const s = getSession(sid);
  console.log(`[${label}] state=${s.state} stage=${s.confirmation_stage} last_asked=${s.last_asked} last_echo=${s.last_echo_field}`);
  console.log(`  agent: ${r.agent_message}`);
  console.log(`  listing qty=${s.listing.quantity} price=${s.listing.asking_price}`);
  return r;
}

console.log('=== PATH 6 TRACE ===');
const sid = 'trace-path6';
createSession(sid);
await trace(sid, 'setup', 'Main Diya Raghav hoon, 2 kilo tamatar, 10 rupaye kilo, Ghaziabad se, 9876543210.');
await trace(sid, 'haan1', 'haan');
await trace(sid, 'haan2', 'haan');
await trace(sid, 'five', '5');

console.log('\n=== PATH 2 TRACE ===');
const sid2 = 'trace-path2';
createSession(sid2);
await trace(sid2, 'setup', 'Main Diya Raghav hoon, 2 kilo tamatar, 10 rupaye kilo, Ghaziabad se, 9876543210.');
await trace(sid2, 'haan1', 'haan');
await trace(sid2, 'haan2', 'haan');
await trace(sid2, 'fifteen', '15');
