import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'server/data');
const ORDERS_STORE_PATH = path.join(DATA_DIR, 'orders-store.json');

const ensureDataDir = () => {
  try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
};

const SEED_ORDERS = [];

// Create 15 orders for Wheat
for (let i = 0; i < 15; i++) {
  SEED_ORDERS.push({
    id: `ord-seed-wheat-${i}`,
    buyerId: 'b-004',
    allocations: [{
      listing: { name: 'PBW Wheat Cleaned Lot', category: 'grains', expectedPricePerKg: 21 },
      allocatedKg: Math.floor(Math.random() * 500) + 100
    }],
    totalQuantityKg: 600,
    totalAmount: 12600,
    status: 'confirmed',
    createdAt: new Date(Date.now() - (i * 86400000 * 2)).toISOString()
  });
}

// Create 10 orders for Tomato
for (let i = 0; i < 10; i++) {
  SEED_ORDERS.push({
    id: `ord-seed-tomato-${i}`,
    buyerId: 'b-002',
    allocations: [{
      listing: { name: 'Grade A Tomatoes', category: 'vegetables', expectedPricePerKg: 27 },
      allocatedKg: Math.floor(Math.random() * 200) + 50
    }],
    totalQuantityKg: 150,
    totalAmount: 4050,
    status: 'confirmed',
    createdAt: new Date(Date.now() - (i * 86400000 * 3)).toISOString()
  });
}

const seed = () => {
  ensureDataDir();
  if (!fs.existsSync(ORDERS_STORE_PATH)) {
    fs.writeFileSync(ORDERS_STORE_PATH, JSON.stringify(SEED_ORDERS, null, 2), 'utf8');
    console.log('orders-store.json seeded with ' + SEED_ORDERS.length + ' historical orders.');
  } else {
    console.log('orders-store.json already exists. Not seeding.');
  }
};

seed();
