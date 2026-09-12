/**
 * Farmer Inventory Service
 * Isolated data layer for seller/farmer produce.
 * - Wraps mockData for demo (no separate incompatible model)
 * - Persists farmer-added produce to localStorage (project's existing client storage architecture)
 * - API-ready: attempt fetch('/api/produce') before falling back to localStorage
 * - Buyer marketplace (productService) merges this inventory for immediate visibility
 */

import type { Produce, ProduceCategory, ProduceGrade } from '../types';
import { mockProduceListings, mockFarmers } from '../data/mockData';

const STORAGE_KEY = 'farmdirect_farmer_inventory_v1';
const API_ENDPOINT = '/api/produce';

export type ProduceUnit = 'kg' | 'quintal' | 'tonne' | 'bag';

export interface AddProduceInput {
  produceName: string; // crop name, e.g. "Tomato"
  category: ProduceCategory;
  quantity: number; // in selected unit
  unit: ProduceUnit;
  grade: ProduceGrade;
  expectedPrice: number; // ₹/kg
  minPrice?: number; // ₹/kg min acceptable
  location: string; // village/city
  state: string;
  harvestDate: string; // ISO date yyyy-mm-dd
  availableFrom?: string; // ISO datetime
  availableUntil?: string; // ISO datetime
  image?: string; // url
  shelfLifeDays?: number;
  farmerId?: string; // default current farmer
}

export interface InventoryStats {
  totalInventoryKg: number;
  activeListings: number;
  totalListings: number;
  lowStockCount: number;
}

const unitToKg = (qty: number, unit: ProduceUnit): number => {
  switch (unit) {
    case 'quintal':
      return qty * 100;
    case 'tonne':
      return qty * 1000;
    case 'bag':
      return qty * 50; // 1 bag ~50kg common for potatoes/onions
    case 'kg':
    default:
      return qty;
  }
};

const getStored = (): Produce[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Produce[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
};

const setStored = (list: Produce[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    // notify listeners
    window.dispatchEvent(new CustomEvent('farmdirect:inventory-updated', { detail: { count: list.length } }));
  } catch (e) {
    console.error('Failed to persist inventory', e);
    throw e;
  }
};

const mergeWithMock = (stored: Produce[]): Produce[] => {
  // stored overrides mock by id; otherwise append
  const map = new Map<string, Produce>();
  for (const p of mockProduceListings) map.set(p.id, p);
  for (const p of stored) map.set(p.id, p);
  return Array.from(map.values());
};

export const farmerInventoryService = {
  // ---- read ----
  getAllListings(): Produce[] {
    return mergeWithMock(getStored());
  },

  getMyProduce(farmerId: string = 'f-001'): Produce[] {
    const all = this.getAllListings();
    return all.filter((p) => p.farmerId === farmerId);
  },

  getById(id: string): Produce | undefined {
    return this.getAllListings().find((p) => p.id === id);
  },

  getStats(farmerId: string = 'f-001'): InventoryStats {
    const mine = this.getMyProduce(farmerId);
    const totalKg = mine.reduce((a, p) => a + p.quantityKg, 0);
    const low = mine.filter((p) => p.quantityKg < 600).length;
    return {
      totalInventoryKg: totalKg,
      activeListings: mine.filter((p) => p.quantityKg > 0).length,
      totalListings: mine.length,
      lowStockCount: low,
    };
  },

  // ---- write ----
  async addProduce(input: AddProduceInput): Promise<Produce> {
    // Validation is done in UI, but double-check here
    const farmerId = input.farmerId ?? 'f-001';
    const farmer = mockFarmers.find((f) => f.id === farmerId) ?? mockFarmers[0];
    const quantityKg = unitToKg(Number(input.quantity), input.unit);
    if (!input.produceName?.trim()) throw new Error('Produce name required');
    if (!quantityKg || quantityKg <= 0) throw new Error('Quantity must be > 0');
    if (!input.expectedPrice || input.expectedPrice <= 0) throw new Error('Expected price required');
    if (!input.location?.trim()) throw new Error('Location required');
    if (!input.harvestDate) throw new Error('Harvest date required');

    const grade = input.grade ?? 'Grade A';
    const category = input.category;
    const id = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const state = input.state || farmer.state || 'Uttar Pradesh';
    const location = input.location.trim();
    // derive shelf life by category if not provided
    const defaultShelf = category === 'grains' ? 180 : category === 'fruits' ? 7 : 5;
    const shelf = input.shelfLifeDays ?? defaultShelf;

    // Calculate mandi reference: use minPrice or 0.7 * expected
    const mandi = input.minPrice && input.minPrice > 0 ? input.minPrice : Math.round(input.expectedPrice * 0.75);

    const produce: Produce = {
      id,
      name: `${grade} ${input.produceName.trim()} - ${farmer.name}`,
      nameHi: `${grade} ${input.produceName.trim()} - ${farmer.name}`,
      category,
      grade,
      quantityKg,
      expectedPricePerKg: Number(input.expectedPrice),
      mandiPricePerKg: Number(mandi),
      harvestDate: input.harvestDate,
      location: location.includes(',') ? location : `${location}, ${state}`,
      state,
      image: input.image?.trim() || undefined,
      farmerId: farmer.id,
      fpoId: farmer.fpoId,
      availableFrom: input.availableFrom || `${input.harvestDate}T06:00:00+05:30`,
      availableUntil: input.availableUntil || new Date(new Date(input.harvestDate).getTime() + shelf * 86400000).toISOString(),
      shelfLifeDays: shelf,
      pesticideResidueStatus: 'clear' as const,
      certifications: [grade],
      createdAt: now,
      updatedAt: now,
    };

    // Try backend API first, fallback to localStorage
    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(produce),
      });
      if (res.ok) {
        // Assume backend persisted; also persist locally for immediate UI
    const stored = getStored();
    stored.unshift(produce);
    setStored(stored);
    console.log('[ADD_VOICE_LISTING] Stored produce count:', stored.length);
    console.log('[ADD_VOICE_LISTING] localStorage key:', STORAGE_KEY);
    console.log('[ADD_VOICE_LISTING] localStorage value (first 500 chars):', localStorage.getItem(STORAGE_KEY)?.slice(0, 500));
    return produce;
      }
      // non-ok -> fallback
    } catch {
      // network failure -> fallback
    }

    // Local persistence
    const stored = getStored();
    stored.unshift(produce);
    setStored(stored);
    return produce;
  },

  async updateProduce(id: string, patch: Partial<Produce>): Promise<Produce | undefined> {
    const stored = getStored();
    const all = mergeWithMock(stored);
    const idx = all.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    const updated = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
    // If it was mock, move to stored; else update stored
    const storedIdx = stored.findIndex((p) => p.id === id);
    if (storedIdx >= 0) stored[storedIdx] = updated;
    else stored.unshift(updated);
    setStored(stored);

    // Try API PUT
    try {
      await fetch(`${API_ENDPOINT}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch {}
    return updated;
  },

  async deleteProduce(id: string): Promise<void> {
    const stored = getStored().filter((p) => p.id !== id);
    setStored(stored);
    try {
      await fetch(`${API_ENDPOINT}/${id}`, { method: 'DELETE' });
    } catch {}
  },

  // utility for UI to subscribe to changes
  subscribe(callback: () => void): () => void {
    const handler = () => callback();
    window.addEventListener('farmdirect:inventory-updated', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('farmdirect:inventory-updated', handler);
      window.removeEventListener('storage', handler);
    };
  },

  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('farmdirect:inventory-updated'));
  },

  /**
   * Store a voice-created listing as a Produce item so it appears in My Produce.
   * Called after POST /api/listings succeeds — bridges Firestore → localStorage.
   */
  addVoiceListing(listing: {
    farmer_name?: string | null;
    phone?: string | null;
    product?: string | null;
    quantity?: number | null;
    unit?: string | null;
    asking_price?: number | null;
    price_unit?: string | null;
    location?: string | null;
    quality?: string | null;
    listing_id?: string;
  }): Produce {
    console.log('[ADD_VOICE_LISTING] Input:', JSON.stringify(listing, null, 2));
    const farmerId = 'f-001';
    const farmer = mockFarmers.find((f) => f.id === farmerId) ?? mockFarmers[0];
    const product = String(listing.product || 'Unknown');
    const lower = product.toLowerCase();
    const quantity = Number(listing.quantity) || 0;
    const unit = (listing.unit || 'kg') as ProduceUnit;
    const quantityKg = unitToKg(quantity, unit);
    const askingPrice = Number(listing.asking_price) || 0;
    const quality = listing.quality || 'Grade A';
    const location = listing.location || 'Unknown';
    const grade: ProduceGrade = /organic/i.test(quality) ? 'Organic Premium' : /b/i.test(quality) ? 'Grade B' : 'Grade A';

    let category: ProduceCategory = 'vegetables';
    if (/(tomato|potato|onion|carrot|peas|cauliflower|cabbage|bhindi|palak|mirch|gobhi)/i.test(lower)) category = 'vegetables';
    else if (/(apple|banana|mango|seb|kela|aam)/i.test(lower)) category = 'fruits';
    else if (/(wheat|rice|gehun|chawal|corn|maize|bajra|jowar)/i.test(lower)) category = 'grains';
    else if (/(dal|chana|moong|masoor|urad|arhar|moongfali)/i.test(lower)) category = 'pulses';

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const defaultShelf = category === 'grains' ? 180 : category === 'fruits' ? 7 : 5;
    const id = listing.listing_id || `prod-voice-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const produce: Produce = {
      id,
      name: `${quality} ${product} - ${farmer.name}`,
      nameHi: `${quality} ${product} - ${farmer.name}`,
      category,
      grade,
      quantityKg,
      expectedPricePerKg: askingPrice,
      mandiPricePerKg: Math.round(askingPrice * 0.75),
      harvestDate: today,
      location: location.includes(',') ? location : `${location}, ${farmer.state || 'Uttar Pradesh'}`,
      state: farmer.state || 'Uttar Pradesh',
      farmerId,
      fpoId: farmer.fpoId,
      availableFrom: `${today}T06:00:00+05:30`,
      availableUntil: new Date(now.getTime() + defaultShelf * 86400000).toISOString(),
      shelfLifeDays: defaultShelf,
      pesticideResidueStatus: 'clear' as const,
      certifications: [grade],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const stored = getStored();
    stored.unshift(produce);
    try {
      setStored(stored);
    } catch {
      // setStored threw — localStorage failed; fall back to direct write
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
        window.dispatchEvent(new CustomEvent('farmdirect:inventory-updated', { detail: { count: stored.length } }));
      } catch {
        console.error('Failed to persist inventory after retry');
      }
    }
    return produce;
  },

  // helper for buyer demand insights - expose buyer requirements via same pattern (could extend)
  unitToKg,
};
