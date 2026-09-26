import { db } from './firebase.mjs';
import { Timestamp } from 'firebase-admin/firestore';

console.log('[DEBUG] listingService.mjs: db import resolved, db is', db === null ? 'NULL' : typeof db);
const COLLECTION_NAME = 'listings';

const VALID_UNITS = ['kg', 'tonnes', 'quintal'];
const VALID_INTENTS = ['sell', 'buy'];
const VALID_STATUSES = ['created', 'active', 'sold', 'cancelled'];
const VALID_SOURCES = ['voice_agent', 'manual', 'web', 'api'];

function generateListingId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `ls-${ts}-${rand}`;
}

function validateListing(data) {
  const errors = [];

  console.log('[SERVER VALIDATE] Input data keys:', Object.keys(data));
  console.log('[SERVER VALIDATE] farmer_name:', JSON.stringify(data.farmer_name), 'type:', typeof data.farmer_name);
  console.log('[SERVER VALIDATE] phone:', JSON.stringify(data.phone), 'type:', typeof data.phone);
  console.log('[SERVER VALIDATE] product:', JSON.stringify(data.product), 'type:', typeof data.product);
  console.log('[SERVER VALIDATE] quantity:', JSON.stringify(data.quantity), 'type:', typeof data.quantity);
  console.log('[SERVER VALIDATE] unit:', JSON.stringify(data.unit), 'type:', typeof data.unit);
  console.log('[SERVER VALIDATE] asking_price:', JSON.stringify(data.asking_price), 'type:', typeof data.asking_price);
  console.log('[SERVER VALIDATE] price_unit:', JSON.stringify(data.price_unit), 'type:', typeof data.price_unit);
  console.log('[SERVER VALIDATE] location:', JSON.stringify(data.location), 'type:', typeof data.location);
  console.log('[SERVER VALIDATE] quality:', JSON.stringify(data.quality), 'type:', typeof data.quality);
  console.log('[SERVER VALIDATE] intent:', JSON.stringify(data.intent), 'type:', typeof data.intent);
  console.log('[SERVER VALIDATE] source:', JSON.stringify(data.source), 'type:', typeof data.source);

  if (!data.farmer_name || typeof data.farmer_name !== 'string' || data.farmer_name.trim().length === 0) {
    errors.push('farmer_name is required and must be a non-empty string');
  }

  if (!data.phone || typeof data.phone !== 'string' || data.phone.trim().length === 0) {
    errors.push('phone is required and must be a non-empty string');
  }

  if (!data.product || typeof data.product !== 'string' || data.product.trim().length === 0) {
    errors.push('product is required and must be a non-empty string');
  }

  if (data.quantity == null || typeof data.quantity !== 'number' || data.quantity <= 0) {
    errors.push('quantity is required and must be a positive number');
  }

  if (!data.unit || !VALID_UNITS.includes(data.unit)) {
    errors.push(`unit is required and must be one of: ${VALID_UNITS.join(', ')}`);
  }

  if (data.asking_price == null || typeof data.asking_price !== 'number' || data.asking_price < 0) {
    errors.push('asking_price is required and must be a non-negative number');
  }

  if (!data.price_unit || typeof data.price_unit !== 'string') {
    errors.push('price_unit is required (e.g., "kg", "quintal")');
  }

  if (!data.location || typeof data.location !== 'string' || data.location.trim().length === 0) {
    errors.push('location is required and must be a non-empty string');
  }

  if (data.intent && !VALID_INTENTS.includes(data.intent)) {
    errors.push(`intent must be one of: ${VALID_INTENTS.join(', ')}`);
  }

  if (data.source && !VALID_SOURCES.includes(data.source)) {
    errors.push(`source must be one of: ${VALID_SOURCES.join(', ')}`);
  }

  if (data.status && !VALID_STATUSES.includes(data.status)) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  return errors;
}

const inMemoryListings = new Map();

function buildListingDoc(data) {
  let createdAt;
  try {
    createdAt = (Timestamp && typeof Timestamp.now === 'function') ? Timestamp.now() : new Date().toISOString();
  } catch {
    createdAt = new Date().toISOString();
  }

  return {
    listing_id: data.listing_id || generateListingId(),
    farmer_name: String(data.farmer_name).trim(),
    phone: String(data.phone).trim(),
    product: String(data.product).trim(),
    quantity: Number(data.quantity),
    unit: String(data.unit).trim(),
    asking_price: Number(data.asking_price),
    price_unit: String(data.price_unit).trim(),
    location: String(data.location).trim(),
    quality: data.quality ? String(data.quality).trim() : null,
    intent: data.intent || 'sell',
    source: data.source || 'voice_agent',
    status: data.status || 'created',
    created_at: createdAt,
  };
}

async function createListing(data) {
  const validationErrors = validateListing(data);
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join('; ')}`);
  }

  const listingDoc = buildListingDoc(data);

  if (db) {
    try {
      const docRef = db.collection(COLLECTION_NAME).doc(listingDoc.listing_id);
      await docRef.set(listingDoc);
      return listingDoc;
    } catch (err) {
      console.warn('[listingService] Firestore write failed, using in-memory store:', err.message);
    }
  }

  inMemoryListings.set(listingDoc.listing_id, listingDoc);
  return listingDoc;
}

async function getListingById(listingId) {
  if (!listingId || typeof listingId !== 'string') {
    throw new Error('listingId must be a non-empty string');
  }

  if (db) {
    try {
      const docRef = db.collection(COLLECTION_NAME).doc(listingId);
      const snap = await docRef.get();
      if (snap.exists) {
        return snap.data();
      }
    } catch (err) {
      console.warn('[listingService] Firestore read failed, checking in-memory store:', err.message);
    }
  }

  return inMemoryListings.get(listingId) || null;
}

export {
  COLLECTION_NAME,
  generateListingId,
  validateListing,
  buildListingDoc,
  createListing,
  getListingById,
};
