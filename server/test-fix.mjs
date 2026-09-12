// Test script to verify the voice fix - simulating exact bug scenario
import { processTurn, createSession, getSession, STATES } from './conversationManager.mjs';

async function runTest() {
  console.log('=== TESTING VOICE FIX ===\n');

  // Test 1: Farmer says their name first
  console.log('TEST 1: Farmer says "Mera naam Diya Raghav hai"');
  const session1 = createSession('test-session-1');
  const result1 = await processTurn('test-session-1', 'Mera naam Diya Raghav hai');
  console.log('State:', result1.state);
  console.log('Agent message:', result1.agent_message);
  console.log('Listing:', JSON.stringify(result1.listing));
  console.log('Next field asked:', result1.next_field);
  console.log('Missing fields:', result1.missing_fields);
  console.log('');

  // Test 2: Farmer says product - should NOT ask for name again
  console.log('TEST 2: Farmer says "500 kilo Grade A tamatar"');
  const result2 = await processTurn('test-session-1', '500 kilo Grade A tamatar');
  console.log('State:', result2.state);
  console.log('Agent message:', result2.agent_message);
  console.log('Listing:', JSON.stringify(result2.listing));
  console.log('Next field asked:', result2.next_field);
  console.log('Missing fields:', result2.missing_fields);
  console.log('');

  // Check: Did we get the correct state?
  const finalListing = result2.listing;
  console.log('=== VERIFICATION ===');
  console.log('farmer_name:', finalListing.farmer_name);
  console.log('product:', finalListing.product);
  console.log('quantity:', finalListing.quantity);
  console.log('unit:', finalListing.unit);
  console.log('quality:', finalListing.quality);

  if (finalListing.farmer_name === 'Diya Raghav') {
    console.log('\n✅ PASS: Name correctly preserved as "Diya Raghav"');
  } else {
    console.log('\n❌ FAIL: Name was lost or incorrect');
  }

  if (finalListing.product === 'Tomato') {
    console.log('✅ PASS: Product correctly extracted as "Tomato"');
  } else {
    console.log('❌ FAIL: Product not correctly extracted');
  }

  if (finalListing.quantity === 500) {
    console.log('✅ PASS: Quantity correctly extracted as 500');
  } else {
    console.log('❌ FAIL: Quantity not correctly extracted');
  }

  // Check if the agent asked for name again (this was the BUG)
  if (result2.agent_message && result2.agent_message.includes('naam')) {
    console.log('\n❌ BUG: Agent asked for name again even though it was already provided!');
  } else {
    console.log('\n✅ FIXED: Agent did NOT ask for name again');
  }

  // Test 3: Combined input - name + product in one turn
  console.log('\n=== TEST 3: Combined input ===');
  const session3 = createSession('test-session-3');
  const result3 = await processTurn('test-session-3', 'Mera naam Priya hai aur main 200 kilo pyaz bechna chahti hoon');
  console.log('Agent message:', result3.agent_message);
  console.log('Listing:', JSON.stringify(result3.listing));
  console.log('');

  // Test 4: English input
  console.log('=== TEST 4: English input ===');
  const session4 = createSession('test-session-4');
  const result4 = await processTurn('test-session-4', 'My name is Amit. I want to sell 100 kg wheat.');
  console.log('Agent message:', result4.agent_message);
  console.log('Listing:', JSON.stringify(result4.listing));
}

runTest().catch(console.error);