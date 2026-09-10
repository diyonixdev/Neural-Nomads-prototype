/**
 * FarmDirect Assistant Service
 * Clean abstraction over the existing AI backend.
 * - Uses existing aiService endpoints (/api/voice-intent, /api/assistant-response) when available
 * - Falls back gracefully to local parsing when backend is unreachable
 * - No hardcoded AI logic here — delegates to aiService
 * - Ready for future backend swap
 */

import {
  parseVoiceIntent,
  generateAssistantResponse,
  matchFarmers,
  matchBuyers,
  aggregateSupply,
  type ParsedVoiceIntent,
  type AssistantContext,
} from './aiService';

export type AssistantRole = 'buyer' | 'farmer' | null;
export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  timestamp: string;
  parsedIntent?: ParsedVoiceIntent | null;
  suggestions?: string[];
  marketplaceResults?: MarketplaceSearchResult | null;
  buyerDemandResults?: BuyerDemandResult | null;
  inventoryResults?: InventoryResult | null;
  addedProduce?: { id: string; name: string; quantityKg: number } | null;
}

export interface MarketplaceSearchResult {
  query: string;
  parsedIntent: ParsedVoiceIntent | null;
  results: Array<{
    id: string;
    name: string;
    category: string;
    grade: string;
    quantityKg: number;
    expectedPricePerKg: number;
    mandiPricePerKg: number;
    location: string;
    state: string;
    farmerId?: string;
    pricing?: { marketPrice: number; discountPercent: number };
    farmer?: { id: string; name: string; village: string; district: string; state: string; rating: number; avatar: string };
  }>;
  total: number;
}

export interface InventoryResult {
  produce: Array<{
    id: string;
    name: string;
    category: string;
    grade: string;
    quantityKg: number;
    expectedPricePerKg: number;
    location: string;
    harvestDate?: string;
  }>;
  total: number;
}

export interface BuyerDemandResult {
  requirements: Array<{
    id: string;
    produceName: string;
    category: string;
    grade?: string;
    quantityKg: number;
    budgetPerKg: number;
    location: string;
    buyerName: string;
    buyerId: string;
  }>;
  total: number;
}

export interface AssistantReply {
  text: string;
  parsedIntent: ParsedVoiceIntent | null;
  suggestions: string[];
  context: AssistantContext;
  // Structured results for UI to render, from real marketplace/database via backend
  marketplaceResults?: MarketplaceSearchResult | null;
  inventoryResults?: InventoryResult | null;
  buyerDemandResults?: BuyerDemandResult | null;
  addedProduce?: { id: string; name: string; quantityKg: number } | null;
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ---- Backend helpers (reuse existing /api/*, no duplicate service) ----
const searchMarketplaceViaBackend = async (
  parsed: ParsedVoiceIntent,
  text: string,
  roleHint: AssistantRole
): Promise<MarketplaceSearchResult | null> => {
  try {
    console.log('[FRONTEND] starting marketplace search via backend');
    console.log('[FRONTEND] calling /api/marketplace/search with:', parsed);
    const res = await fetch('/api/marketplace/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parsedIntent: parsed, role: roleHint, text, filters: {} }),
    });
    console.log('[FRONTEND] marketplace search response status:', res.status);
    if (!res.ok) {
      console.warn('[FRONTEND] marketplace search non-ok', res.status);
      return null;
    }
    const data = (await res.json()) as MarketplaceSearchResult;
    console.log('[FRONTEND] marketplace search data:', data);
    return data;
  } catch (e) {
    console.warn('[FRONTEND] marketplace search failed, fallback to local', e);
    return null;
  }
};

const addProduceViaBackend = async (parsed: ParsedVoiceIntent, _text: string): Promise<{ id: string; name: string; quantityKg: number } | null> => {
  // Only for SELLER add intents: must have product and quantity
  if (!parsed.product || !parsed.quantity) return null;
  // Use existing farmerInventoryService which goes through backend API (POST /api/produce) and then local cache
  try {
    const { farmerInventoryService } = await import('./farmerInventoryService');
    const catMap: Record<string, string> = {
      Tomato: 'vegetables', Potato: 'vegetables', Onion: 'vegetables', Wheat: 'grains', Rice: 'grains', Cauliflower: 'vegetables', Cabbage: 'vegetables', Carrot: 'vegetables', Peas: 'vegetables', Apple: 'fruits', Banana: 'fruits', Mango: 'fruits',
    };
    const category = (catMap[parsed.product] || 'vegetables') as any;
    const grade = (parsed.quality as any) || 'Grade A';
    const location = parsed.location || '';
    const p = await farmerInventoryService.addProduce({
      produceName: parsed.product,
      category,
      quantity: parsed.quantity,
      unit: (parsed.unit as any) || 'kg',
      grade,
      expectedPrice: parsed.price || 25,
      location,
      state: 'Uttar Pradesh',
      harvestDate: new Date().toISOString().slice(0, 10),
      farmerId: 'f-001',
    });
    return { id: p.id, name: p.name, quantityKg: p.quantityKg };
  } catch {
    // Fallback direct fetch if service not available
    try {
      const res = await fetch('/api/produce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produceName: parsed.product,
          category: 'vegetables',
          quantity: parsed.quantity,
          unit: parsed.unit || 'kg',
          grade: parsed.quality || 'Grade A',
          expectedPrice: parsed.price || 25,
          location: parsed.location || '',
          state: 'Uttar Pradesh',
          harvestDate: new Date().toISOString().slice(0, 10),
          farmerId: 'f-001',
        }),
      });
      if (!res.ok) return null;
      const p = (await res.json()) as any;
      return { id: p.id, name: p.name, quantityKg: p.quantityKg };
    } catch {
      return null;
    }
  }
};

const fetchBuyerDemandViaBackend = async (product?: string | null): Promise<BuyerDemandResult | null> => {
  try {
    const url = product ? `/api/buyer-requirements?product=${encodeURIComponent(product)}` : '/api/buyer-requirements';
    const res = await fetch(url);
    if (!res.ok) return null;
    const list = (await res.json()) as any[];
    return {
      requirements: list.slice(0, 6).map((r: any) => ({
        id: r.id,
        produceName: r.produceName,
        category: r.category,
        grade: r.grade,
        quantityKg: r.quantityKg,
        budgetPerKg: r.budgetPerKg,
        location: r.location || r.buyerName || '—',
        buyerName: r.buyerName || r.buyerId,
        buyerId: r.buyerId,
      })),
      total: list.length,
    };
  } catch {
    return null;
  }
};

const fetchInventoryViaBackend = async (): Promise<InventoryResult | null> => {
  try {
    const res = await fetch('/api/produce?farmerId=f-001');
    if (!res.ok) return null;
    const list = (await res.json()) as any[];
    return {
      produce: list.slice(0, 20).map((p: any) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        grade: p.grade,
        quantityKg: p.quantityKg,
        expectedPricePerKg: p.expectedPricePerKg,
        location: p.location,
        harvestDate: p.harvestDate,
      })),
      total: list.length,
    };
  } catch {
    return null;
  }
};

/**
 * Core service method: process a user text and return assistant reply.
 * Handles intent parsing, marketplace context building, and natural response generation.
 * Now connects to backend API for real marketplace/inventory data (BUYER/SELLER flows via /api/*).
 */
export const processUserMessage = async (
  text: string,
  roleHint: AssistantRole = null
): Promise<AssistantReply> => {
  console.log('[FRONTEND] processUserMessage started with:', text);
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Empty message');
  }

  // 1. Parse intent via existing aiService (handles /api/voice-intent + fallback) — reuses existing endpoint
  console.log('[FRONTEND] calling /api/voice-intent');
  const parsed = await parseVoiceIntent(trimmed);
  console.log('[FRONTEND] voice-intent response received:', parsed);

  // 2. Build marketplace context and perform backend actions (real data, not fictional)
  const context: AssistantContext = {};
  let suggestions: string[] = [];
  let marketplaceResults: MarketplaceSearchResult | null = null;
  let buyerDemandResults: BuyerDemandResult | null = null;
  let inventoryResults: InventoryResult | null = null;
  let addedProduce: { id: string; name: string; quantityKg: number } | null = null;

  const lower = trimmed.toLowerCase();
  const isAddIntent = /(\badd\b|\bhave\b|\bhain\b|\bpaas\b.*\bhai\b|\bbechna\b|\bI have\b)/i.test(trimmed) && !!parsed.product && !!parsed.quantity;
  const isShowInventory = /show.*inventory|my inventory|my produce|stock|inventory dikhao/i.test(lower);
  const isShowBuyers = /show.*buyers|buyers.*looking|who.*interested|khareedar|buyers dhoondho|demand/i.test(lower);

  try {
    // SELLER add flow — must go through backend API, not direct DB
    if ((parsed.intent === 'SELLER' || roleHint === 'farmer') && isAddIntent) {
      addedProduce = await addProduceViaBackend(parsed, trimmed);
      if (addedProduce) {
        context.buyersFound = 1; // at least confirmation
        suggestions = [`View inventory (${addedProduce.name})`, `Check buyers for ${parsed.product}`, `See earnings`];
        // Also fetch buyers for this produce to show demand
        buyerDemandResults = await fetchBuyerDemandViaBackend(parsed.product);
        if (buyerDemandResults) context.buyersFound = buyerDemandResults.total;
      } else {
        // Fallback to local matchBuyers if backend add failed
        const buyerMatches = matchBuyers(parsed);
        context.buyersFound = buyerMatches.length;
        context.buyerNames = buyerMatches.slice(0, 3).map((m) => m.buyer.name);
        buyerDemandResults = {
          requirements: buyerMatches.slice(0, 3).map((m) => ({
            id: m.requirement.id,
            produceName: m.requirement.produceName,
            category: m.requirement.category,
            grade: m.requirement.grade,
            quantityKg: m.requirement.quantityKg,
            budgetPerKg: m.requirement.budgetPerKg,
            location: (m.buyer as any).location || (m.requirement as any).location,
            buyerName: m.buyer.name,
            buyerId: m.buyer.id,
          })),
          total: buyerMatches.length,
        };
        suggestions = buyerMatches.length > 0 ? [`View ${buyerMatches.length} buyers for ${parsed.product}`] : [`Try adjusting price`];
      }
    } else if ((parsed.intent === 'SELLER' || roleHint === 'farmer') && isShowInventory) {
      inventoryResults = await fetchInventoryViaBackend();
      if (!inventoryResults) {
        // fallback to local
        const { farmerInventoryService } = await import('./farmerInventoryService');
        const list = farmerInventoryService.getMyProduce('f-001');
        inventoryResults = { produce: list.map(p => ({ id: p.id, name: p.name, category: p.category, grade: p.grade, quantityKg: p.quantityKg, expectedPricePerKg: p.expectedPricePerKg, location: p.location, harvestDate: p.harvestDate })), total: list.length };
      }
      context.buyersFound = 0;
      suggestions = [`Add more produce`, `Check demand insights`];
    } else if ((parsed.intent === 'SELLER' || roleHint === 'farmer') && isShowBuyers) {
      // Show buyers looking for specific produce or all
      buyerDemandResults = await fetchBuyerDemandViaBackend(parsed.product);
      if (!buyerDemandResults || buyerDemandResults.total === 0) {
        const buyerMatches = matchBuyers(parsed.product ? parsed : { product: 'Tomato', quantityKg: 500, quality: 'Grade A' } as any);
        buyerDemandResults = {
          requirements: buyerMatches.slice(0, 5).map(m => ({
            id: m.requirement.id,
            produceName: m.requirement.produceName,
            category: m.requirement.category,
            grade: m.requirement.grade,
            quantityKg: m.requirement.quantityKg,
            budgetPerKg: m.requirement.budgetPerKg,
            location: (m.buyer as any).location || '',
            buyerName: m.buyer.name,
            buyerId: m.buyer.id,
          })),
          total: buyerMatches.length,
        };
      }
      context.buyersFound = buyerDemandResults.total;
      context.buyerNames = buyerDemandResults.requirements.slice(0, 3).map(r => r.buyerName);
      suggestions = buyerDemandResults.total > 0 ? [`Contact ${buyerDemandResults.requirements[0].buyerName}`, `View all ${buyerDemandResults.total} buyers`] : [`Try different produce`];
    } else if (parsed.intent === 'BUYER' || (roleHint === 'buyer' && parsed.intent !== 'SELLER')) {
      // BUYER flow: search marketplace via backend (real data, not fictional)
      marketplaceResults = await searchMarketplaceViaBackend(parsed, trimmed, roleHint);
      if (!marketplaceResults) {
        // Fallback to local matchFarmers if backend unreachable
        const farmerMatches = matchFarmers(parsed);
        const supply = aggregateSupply(parsed);
        context.farmersFound = farmerMatches.length;
        context.farmerNames = farmerMatches.slice(0, 3).map((m) => m.farmer.name);
        context.supply = { fulfilledKg: supply.fulfilledKg, remainingKg: supply.remainingKg, isFulfilled: supply.isFulfilled };
        // Build a synthetic MarketplaceSearchResult from local data for UI consistency
        marketplaceResults = {
          query: trimmed,
          parsedIntent: parsed,
          results: farmerMatches.slice(0, 6).map(m => ({
            id: m.listing.id,
            name: m.listing.name,
            category: m.listing.category,
            grade: m.listing.grade,
            quantityKg: m.listing.quantityKg,
            expectedPricePerKg: m.listing.expectedPricePerKg,
            mandiPricePerKg: m.listing.mandiPricePerKg,
            location: m.listing.location,
            state: m.listing.state,
            farmerId: m.farmer.id,
            pricing: { marketPrice: Math.round(m.listing.expectedPricePerKg * 1.28), discountPercent: Math.max(5, Math.round(((Math.round(m.listing.expectedPricePerKg*1.28)-m.listing.expectedPricePerKg)/Math.round(m.listing.expectedPricePerKg*1.28))*100)) },
            farmer: { id: m.farmer.id, name: m.farmer.name, village: (m.farmer as any).village, district: (m.farmer as any).district, state: (m.farmer as any).state, rating: m.farmer.rating, avatar: m.farmer.avatar },
          })),
          total: farmerMatches.length,
        };
        suggestions = farmerMatches.length > 0 ? [`View ${farmerMatches.length} farmers near ${parsed.location ?? 'you'}`, `Check price comparison`] : [`Try adjusting location`, `Try different quantity`];
      } else {
        context.farmersFound = marketplaceResults.total;
        context.farmerNames = marketplaceResults.results.slice(0, 3).map(r => r.farmer?.name || r.name);
        if (marketplaceResults.total > 0) {
          context.supply = { fulfilledKg: marketplaceResults.results.reduce((a,b)=>a+b.quantityKg,0), remainingKg: 0, isFulfilled: true };
        }
        suggestions = marketplaceResults.total > 0 ? [`View ${marketplaceResults.total} results for ${parsed.product ?? 'your query'}`, `Sort by price or discount`] : [`Try "tomatoes under ₹40"`, `Try different location`];
      }
    } else if (parsed.intent === 'SELLER' || roleHint === 'farmer') {
      // Generic seller fallback
      const buyerMatches = matchBuyers(parsed);
      context.buyersFound = buyerMatches.length;
      context.buyerNames = buyerMatches.slice(0, 3).map((m) => m.buyer.name);
      buyerDemandResults = {
        requirements: buyerMatches.slice(0, 3).map(m => ({
          id: m.requirement.id,
          produceName: m.requirement.produceName,
          category: m.requirement.category,
          grade: m.requirement.grade,
          quantityKg: m.requirement.quantityKg,
          budgetPerKg: m.requirement.budgetPerKg,
          location: (m.buyer as any).location || '',
          buyerName: m.buyer.name,
          buyerId: m.buyer.id,
        })),
        total: buyerMatches.length,
      };
      suggestions = buyerMatches.length > 0 ? [`View ${buyerMatches.length} buyers for ${parsed.product ?? 'your produce'}`] : [`Try adjusting price`];
    } else {
      suggestions = [`Try: "I need 500 kg tomatoes in Ghaziabad"`, `Try: "Mere paas 2 ton aloo hain"`];
    }
  } catch {
    // Context building is optional — response generation will fallback gracefully
  }

  // 3. Generate natural language response via existing aiService (reuses /api/assistant-response)
  console.log('[FRONTEND] calling /api/assistant-response with context:', context);
  const replyText = await generateAssistantResponse(parsed, context, trimmed);
  console.log('[FRONTEND] final response received:', replyText.slice(0, 120));

  return {
    text: replyText,
    parsedIntent: parsed,
    suggestions,
    context,
    marketplaceResults,
    buyerDemandResults,
    inventoryResults,
    addedProduce,
  };
};

export const createUserMessage = (text: string): ChatMessage => ({
  id: uid(),
  role: 'user',
  text,
  timestamp: new Date().toISOString(),
});

export const createAssistantMessage = (reply: AssistantReply): ChatMessage => ({
  id: uid(),
  role: 'assistant',
  text: reply.text,
  timestamp: new Date().toISOString(),
  parsedIntent: reply.parsedIntent,
  suggestions: reply.suggestions,
  marketplaceResults: reply.marketplaceResults ?? null,
  buyerDemandResults: reply.buyerDemandResults ?? null,
  inventoryResults: reply.inventoryResults ?? null,
  addedProduce: reply.addedProduce ?? null,
});

export const getWelcomeMessage = (role: AssistantRole, language: string = 'en'): string => {
  const isHi = language === 'hi';
  if (role === 'farmer') {
    return isHi
      ? 'Namaste! Main FarmDirect AI hoon — aapki fasal ke liye best buyers dhoondhne me madad karunga. Bataiye, aap kya bechna chahte hain?'
      : 'Hello! I’m FarmDirect AI — I’ll help you find the best buyers for your produce. What would you like to sell today?';
  }
  if (role === 'buyer') {
    return isHi
      ? 'Namaste! Main FarmDirect AI hoon — aapko sahi kisaan se jodne me madad karunga. Bataiye, aapko kya chahiye?'
      : 'Hello! I’m FarmDirect AI — I’ll help you find the best farmers. What would you like to buy today?';
  }
  return isHi
    ? 'Namaste! Main FarmDirect AI hoon. Aap buyer hain ya farmer — bataiye, main kaise madad kar sakta hoon?'
    : 'Hello! I’m FarmDirect AI. Are you buying or selling today? Tell me what you need — in English, Hindi or Hinglish.';
};

export const quickPromptsForRole = (role: AssistantRole, language: string = 'en'): string[] => {
  const isHi = language === 'hi';
  if (role === 'farmer') {
    return isHi
      ? ['Mere paas 500 kg tamatar hain', '200 kg Grade A gehu hain', 'Tamatar ke buyers dikhao', 'Meri fasal me kaun interested hai?', 'Meri inventory dikhao']
      : ['Add 500 kg tomatoes.', 'I have 200 kg Grade A wheat.', 'Show me buyers looking for tomatoes.', 'Who is interested in my produce?', 'Show my inventory.'];
  }
  // default buyer — examples from spec
  return isHi
    ? ['Tamatar ₹40 se kam me dhoondo', 'Delhi ke paas gehu bechne wale kisaan dikhao', 'Sabse zyada discount wali sabziyan kaun si hain?', 'Mujhe 100 kg aloo chahiye', 'Sabse saste Grade A tamatar dhoondo']
    : ['Find tomatoes under ₹40 per kg.', 'Show me farmers near Delhi selling wheat.', 'Which vegetables have the best discounts?', 'I need 100 kg potatoes.', 'Find the cheapest Grade A tomatoes.'];
};

// Local storage helpers for intro-seen state
const INTRO_KEY = 'farmdirect_ai_intro_seen';
const ROLE_KEY = 'farmdirect_ai_preferred_role';

export const hasSeenIntro = (): boolean => {
  try {
    return localStorage.getItem(INTRO_KEY) === 'true';
  } catch {
    return false;
  }
};

export const markIntroSeen = (): void => {
  try {
    localStorage.setItem(INTRO_KEY, 'true');
  } catch {}
};

export const getPreferredRole = (): AssistantRole => {
  try {
    const v = localStorage.getItem(ROLE_KEY) as AssistantRole;
    if (v === 'buyer' || v === 'farmer') return v;
  } catch {}
  return null;
};

export const setPreferredRole = (role: AssistantRole): void => {
  try {
    if (role) localStorage.setItem(ROLE_KEY, role);
    else localStorage.removeItem(ROLE_KEY);
  } catch {}
};

export const resetAssistantState = (): void => {
  try {
    localStorage.removeItem(INTRO_KEY);
  } catch {}
};

