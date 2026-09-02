import type { Produce, Farmer, FPO } from '../types';
import { mockProduceListings, mockFarmers, mockFPOs } from '../data/mockData';

// Farmer inventory is the mutable layer; buyer marketplace merges it for immediate visibility after Add Produce.
const FARMER_INVENTORY_KEY = 'farmdirect_farmer_inventory_v1';
const getStoredInventory = (): Produce[] => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(FARMER_INVENTORY_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Produce[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
const mergedProduceList = (): Produce[] => {
  const stored = getStoredInventory();
  if (stored.length === 0) return [...mockProduceListings];
  const map = new Map<string, Produce>();
  for (const p of mockProduceListings) map.set(p.id, p);
  for (const p of stored) map.set(p.id, p);
  return Array.from(map.values());
};

/**
 * Isolated data source for buyer marketplace.
 * Currently wraps mockData but exposes API-like interface so future backend swap is trivial.
 * UI must only import from this service, not directly from mockData.
 */

export interface ProductPricing {
  sellingPrice: number; // expectedPricePerKg
  marketPrice: number; // ~28% markup or mandiPrice fallback (whichever higher)
  referenceMandiPrice: number; // mandiPricePerKg
  discountPercent: number;
  savingPerKg: number;
}

const produceImages: Record<string, string> = {
  Tomato: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=800&auto=format&fit=crop&q=80',
  Potato: 'https://images.unsplash.com/photo-1518977678668-d3455894893b?w=400&auto=format&fit=crop&q=80',
  Onion: 'https://images.unsplash.com/photo-1508747703725-719777637510?w=400&auto=format&fit=crop&q=80',
  Wheat: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&auto=format&fit=crop&q=80',
  Rice: 'https://images.unsplash.com/photo-1536304929831-eeedbe2d3340?w=400&auto=format&fit=crop&q=80',
  Cauliflower: 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=400&auto=format&fit=crop&q=80',
  Cabbage: 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=400&auto=format&fit=crop&q=80',
  Carrot: 'https://images.unsplash.com/photo-1447175008436-054170c2e979?w=400&auto=format&fit=crop&q=80',
  Peas: 'https://images.unsplash.com/photo-1589923188651-268a9765e432?w=400&auto=format&fit=crop&q=80',
  Apple: 'https://images.unsplash.com/photo-1568702846914-96b305d2aa34?w=400&auto=format&fit=crop&q=80',
  Banana: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&auto=format&fit=crop&q=80',
  Mango: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&auto=format&fit=crop&q=80',
};

export const FALLBACK_PRODUCE_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80';

export const getProduceImage = (produce: Produce): string => {
  if (produce.image) return produce.image;
  const key = Object.keys(produceImages).find((k) => produce.name.toLowerCase().includes(k.toLowerCase()));
  if (key) return produceImages[key];
  return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80';
};

export const getFarmerForProduce = (produce: Produce): Farmer => {
  return mockFarmers.find((f) => f.id === produce.farmerId) ?? mockFarmers[0];
};

export const getFPOForProduce = (produce: Produce): FPO | undefined => {
  if (!produce.fpoId) return undefined;
  return mockFPOs.find((f) => f.id === produce.fpoId);
};

export const getPricing = (produce: Produce): ProductPricing => {
  const sellingPrice = produce.expectedPricePerKg;
  // Market/reference price: simulate retail ~28% over selling, but never below mandi*1.4 for hierarchy visibility
  const retailEstimate = Math.round(sellingPrice * 1.28);
  const marketPrice = Math.max(retailEstimate, Math.round(produce.mandiPricePerKg * 1.35));
  const discountPercent = Math.max(5, Math.round(((marketPrice - sellingPrice) / marketPrice) * 100));
  return {
    sellingPrice,
    marketPrice,
    referenceMandiPrice: produce.mandiPricePerKg,
    discountPercent,
    savingPerKg: marketPrice - sellingPrice,
  };
};

export const getAvailabilityStatus = (produce: Produce): { label: string; tone: 'emerald' | 'amber' | 'rose'; available: boolean } => {
  if (produce.quantityKg === 0) return { label: 'Out of stock', tone: 'rose', available: false };
  if (produce.quantityKg < 600) return { label: 'Low stock', tone: 'amber', available: true };
  if (produce.quantityKg < 900) return { label: 'Limited', tone: 'amber', available: true };
  return { label: 'In stock', tone: 'emerald', available: true };
};

export const getFreshnessScore = (produce: Produce): number => {
  // Higher is fresher — based on harvestDate proximity and shelfLife
  if (!produce.harvestDate) return produce.shelfLifeDays ?? 7;
  const harvest = new Date(produce.harvestDate).getTime();
  const now = Date.now();
  const daysSinceHarvest = Math.max(0, Math.floor((now - harvest) / 86400000));
  const shelf = produce.shelfLifeDays ?? 7;
  return Math.max(0, shelf - daysSinceHarvest);
};

export const fetchAllProducts = async (): Promise<Produce[]> => {
  try {
    const res = await fetch('/api/produce');
    if (res.ok) return (await res.json()) as Produce[];
  } catch {}
  return Promise.resolve(mergedProduceList());
};

export const fetchProductById = async (id: string): Promise<Produce | undefined> => {
  try {
    const res = await fetch(`/api/produce/${id}`);
    if (res.ok) return (await res.json()) as Produce;
  } catch {}
  return Promise.resolve(mergedProduceList().find((p) => p.id === id));
};

export const getAllProductsSync = (): Produce[] => mergedProduceList();

export const getProductByIdSync = (id: string): Produce | undefined => mergedProduceList().find((p) => p.id === id);

export const getUniqueLocations = (): string[] => {
  const list = mergedProduceList();
  const districts = list.map((p) => {
    const parts = p.location.split(',');
    return parts.length > 1 ? parts[parts.length - 1].trim() : p.location.trim();
  });
  const states = list.map((p) => p.state);
  const combined = [...new Set([...districts, ...states])];
  return combined.sort();
};

export const getUniqueCategories = (): string[] => {
  return [...new Set(mergedProduceList().map((p) => p.category))];
};

export const parseDisplayName = (produce: Produce): { crop: string; title: string } => {
  // Example: "Grade A Tomatoes - Green Valley FPO" -> crop "Tomatoes", title same but we separate
  const name = produce.name;
  // strip grade prefix
  const withoutGrade = name.replace(/^Grade\s+[AB]\s+/, '').replace(/^Organic\s+Premium\s+/, '');
  const cropPart = withoutGrade.split(' - ')[0]?.trim() || withoutGrade.trim();
  // Normalize crop to title case crop word: first word(s) before possible variant
  return { crop: cropPart, title: name };
};
