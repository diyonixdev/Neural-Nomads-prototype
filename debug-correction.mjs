// Mock fetch before importing
let listingIdCounter = 1000;
globalThis.fetch = async (url, options) => {
  if (url.includes('/api/listings')) {
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
  const sid = 'debug-correction';
  
  // First turn
  console.log('=== TURN 1 ===');
  const r1 = await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
  console.log('State:', r1.state);
  console.log('Listing:', {
    farmer_name: r1.listing.farmer_name,
    quantity: r1.listing.quantity,
    product: r1.listing.product,
    location: r1.listing.location,
    phone: r1.listing.phone,
    asking_price: r1.listing.asking_price,
  });
  
  // Second turn - correction
  console.log('\n=== TURN 2 (Correction) ===');
  const r2 = await processTurn(sid, 'Haan, quantity badalni hai. 500 nahi 300 kilo hai.');
  console.log('State:', r2.state);
  console.log('Listing:', {
    farmer_name: r2.listing.farmer_name,
    quantity: r2.listing.quantity,
    product: r2.listing.product,
    location: r2.listing.location,
    phone: r2.listing.phone,
    asking_price: r2.listing.asking_price,
  });
  console.log('Missing fields:', r2.missing_fields);
  console.log('Agent message:', r2.agent_message?.substring(0, 100));
};

test().catch(console.error);
