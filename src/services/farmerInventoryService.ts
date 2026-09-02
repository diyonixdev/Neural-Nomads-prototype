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

  // helper for buyer demand insights - expose buyer requirements via same pattern (could extend)
  unitToKg,
};
