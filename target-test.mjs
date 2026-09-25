// Targeted verification for the exact scenario described
import { processTurn, createSession } from './server/conversationManager.mjs';

async function test() {
  const sid = 'target-test-1';
  createSession(sid);

  // Product
  let r = await processTurn(sid, 'Aalu');
  console.log('After Aalu:', 'product=', r.listing.product, 'milk=', r.agent_message?.slice(0, 50));

  // Name
  r = await processTurn(sid, 'Piya Raghav');
  console.log('After name:', 'farmer_name=', r.listing.farmer_name, 'product=', r.listing.product);

  // Quantity
  r = await processTurn(sid, '2 kilo');
  console.log('After qty:', 'quantity=', r.listing.quantity, 'unit=', r.listing.unit, 'asking=', r.listing.asking_price);

  // Location
  r = await processTurn(sid, 'Ghaziabad');
  console.log('After loc:', 'location=', r.listing.location, 'farmer=', r.listing.farmer_name);

  // Quality
  r = await processTurn(sid, 'Grade A');
  console.log('After quality:', 'quality=', r.listing.quality, 'location=', r.listing.location);

  // Price — the critical bug case
  r = await processTurn(sid, '30 rupaye kilo');
  console.log('After price:', 'asking_price=', r.listing.asking_price, 'price_unit=', r.listing.price_unit, 'quantity=', r.listing.quantity);

  // Confirm state
  console.log('=== FINAL STATE ===');
  console.log({
    farmer_name: r.listing.farmer_name,
    product: r.listing.product,
    quantity: r.listing.quantity,
    unit: r.listing.unit,
    location: r.listing.location,
    quality: r.listing.quality,
    asking_price: r.listing.asking_price,
    price_unit: r.listing.price_unit,
  });

  // Checks
  const ok =
    r.listing.farmer_name === 'Piya Raghav' &&
    r.listing.product === 'Aalu' &&
    r.listing.quantity === 2 &&
    r.listing.unit === 'kg' &&
    r.listing.location === 'Ghaziabad' &&
    r.listing.quality === 'Grade A' &&
    r.listing.asking_price === 30 &&
    r.listing.price_unit === 'kg';

  console.log('All checks pass:', ok);
  if (!ok) process.exit(1);
}

test().catch(e => { console.error(e); process.exit(1); });
