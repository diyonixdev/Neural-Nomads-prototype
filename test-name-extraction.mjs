import { extractNameFromText, extractListingFallback } from './server/extractListingParser.mjs';

console.log('Testing name extraction:');

const testCases = [
  'Raghav',
  'raghav',
  'I am Raghav',
  'mera naam Raghav hai',
  'Priya',
  'John',
  'Hello',
  'Hi',
  'Okay',
  'Dhanyavaad',
];

testCases.forEach(text => {
  const name = extractNameFromText(text);
  console.log(`Input: "${text}" → Name: ${name}`);
});

console.log('\nTesting full extraction with "Raghav":');
const result = extractListingFallback('Raghav');
console.log('Product:', result.product);
console.log('Farmer name:', result.farmer_name);

console.log('\nTesting full listing extraction:');
const result2 = extractListingFallback('I need 500 kg Grade A tomatoes in Ghaziabad');
console.log(result2);
