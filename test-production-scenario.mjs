import { processTurn } from './server/conversationManager.mjs';

console.log('=== Testing production scenario ===\n');

// Test 1: Name persistence with Raghav
console.log('Test 1: Farmer provides name "Raghav" directly\n');
const sid1 = 'raghav-test-1';

// First turn: Just basic info
let r1 = await processTurn(sid1, '5 kilo tamatar bechna hai');
console.log('Turn 1 - After initial message:');
console.log('  State:', r1.state);
console.log('  Product:', r1.listing?.product);
console.log('  Quantity:', r1.listing?.quantity);
console.log('  Name:', r1.listing?.farmer_name);
console.log('  Missing fields:', r1.missing_fields);
console.log('  Response:', r1.response?.substring(0, 50) + '...\n');

// Second turn: User provides name only
r1 = await processTurn(sid1, 'Raghav');
console.log('Turn 2 - After user says "Raghav":');
console.log('  State:', r1.state);
console.log('  Name:', r1.listing?.farmer_name);
console.log('  Product:', r1.listing?.product);
console.log('  Missing fields:', r1.missing_fields);
console.log('  Response:', r1.response?.substring(0, 50) + '...\n');

// Test 2: Multi-turn persistence
console.log('\nTest 2: Multi-turn persistence with name "Priya"\n');
const sid2 = 'priya-test-2';

r1 = await processTurn(sid2, 'I have 500 kg tomatoes');
console.log('Turn 1 - After saying "500 kg tomatoes":');
console.log('  Product:', r1.listing?.product);
console.log('  Quantity:', r1.listing?.quantity);
console.log('  Name:', r1.listing?.farmer_name);
console.log('  Missing:', r1.missing_fields?.join(', ') + '\n');

r1 = await processTurn(sid2, 'Priya');
console.log('Turn 2 - After saying "Priya":');
console.log('  Name:', r1.listing?.farmer_name);
console.log('  Product:', r1.listing?.product, '(should be Tomato)');
console.log('  Quantity:', r1.listing?.quantity, '(should be 500)');
console.log('  Missing:', r1.missing_fields?.join(', ') + '\n');

r1 = await processTurn(sid2, '9876543210');
console.log('Turn 3 - After providing phone:');
console.log('  Phone:', r1.listing?.phone);
console.log('  Name:', r1.listing?.farmer_name, '(should still be Priya)');
console.log('  Missing:', r1.missing_fields?.join(', ') + '\n');

// Test 3: Confirm name is NOT extracted as product
console.log('\nTest 3: Verify proper names are NOT extracted as products\n');
const { extractListingFallback } = await import('./server/extractListingParser.mjs');

const testInputs = [
  'Raghav',
  'mera naam Raghav hai aur 5 kilo tamatar bechna hai',
  'Priya 10 kilo wheat',
  'I am Abhishek selling 500 kg rice',
];

testInputs.forEach(input => {
  const extracted = extractListingFallback(input);
  console.log(`Input: "${input}"`);
  console.log(`  Farmer name: ${extracted.farmer_name}`);
  console.log(`  Product: ${extracted.product}`);
  console.log('');
});

console.log('=== All tests completed ===');
