// Mock fetch before importing
let listingIdCounter = 1000;
globalThis.fetch = async (url, options) => {
  if (url.includes('/api/listings')) {
    // Mock successful submission
    const listing_id = `ls-${listingIdCounter++}`;
    return {
      status: 201,
      json: async () => ({
        success: true,
        listing_id,
        data: JSON.parse(options.body)
      })
    };
  }
  throw new Error(`Unexpected fetch call to ${url}`);
};

import { processTurn } from './server/conversationManager.mjs';

const test = async () => {
  // Set up a complete listing first
  const sid = 'debug-test';
  
  // Step 1: Provide name
  const r1 = await processTurn(sid, 'Main Ramesh hoon');
  console.log('After name:', { state: r1.state, missing: r1.missing_fields });
  
  // Step 2: Provide phone
  const r2 = await processTurn(sid, '9876543210');
  console.log('After phone:', { state: r2.state, missing: r2.missing_fields });
  
  // Step 3: Provide location
  const r3 = await processTurn(sid, 'Ghaziabad');
  console.log('After location:', { state: r3.state, missing: r3.missing_fields });
  
  // Step 4: Provide product
  const r4 = await processTurn(sid, 'tamatar');
  console.log('After product:', { state: r4.state, missing: r4.missing_fields });
  
  // Step 5: Provide quantity
  const r5 = await processTurn(sid, '500 kilo');
  console.log('After quantity:', { state: r5.state, missing: r5.missing_fields });
  
  // Step 6: Provide price
  const r6 = await processTurn(sid, '30 rupaye kilo');
  console.log('After price:', { state: r6.state, missing: r6.missing_fields });
  
  // Step 7: Should be in CONFIRMING, try "Nahi"
  console.log('Before Nahi:', { state: r6.state });
  const r7 = await processTurn(sid, 'Nahi');
  console.log('After Nahi:', { state: r7.state, agent_message: r7.agent_message?.substring(0, 100) });
};

test().catch(console.error);
