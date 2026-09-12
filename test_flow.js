// Deterministic test to trace the exact data flow from addVoiceListing to getMyProduce
// This reproduces the logic from src/services/farmerInventoryService.ts

// Mock data - only the first few mock listings relevant to f-001
const mockProduceListings = [
  { id: 'prod-001', name: 'Grade A Tomatoes - Green Valley FPO', farmerId: 'f-001', category: 'vegetables', grade: 'Grade A', quantityKg: 800, expectedPricePerKg: 27 },
  { id: 'prod-002', name: 'Grade A Potatoes - Ghaziabad Lot', farmerId: 'f-002', category: 'vegetables', grade: 'Grade A', quantityKg: 2000, expectedPricePerKg: 22 },
  { id: 'prod-003', name: 'Red Onion Nashik Type', farmerId: 'f-006', category: 'vegetables', grade: 'Grade A', quantityKg: 1800, expectedPricePerKg: 24 },
];

// Mock localStorage
const localStorageMock = (() => {
  const store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value; },
    removeItem: (key) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };
})();

// Replace global localStorage for the test
global.localStorage = localStorageMock;

// Service functions (copied from farmerInventoryService.ts)
const STORAGE_KEY = 'farmdirect_farmer_inventory_v1';

function getStored() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function setStored(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    // notify listeners
    const event = new CustomEvent('farmdirect:inventory-updated', { detail: { count: list.length } });
    window.dispatchEvent(event);
  } catch (e) {
    console.error('Failed to persist inventory', e);
  }
}

function mergeWithMock(stored) {
  const map = new Map();
  for (const p of mockProduceListings) map.set(p.id, p);
  for (const p of stored) map.set(p.id, p);
  return Array.from(map.values());
}

function getAllListings() {
  return mergeWithMock(getStored());
}

function getMyProduce(farmerId = 'f-001') {
  const all = getAllListings();
  return all.filter((p) => p.farmerId === farmerId);
}

// ===================== TEST SCENARIOS =====================

console.log('========================================');
console.log('SCENARIO 1: First voice listing, localStorage empty');
console.log('========================================');

// Simulate: addVoiceListing creates and stores a new listing
const newListing = {
  id: 'prod-voice-12345',
  name: 'Grade A Tomatoes - Green Valley FPO',
  farmerId: 'f-001',
  category: 'vegetables',
  grade: 'Grade A',
  quantityKg: 500,
  expectedPricePerKg: 27,
};

// Step 1: getStored returns [] (empty localStorage)
let stored = getStored();
console.log('Step 1 - getStored():', stored.length, 'items');

// Step 2: stored.unshift(produce) - add new listing
stored.unshift(newListing);
console.log('Step 2 - After unshift, stored.length:', stored.length);

// Step 3: setStored(stored) - write to localStorage
setStored(stored);
console.log('Step 3 - setStored called, localStorage value:', JSON.stringify(localStorage.getItem(STORAGE_KEY)).substring(0, 200));

// Step 4: getMyProduce('f-001') - read back
const myProduce = getMyProduce('f-001');
console.log('Step 4 - getMyProduce("f-001"):', myProduce.length, 'listings');
console.log('  Listing IDs:', myProduce.map(p => p.id).join(', '));
console.log('  farmerIds:', myProduce.map(p => p.farmerId).join(', '));

if (myProduce.length > 0) {
  console.log('✅ SUCCESS: New listing appears in getMyProduce("f-001")');
} else {
  console.log('❌ FAILURE: New listing does NOT appear in getMyProduce("f-001")');
}

console.log('');
console.log('========================================');
console.log('SCENARIO 2: Second voice listing, existing data');
console.log('========================================');

// First, add an initial listing (simulating existing inventory)
setStored([{ id: 'prod-001', name: 'Existing Tomato', farmerId: 'f-001', category: 'vegetables', grade: 'Grade A', quantityKg: 800, expectedPricePerKg: 27 }]);
console.log('Initial inventory:', getStored().length, 'items');

// Now add a second voice listing
stored = getStored();
stored.unshift(newListing);
setStored(stored);
console.log('After second voice listing, stored.length:', stored.length);

const myProduce2 = getMyProduce('f-001');
console.log('getMyProduce("f-001"):', myProduce2.length, 'listings');
console.log('  Listing IDs:', myProduce2.map(p => p.id).join(', '));
console.log('  farmerIds:', myProduce2.map(p => p.farmerId).join(', '));

if (myProduce2.length >= 2) {
  console.log('✅ SUCCESS: Both listings appear in getMyProduce("f-001")');
} else {
  console.log('❌ FAILURE: Not all listings appear in getMyProduce("f-001")');
}

console.log('');
console.log('========================================');
console.log('SCENARIO 3: Voice listing with ID that collides with mock');
console.log('========================================');

// This simulates what happens if listing.listing_id from the API is 'prod-001'
// (same as a mock listing ID)
const collidingListing = {
  id: 'prod-001',  // Collides with mock listing!
  name: 'Voice Listing',
  farmerId: 'f-001',
  category: 'vegetables',
  grade: 'Grade A',
  quantityKg: 100,
  expectedPricePerKg: 10,
};

localStorage.clear();

// Clear and set with colliding ID
stored = getStored();
stored.unshift(collidingListing);
setStored(stored);

const myProduce3 = getMyProduce('f-001');
console.log('getMyProduce("f-001") with colliding ID:', myProduce3.length, 'listings');
console.log('  Listing IDs:', myProduce3.map(p => p.id).join(', '));
console.log('  Names:', myProduce3.map(p => p.name).join(', '));

if (myProduce3.length > 0 && myProduce3.some(p => p.id === 'prod-001')) {
  console.log('✅ Listing with colliding ID appears (overwrote mock entry)');
} else if (myProduce3.length === 0) {
  console.log('❌ Listing disappeared due to ID collision');
} else {
  console.log('? Partial result');
}

console.log('');
console.log('========================================');
console.log('SCENARIO 4: Voice listing with generated ID (prod-voice-...)');
console.log('========================================');

localStorage.clear();
const generatedIdListing = {
  id: 'prod-voice-abcdef12',  // Generated ID, not colliding with mock
  name: 'Voice Listing',
  farmerId: 'f-001',
  category: 'vegetables',
  grade: 'Grade A',
  quantityKg: 100,
  expectedPricePerKg: 10,
};

stored = getStored();
stored.unshift(generatedIdListing);
setStored(stored);

const myProduce4 = getMyProduce('f-001');
console.log('getMyProduce("f-001") with generated ID:', myProduce4.length, 'listings');
console.log('  Listing IDs:', myProduce4.map(p => p.id).join(', '));
console.log('  Names:', myProduce4.map(p => p.name).join(', '));

if (myProduce4.length > 0 && myProduce4.some(p => p.id === 'prod-voice-abcdef12')) {
  console.log('✅ Listing with generated ID appears correctly');
} else {
  console.log('❌ Listing with generated ID does NOT appear');
}