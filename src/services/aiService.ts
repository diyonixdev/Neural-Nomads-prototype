import type { Address, Buyer, BuyerRequirement, Farmer, Produce, ProduceGrade } from '../types';
import { mockBuyers, mockBuyerRequirements, mockFarmers, mockProduceListings } from '../data/mockData';

export type ParsedIntentType = 'BUYER' | 'SELLER' | 'UNKNOWN';
export type ParsedUnit = 'kg' | 'tonnes';

export interface ParsedVoiceIntent {
  intent: ParsedIntentType;
  product: string | null;
  quantity: number | null;
  unit: ParsedUnit | null;
  quality: string | null;
  location: string | null;
  date: string | null;
  price: number | null;
}

export interface RequirementInput {
  product: string;
  quantityKg: number;
  quality?: ProduceGrade;
  location?: string;
  date?: string;
  budgetPerKg?: number;
}

export interface ListingInput {
  product: string;
  quantityKg: number;
  quality?: ProduceGrade;
  location?: string;
  askPricePerKg?: number;
}

export interface MatchBreakdown {
  availability: number;
  price: number;
  distance: number;
  quality: number;
  reliability: number;
}

export interface FarmerMatchResult {
  farmer: Farmer;
  listing: Produce;
  totalScore: number;
  breakdown: MatchBreakdown;
  explanation: string;
}

export interface BuyerMatchResult {
  buyer: Buyer;
  requirement: BuyerRequirement;
  totalScore: number;
  breakdown: MatchBreakdown;
  explanation: string;
}

export interface SupplyAllocation {
  farmer: Farmer;
  listing: Produce;
  allocatedKg: number;
}

export interface AggregatedSupplyResult {
  requestedKg: number;
  fulfilledKg: number;
  remainingKg: number;
  isFulfilled: boolean;
  allocations: SupplyAllocation[];
  explanation: string;
}

export interface NegotiationResult {
  suggestedPricePerKg: number;
  reasoning: string[];
  confidence: number;
}

export interface CargoInput {
  product: string;
  quantityKg: number;
  coldChainRequired?: boolean;
}

export interface OptimizedRouteOption {
  id: 'A' | 'B' | 'C';
  label: string;
  distanceKm: number;
  costInr: number;
  durationHours: number;
  recommended: boolean;
  explanation: string;
}

export interface OptimizedRouteResult {
  pickup: string;
  destination: string;
  cargo: CargoInput;
  routes: OptimizedRouteOption[];
  recommendedRoute: OptimizedRouteOption;
}

const DEMO_TOMORROW_DATE = '2026-09-02';
const VOICE_INTENT_API_ENDPOINT = '/api/voice-intent';
const ASSISTANT_RESPONSE_API_ENDPOINT = '/api/assistant-response';
export const VOICE_ASSISTANT_API_ENDPOINT = '/api/voice-assistant';

// Unified voice assistant types (matches backend /api/voice-assistant response)
export type VoiceAssistantIntent = 'SELL_PRODUCE' | 'BUY_PRODUCE' | 'FIND_BUYER' | 'FIND_FARMER' | 'CHECK_ORDER' | 'TRACK_DELIVERY' | 'CALL_FARMER' | 'CHECK_PRICE' | 'HELP';
export interface VoiceAssistantData {
  product: string | null;
  quantity: number | null;
  unit: 'kg' | 'tonnes' | null;
  grade: string | null;
  price_per_kg: number | null;
  currency: 'INR' | null;
  location?: string | null;
}
export interface VoiceAssistantResponse {
  success: boolean;
  intent: VoiceAssistantIntent;
  language?: 'en' | 'hi' | 'hinglish';
  data: VoiceAssistantData;
  message: string;
  missing_fields: string[];
  requires_confirmation: boolean;
  confirmation_card?: VoiceAssistantData & { location?: string | null } | null;
  session_id: string;
  listing_created?: any;
  already_exists?: boolean;
  cancelled?: boolean;
  error?: string;
}

// Session handling for stateful conversation
const VOICE_SESSION_KEY = 'farmdirect_voice_session_id';
export const getVoiceSessionId = (): string => {
  try {
    let sid = localStorage.getItem(VOICE_SESSION_KEY);
    if (!sid) {
      sid = `sess-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
      localStorage.setItem(VOICE_SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return `sess-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
  }
};
export const resetVoiceSession = (): string => {
  const sid = `sess-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
  try { localStorage.setItem(VOICE_SESSION_KEY, sid); } catch {}
  return sid;
};

export interface AssistantContext {
  farmersFound?: number;
  buyersFound?: number;
  farmerNames?: string[];
  buyerNames?: string[];
  supply?: { fulfilledKg: number; remainingKg: number; isFulfilled: boolean };
  negotiation?: { suggestedPricePerKg: number; confidence: number };
}

const productAliases: Record<string, string[]> = {
  Tomato: ['tomato', 'tomatoes', 'tamatar', '\u091f\u092e\u093e\u091f\u0930'],
  Potato: ['potato', 'potatoes', 'aloo', '\u0906\u0932\u0942'],
  Onion: ['onion', 'onions', 'pyaaz', 'pyaz', '\u092a\u094d\u092f\u093e\u091c'],
  Wheat: ['wheat', 'gehun', '\u0917\u0947\u0939\u0942\u0902'],
  Rice: ['rice', 'chawal', '\u091a\u093e\u0935\u0932'],
  Cauliflower: ['cauliflower', 'gobhi'],
  Cabbage: ['cabbage', 'patta gobhi'],
  Carrot: ['carrot', 'carrots', 'gajar'],
  Peas: ['peas', 'matar'],
  Apple: ['apple', 'apples', 'seb'],
  Banana: ['banana', 'bananas', 'kela'],
  Mango: ['mango', 'mangoes', 'aam'],
};

const knownLocations = ['Ghaziabad', 'Delhi', 'Noida', 'Meerut', 'Hapur', 'Bulandshahr', 'Sonipat', 'Panipat', 'Karnal', 'Gurugram', 'Muradnagar', 'Dasna', 'Modinagar', 'Azadpur', 'Pilakhuwa', 'Gurgaon', 'Faridabad', 'Baghpat', 'Muzaffarnagar', 'Saharanpur', 'Aligarh', 'Agra', 'Mathura', 'Dadri', 'Sikandrabad', 'Jewar'];

const clampScore = (score: number) => Math.max(0, Math.min(100, Math.round(score)));

const normalizeText = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();

const normalizeProduct = (value: string | null | undefined) => {
  if (!value) return null;
  const normalized = normalizeText(value);
  const match = Object.entries(productAliases).find(([, aliases]) =>
    aliases.some((alias) => normalized.includes(alias)),
  );
  return match?.[0] ?? null;
};

const normalizeQuality = (value: string | null | undefined): ProduceGrade | undefined => {
  if (!value) return undefined;
  const normalized = normalizeText(value);
  if (normalized.includes('organic')) return 'Organic Premium';
  if (normalized.includes('grade a') || normalized.includes('achhe') || normalized.includes('good')) return 'Grade A';
  if (normalized.includes('grade b')) return 'Grade B';
  return undefined;
};

const getQuantityKg = (quantity: number | null, unit: ParsedUnit | null) => {
  if (quantity === null) return 0;
  return unit === 'tonnes' ? quantity * 1000 : quantity;
};

const getReliability = (entity: Farmer | Buyer) => (entity as { reliabilityPct?: number }).reliabilityPct ?? Math.round((entity.rating ?? 4) * 20);

const getDistanceKm = (entity: Farmer | Buyer) => (entity as { distanceKm?: number }).distanceKm ?? 75;

const productMatches = (source: string | null | undefined, target: string | null | undefined) => {
  const sourceProduct = normalizeProduct(source);
  const targetProduct = normalizeProduct(target);
  return Boolean(sourceProduct && targetProduct && sourceProduct === targetProduct);
};

const qualityScore = (available: ProduceGrade | undefined, required: ProduceGrade | undefined) => {
  if (!required || !available) return 85;
  if (available === required) return 100;
  if (available === 'Organic Premium' && required === 'Grade A') return 96;
  if (available === 'Grade A' && required === 'Grade B') return 92;
  return 68;
};

const priceScoreForBuyer = (askPrice: number, budgetPrice?: number) => {
  if (!budgetPrice) return 85;
  if (askPrice <= budgetPrice) return 100;
  return clampScore(100 - ((askPrice - budgetPrice) / budgetPrice) * 100);
};

const priceScoreForSeller = (buyerBudget: number, askPrice?: number) => {
  if (!askPrice) return 85;
  if (buyerBudget >= askPrice) return 100;
  return clampScore(100 - ((askPrice - buyerBudget) / askPrice) * 100);
};

const distanceScore = (distanceKm: number) => clampScore(100 - Math.max(0, distanceKm - 20) * 0.75);

const weightedScore = (breakdown: MatchBreakdown) =>
  clampScore(
    breakdown.availability * 0.3 +
      breakdown.price * 0.25 +
      breakdown.distance * 0.2 +
      breakdown.quality * 0.15 +
      breakdown.reliability * 0.1,
  );

const requirementFromInput = (requirement: RequirementInput | BuyerRequirement | ParsedVoiceIntent): RequirementInput => {
  if ('produceName' in requirement) {
    return {
      product: requirement.produceName,
      quantityKg: requirement.quantityKg,
      quality: requirement.grade,
      location: requirement.deliveryLocation.city ?? requirement.deliveryLocation.district ?? requirement.deliveryLocation.formattedAddress,
      date: requirement.neededBy,
      budgetPerKg: requirement.budgetPerKg,
    };
  }

  if ('intent' in requirement) {
    return {
      product: requirement.product ?? '',
      quantityKg: getQuantityKg(requirement.quantity, requirement.unit),
      quality: normalizeQuality(requirement.quality),
      location: requirement.location ?? undefined,
      date: requirement.date ?? undefined,
      budgetPerKg: requirement.price ?? undefined,
    };
  }

  return requirement;
};

const listingFromInput = (listing: ListingInput | Produce | ParsedVoiceIntent): ListingInput => {
  if ('expectedPricePerKg' in listing) {
    return {
      product: listing.name,
      quantityKg: listing.quantityKg,
      quality: listing.grade,
      location: listing.location,
      askPricePerKg: listing.expectedPricePerKg,
    };
  }

  if ('intent' in listing) {
    return {
      product: listing.product ?? '',
      quantityKg: getQuantityKg(listing.quantity, listing.unit),
      quality: normalizeQuality(listing.quality),
      location: listing.location ?? undefined,
      askPricePerKg: listing.price ?? undefined,
    };
  }

  return listing;
};

const findFarmer = (listing: Produce) => mockFarmers.find((farmer) => farmer.id === listing.farmerId) ?? mockFarmers[0];

const findBuyer = (requirement: BuyerRequirement) => mockBuyers.find((buyer) => buyer.id === requirement.buyerId) ?? mockBuyers[0];

const isParsedUnit = (unit: unknown): unit is ParsedUnit => unit === 'kg' || unit === 'tonnes';

const validateAiVoiceIntent = (value: unknown): ParsedVoiceIntent | null => {
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  const intent = record.intent;
  const product = record.product;
  const quantity = record.quantity;
  const unit = record.unit;
  const quality = record.quality;
  const location = record.location;
  const date = record.date;
  const price = record.price;

  if (intent !== 'BUYER' && intent !== 'SELLER') return null;
  if (product !== null && typeof product !== 'string') return null;
  if (quantity !== null && (typeof quantity !== 'number' || !Number.isFinite(quantity))) return null;
  if (unit !== null && !isParsedUnit(unit)) return null;
  if (quality !== null && typeof quality !== 'string') return null;
  if (location !== null && typeof location !== 'string') return null;
  if (date !== null && typeof date !== 'string') return null;
  if (price !== null && (typeof price !== 'number' || !Number.isFinite(price))) return null;

  return {
    intent,
    product,
    quantity,
    unit,
    quality,
    location,
    date,
    price,
  };
};

const parseVoiceIntentFallback = (text: string): ParsedVoiceIntent => {
  const normalized = normalizeText(text);
  // SupportHindi: किलो/क्विंटल, english kg/ton, and also "quintal" (100 kg) & katta approximations
  const quantityMatch =
    normalized.match(/(\d+(?:\.\d+)?)\s*(kg|kilo|kilogram|kilograms|किलो|किलोग्राम)\b/) ??
    normalized.match(/(\d+(?:\.\d+)?)\s*(ton|tons|tonne|tonnes|टन)\b/) ??
    normalized.match(/(\d+(?:\.\d+)?)\s*(quintal|qtl|क्विंटल)\b/) ??
    normalized.match(/(\d+(?:\.\d+)?)\s*(katta|bori|bag|boris)\b/);
  let priceMatch =
    normalized.match(/(?:₹|rs\.?|inr|रु\.?)\s*(\d+(?:\.\d+)?)/) ??
    normalized.match(/(\d+(?:\.\d+)?)\s*(?:rupees|rs|रुपये)\s*(?:per\s*)?(?:kg|kilo|किलो)/);
  // also "25 rupees per kg"
  if (!priceMatch) {
    const perKg = normalized.match(/(\d+(?:\.\d+)?)\s*per\s*kg/);
    if (perKg) priceMatch = perKg;
  }
  const product = normalizeProduct(normalized) ?? normalizeProduct(text);
  const location = knownLocations.find((knownLocation) => normalized.includes(knownLocation.toLowerCase())) ?? null;
  let quantity: number | null = null;
  let unit: ParsedUnit | null = null;
  if (quantityMatch) {
    quantity = Number(quantityMatch[1]);
    const raw = quantityMatch[2].toLowerCase();
    if (raw.startsWith('ton') || raw === 'टन') unit = 'tonnes';
    else if (raw.includes('quintal') || raw.includes('qtl') || raw.includes('क्विंटल')) {
      // convert quintal -> kg
      quantity = quantity * 100;
      unit = 'kg';
    } else if (raw.includes('katta') || raw.includes('bori') || raw.includes('bag')) {
      // approximate katta ~ 50kg (common for potatoes/onions)
      quantity = quantity * 50;
      unit = 'kg';
    } else unit = 'kg';
  }
  const quality = normalized.includes('grade a')
    ? 'Grade A'
    : normalized.includes('grade b')
      ? 'Grade B'
      : normalized.includes('organic') || normalized.includes('jaivik')
        ? 'Organic Premium'
        : normalized.includes('achhe') || normalized.includes('achha') || normalized.includes('good quality') || normalized.includes('अच्छी') || normalized.includes('अच्छे')
          ? 'Grade A'
          : null;
  const hasTomorrow = /\b(tomorrow|kal|कल)\b/.test(normalized);
  // Expanded intent detection for Hindi/English
  const isBuyerIntent = /\b(need|needs|want|wants|chahiye|chahie|khareed|kharid|buy|buyer|talash|dhoondh|find me|looking for|required|chaahiye)\b/.test(normalized);
  const isSellerIntent = /\b(have|has|hai\b|hain\b|paas|bechna|sell|selling|harvested|harvest|ready|taiyaar|uthan|available|stock|supply|buyers dhoondho|dhoondho|find buyers|khareedar)\b/.test(normalized);
  // Seller priority if both match and contains seller phrase
  const sellerStrong = /\b(paas.*hai|have.*to sell|bechna|harvested|ready for pickup)\b/.test(normalized);

  let intent: ParsedIntentType = 'UNKNOWN';
  if (sellerStrong || (isSellerIntent && !isBuyerIntent)) intent = 'SELLER';
  else if (isSellerIntent && isBuyerIntent) {
    // if contains "buyers dhoondho" it's seller, else buyer
    intent = /buyers dhoondho|buyers chahiye|khareedar/.test(normalized) ? 'SELLER' : 'BUYER';
  } else if (isSellerIntent) intent = 'SELLER';
  else if (isBuyerIntent) intent = 'BUYER';

  return {
    intent,
    product,
    quantity,
    unit,
    quality,
    location,
    date: hasTomorrow ? DEMO_TOMORROW_DATE : null,
    price: priceMatch ? Number(priceMatch[1] ?? priceMatch[0].match(/\d+/)?.[0]) : null,
  };
};

const withFetchTimeout = async <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = globalThis.setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms) as unknown as number;
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result as T;
  } finally {
    if (timeoutId) globalThis.clearTimeout(timeoutId);
  }
};

export const parseVoiceIntent = async (text: string): Promise<ParsedVoiceIntent> => {
  console.log('[FRONTEND] request started for:', text);
  console.log('[FRONTEND] calling /api/voice-intent with:', text);
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    console.error('[FRONTEND] voice-intent abort after 20000ms');
    controller.abort();
  }, 20000);

  try {
    const fetchPromise = fetch(VOICE_INTENT_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    const response = await withFetchTimeout(fetchPromise, 20000, 'voice-intent');
    console.log('[FRONTEND] voice-intent response received:', response.status);

    if (!response.ok) {
      // If backend returns 502/504/503, fallback to local parsing but log for debugging
      console.warn(`[aiService] /api/voice-intent ${response.status}, falling back to local parsing`);
      const fallback = parseVoiceIntentFallback(text);
      console.log('[FRONTEND] voice-intent fallback parsed:', fallback);
      return fallback;
    }

    const payload: unknown = await withFetchTimeout(response.json() as Promise<unknown>, 2000, 'voice-intent json');
    console.log('[FRONTEND] voice-intent payload:', payload);
    const parsed = validateAiVoiceIntent(payload);

    if (!parsed) {
      console.warn('[aiService] Invalid AI intent JSON, using fallback', payload);
      const fallback = parseVoiceIntentFallback(text);
      console.log('[FRONTEND] voice-intent fallback (invalid JSON):', fallback);
      return fallback;
    }
    console.log('[FRONTEND] voice-intent parsed successfully:', parsed);
    return parsed;
  } catch (e: any) {
    if (e?.name === 'AbortError' || e?.message?.includes('timeout')) {
      console.warn('[aiService] voice-intent timeout after 20s, using fallback');
      console.log('[FRONTEND] voice-intent timeout fallback for:', text);
    } else {
      console.warn('[aiService] voice-intent fetch failed, using fallback', e?.message);
      console.log('[FRONTEND] voice-intent fetch error fallback:', e?.message);
    }
    const fallback = parseVoiceIntentFallback(text);
    console.log('[FRONTEND] voice-intent fallback (catch):', fallback);
    return fallback;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
};

const detectLanguage = (text: string): 'hinglish' | 'english' => {
  // Check Devanagari first
  if (/[\u0900-\u097F]/.test(text)) return 'hinglish';
  const lower = text.toLowerCase();
  if (/\b(mujhe|chahiye|chahie|paas|hai|hain|dhoondho|kal|aapko|bilkul|achhe|achha|tamatar|aloo|pyaaz|pyaz|gehu|gehun|chawal|mera|mere|paas|kilo|ton|mandi|faisal|khareed|bechna|taiyaar)\b/.test(lower)) {
    return 'hinglish';
  }
  return 'english';
};

const assistantResponseFallback = (requirement: ParsedVoiceIntent, context: AssistantContext, originalText?: string): string => {
  const lang = detectLanguage(originalText ?? JSON.stringify(requirement));
  const product = requirement.product ?? 'produce';
  const quantity = requirement.quantity !== null ? `${requirement.quantity}` : '';
  const unit = requirement.unit ?? '';
  const quality = requirement.quality ? `${requirement.quality} ` : '';
  const location = requirement.location ? ` ${requirement.location}` : '';
  const date = requirement.date === DEMO_TOMORROW_DATE ? (lang === 'hinglish' ? ' kal' : ' tomorrow') : '';

  const qtyUnit = quantity ? `${quantity} ${unit}`.trim() : '';

  const priceText = requirement.price !== null && requirement.price !== undefined ? ` @ ₹${requirement.price}/kg` : '';

  if (requirement.intent === 'BUYER') {
    if (lang === 'hinglish') {
      let msg = `Bilkul. Aapko${location} ${qtyUnit}${priceText ? ` ${priceText}` : ''} ${quality}${product} chahiye${date}. Main aapke liye suitable farmers dhoondh raha hoon.`;
      if (context.farmersFound !== undefined) {
        msg = context.farmersFound > 0
          ? `${context.farmersFound} suitable farmers mile hain${location ? ` ${location} ke aas paas` : ''}. ${qtyUnit} ${product} ke liye best matches taiyaar hain.`
          : `Is requirement ke liye abhi suitable farmer nahi mila. Kya aap location ya quantity badalna chahenge?`;
      }
      return msg;
    }
    let msg = `Got it. You need ${qtyUnit}${priceText ? ` ${priceText}` : ''} of ${quality}${product}${location ? ' in' + location : ''}${date ? ' by' + date : ''}. I'll find suitable farmers for you.`;
    if (context.farmersFound !== undefined) {
      msg = context.farmersFound > 0
        ? `Found ${context.farmersFound} suitable farmers for your requirement${location ? ` near` + location : ''}. The best matches are ready for you to review.`
        : `I couldn't find a suitable farmer for this requirement. Try adjusting location or quantity.`;
    }
    return msg;
  }

  if (requirement.intent === 'SELLER') {
    if (lang === 'hinglish') {
      let msg = `Bilkul. Aapke paas ${qtyUnit}${priceText ? ` ${priceText}` : ''} ${quality}${product} hain${location ? ` ${location} mein` : ''}. Main aapke liye suitable buyers dhoondh raha hoon.`;
      if (context.buyersFound !== undefined) {
        msg = context.buyersFound > 0
          ? `${context.buyersFound} suitable buyers mile hain. ${qtyUnit} ${product} ke liye best buyers taiyaar hain.`
          : `Is produce ke liye abhi suitable buyer nahi mila. Kya aap price ya location adjust karna chahenge?`;
      }
      return msg;
    }
    let msg = `Got it. You have ${qtyUnit}${priceText ? ` ${priceText}` : ''} of ${quality}${product}${location ? ' in' + location : ''} to sell. I'll find suitable buyers for you.`;
    if (context.buyersFound !== undefined) {
      msg = context.buyersFound > 0
        ? `Found ${context.buyersFound} suitable buyers for your ${qtyUnit} ${product}. The best matches are ready for you to review.`
        : `I couldn't find a suitable buyer for this produce right now.`;
    }
    return msg;
  }

  // UNKNOWN intent - helpful prompt in same language
  return lang === 'hinglish'
    ? `Samajh nahi paya. Kripya saaf bolo: jaise "Mujhe 500 kilo tamatar chahiye Ghaziabad mein" ya "Mere paas 2 ton aloo hain, buyers dhoondho".`
    : `I didn't catch that. Try saying: "I need 500 kg tomatoes in Ghaziabad" or "I have 2 tonnes potatoes to sell".`;
};

export const callVoiceAssistant = async (text: string, opts?: { sessionId?: string; farmerId?: string }): Promise<VoiceAssistantResponse> => {
  const sid = opts?.sessionId || getVoiceSessionId();
  console.log('[FRONTEND] voice-assistant calling /api/voice-assistant', { text: text.slice(0,60), sid });
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    console.error('[FRONTEND] voice-assistant timeout after 20000ms');
    controller.abort();
  }, 20000);
  try {
    const res = await fetch(VOICE_ASSISTANT_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, session_id: sid, farmerId: opts?.farmerId || 'f-001' }),
      signal: controller.signal,
    });
    console.log('[FRONTEND] voice-assistant status:', res.status);
    const payload = await res.json().catch(() => null) as any;
    console.log('[FRONTEND] voice-assistant payload:', payload);
    if (!res.ok) {
      console.error('[FRONTEND] voice-assistant non-ok detail (dev):', payload?.detail || payload?.error || `HTTP ${res.status}`);
      // Vite proxy returns 502 {"error":"Backend unavailable"} when backend down - treat as network so fallback gives farmer-friendly message, not raw error
      const err: any = new Error(payload?.error || `HTTP ${res.status}`);
      err.name = 'TypeError';
      throw err;
    }
    if (payload && payload.session_id) {
      try { localStorage.setItem(VOICE_SESSION_KEY, payload.session_id); } catch {}
    }
    if (!payload) throw new Error('empty response');
    if (payload.success === false && payload.message) {
      return payload as VoiceAssistantResponse;
    }
    if (!payload.success && payload.error) {
      throw new Error(payload.error);
    }
    // Ensure required fields exist for UI fallback
    if (!payload.message) payload.message = 'Samajh gaya.';
    if (!Array.isArray(payload.missing_fields)) payload.missing_fields = [];
    return payload as VoiceAssistantResponse;
  } catch (e:any) {
    const isNetwork = e?.message?.includes('Failed to fetch') || e?.message?.includes('Backend unavailable') || e?.message?.includes('ECONNREFUSED') || e?.name === 'TypeError' || e?.name === 'AbortError';
    const isTimeout = e?.name === 'AbortError' || e?.message?.includes('timeout');
    console.error('[FRONTEND] voice-assistant fetch failed', e);
    // Farmer-friendly fallback: use local parser to avoid showing raw network error to farmer
    const fallback = (() => {
      const fb = parseVoiceIntentFallback(text);
      // Inline language detect to avoid dependency on later const (handles hi/hinglish/en)
      const detectLocal = (t: string): 'hi'|'hinglish'|'en' => {
        if (/[\u0900-\u097F]/.test(t)) return 'hi';
        const lower = t.toLowerCase();
        if (/(mujhe|chahiye|paas|hai|hain|dhoondho|kal|tamatar|aloo|pyaaz|gehu|gehun|chawal|mera|mere|kilo|ton|rupaye|rupaiya|grade|haan|nahi|bechna|khareed|kharid)/.test(lower)) return 'hinglish';
        return 'en';
      };
      const lang = detectLocal(text);
      let intent: VoiceAssistantIntent = 'HELP';
      if (fb.intent === 'SELLER') intent = 'SELL_PRODUCE';
      else if (fb.intent === 'BUYER') intent = 'BUY_PRODUCE';
      const data: VoiceAssistantData = {
        product: fb.product || null,
        quantity: fb.quantity || null,
        unit: fb.unit || null,
        grade: fb.quality ? (fb.quality.includes('A') ? 'A' : fb.quality.includes('B') ? 'B' : fb.quality) : null,
        price_per_kg: fb.price || null,
        currency: fb.price ? 'INR' : null,
        location: fb.location || null,
      };
      const missing: string[] = [];
      if (!data.product) missing.push('product');
      if (data.quantity == null) missing.push('quantity');
      if (!data.grade) missing.push('grade');
      if (data.price_per_kg == null) missing.push('price_per_kg');
      const requires_confirmation = missing.length === 0 && !!data.product;
      let message = '';
      if (missing.length > 0) {
        if (lang === 'hinglish') message = data.quantity != null ? `Aapke paas ${data.quantity} kg ${data.product || 'produce'} hain. Aapka grade aur price kya hai?` : `Kaunsa product aur kitni quantity hai?`;
        else if (lang === 'hi') message = 'कृपया बाकी जानकारी बताएं।';
        else message = missing.includes('quantity') ? `How many kilograms of ${data.product || 'produce'} do you have?` : `What is the grade and price?`;
      } else {
        if (lang === 'hinglish') message = `Samajh gaya. Aapke paas ${data.quantity} kg Grade ${data.grade || 'A'} ${data.product} hain, ₹${data.price_per_kg}/kg par. Kya aap ise marketplace par sell karna chahte hain?`;
        else if (lang === 'hi') message = `समझ गया। आपके पास ${data.quantity} किलो ${data.product} हैं, ₹${data.price_per_kg}/kg पर।`;
        else message = `Got it. You have ${data.quantity} kg of Grade ${data.grade || 'A'} ${data.product} at ₹${data.price_per_kg}/kg.`;
      }
      return {
        success: true,
        intent,
        language: lang as any,
        data,
        message,
        missing_fields: missing,
        requires_confirmation,
        confirmation_card: requires_confirmation ? data as any : null,
        session_id: sid,
      } as VoiceAssistantResponse;
    })();
    if (isNetwork || isTimeout) {
      console.warn('[FRONTEND] voice-assistant network/timeout, using local fallback parsed:', fallback);
      if (!fallback.data.product && fallback.missing_fields.length > 2) {
        const friendly = getVoiceSessionId() ? (fallback.language === 'hi' ? 'कनेक्शन में समस्या आ गई। कृपया दोबारा प्रयास करें।' : fallback.language === 'hinglish' ? 'Connection mein problem aa gayi. Ek baar phir try karein.' : "We couldn't connect right now. Please try again.") : 'Connection mein problem aa gayi.';
        return { ...fallback, message: friendly + ' ' + fallback.message, success: true };
      }
      return fallback;
    }
    throw e;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
};

export const generateAssistantResponse = async (
  requirement: ParsedVoiceIntent,
  context: AssistantContext,
  originalText?: string,
): Promise<string> => {
  console.log('[FRONTEND] calling /api/assistant-response with:', requirement, context);
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    console.error('[FRONTEND] assistant-response abort after 20000ms');
    controller.abort();
  }, 20000);

  try {
    const fetchPromise = fetch(ASSISTANT_RESPONSE_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirement, context, originalText }),
      signal: controller.signal,
    });

    const response = await withFetchTimeout(fetchPromise, 20000, 'assistant-response');
    console.log('[FRONTEND] assistant-response status:', response.status);

    if (!response.ok) {
      console.warn(`[aiService] /api/assistant-response ${response.status}, using fallback`);
      const fallback = assistantResponseFallback(requirement, context, originalText);
      console.log('[FRONTEND] assistant-response fallback (non-ok):', fallback);
      return fallback;
    }

    const payload: unknown = await withFetchTimeout(response.json() as Promise<unknown>, 2000, 'assistant-response json');
    console.log('[FRONTEND] assistant-response payload:', payload);
    if (payload && typeof payload === 'object' && 'response' in payload && typeof (payload as { response: unknown }).response === 'string') {
      const text = (payload as { response: string }).response.trim();
      if (!text) {
        console.warn('[aiService] Empty AI response, using fallback');
        const fallback = assistantResponseFallback(requirement, context, originalText);
        console.log('[FRONTEND] final response received (empty fallback):', fallback);
        return fallback;
      }
      console.log('[FRONTEND] final response received:', text);
      return text;
    }

    console.warn('[aiService] Invalid assistant response, using fallback', payload);
    const fallback = assistantResponseFallback(requirement, context, originalText);
    console.log('[FRONTEND] final response fallback (invalid):', fallback);
    return fallback;
  } catch (e: any) {
    if (e?.name === 'AbortError' || e?.message?.includes('timeout')) {
      console.warn('[aiService] assistant-response timeout after 20s, using fallback');
      console.log('[FRONTEND] assistant-response timeout fallback');
    } else {
      console.warn('[aiService] assistant-response failed, using fallback', e?.message);
      console.log('[FRONTEND] assistant-response error fallback:', e?.message);
    }
    const fallback = assistantResponseFallback(requirement, context, originalText);
    console.log('[FRONTEND] final response fallback (catch):', fallback);
    return fallback;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
};

export const matchFarmers = (requirement: RequirementInput | BuyerRequirement | ParsedVoiceIntent): FarmerMatchResult[] => {
  const normalizedRequirement = requirementFromInput(requirement);
  const requiredProduct = normalizeProduct(normalizedRequirement.product);

  return mockProduceListings
    .filter((listing) => productMatches(listing.name, requiredProduct))
    .map((listing) => {
      const farmer = findFarmer(listing);
      const breakdown: MatchBreakdown = {
        availability: clampScore((listing.quantityKg / normalizedRequirement.quantityKg) * 100),
        price: priceScoreForBuyer(listing.expectedPricePerKg, normalizedRequirement.budgetPerKg),
        distance: distanceScore(getDistanceKm(farmer)),
        quality: qualityScore(listing.grade, normalizedRequirement.quality),
        reliability: clampScore(getReliability(farmer)),
      };

      return {
        farmer,
        listing,
        totalScore: weightedScore(breakdown),
        breakdown,
        explanation: `${farmer.name} can supply ${listing.quantityKg} kg ${listing.grade} ${requiredProduct ?? normalizedRequirement.product} at ₹${listing.expectedPricePerKg}/kg from ${listing.location}. Reliability is ${breakdown.reliability}%.`,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore);
};

export const matchBuyers = (listing: ListingInput | Produce | ParsedVoiceIntent): BuyerMatchResult[] => {
  const normalizedListing = listingFromInput(listing);
  const listedProduct = normalizeProduct(normalizedListing.product);

  return mockBuyerRequirements
    .filter((requirement) => productMatches(requirement.produceName, listedProduct))
    .map((requirement) => {
      const buyer = findBuyer(requirement);
      const breakdown: MatchBreakdown = {
        availability: clampScore((normalizedListing.quantityKg / requirement.quantityKg) * 100),
        price: priceScoreForSeller(requirement.budgetPerKg, normalizedListing.askPricePerKg),
        distance: distanceScore(getDistanceKm(buyer)),
        quality: qualityScore(normalizedListing.quality, requirement.grade),
        reliability: clampScore(getReliability(buyer)),
      };

      return {
        buyer,
        requirement,
        totalScore: weightedScore(breakdown),
        breakdown,
        explanation: `${buyer.name} needs ${requirement.quantityKg} kg ${requirement.grade ?? ''} ${listedProduct ?? normalizedListing.product} with a ₹${requirement.budgetPerKg}/kg budget. Buyer reliability is ${breakdown.reliability}%.`,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore);
};

export const aggregateSupply = (requirement: RequirementInput | BuyerRequirement | ParsedVoiceIntent): AggregatedSupplyResult => {
  const normalizedRequirement = requirementFromInput(requirement);
  let remainingKg = normalizedRequirement.quantityKg;
  const allocations: SupplyAllocation[] = [];

  const listings = matchFarmers(normalizedRequirement)
    .map((match) => match.listing)
    .sort((a, b) => b.quantityKg - a.quantityKg);

  for (const listing of listings) {
    if (remainingKg <= 0) break;
    const allocatedKg = Math.min(remainingKg, listing.quantityKg);
    allocations.push({
      farmer: findFarmer(listing),
      listing,
      allocatedKg,
    });
    remainingKg -= allocatedKg;
  }

  const fulfilledKg = normalizedRequirement.quantityKg - remainingKg;

  return {
    requestedKg: normalizedRequirement.quantityKg,
    fulfilledKg,
    remainingKg,
    isFulfilled: remainingKg === 0,
    allocations,
    explanation: remainingKg === 0 ? `${fulfilledKg} kg fulfilled through greedy allocation.` : `${fulfilledKg} kg allocated, ${remainingKg} kg still open.`,
  };
};

export const suggestNegotiation = (buyerOffer: number, farmerAsk: number): NegotiationResult => {
  const gap = farmerAsk - buyerOffer;
  const suggestedPricePerKg = Math.round((buyerOffer + gap * 0.67) * 100) / 100;
  const confidence = clampScore(88 - Math.max(0, gap - 3) * 6);

  return {
    suggestedPricePerKg,
    reasoning: [
      `Buyer offer is ₹${buyerOffer}/kg and farmer ask is ₹${farmerAsk}/kg.`,
      `A ₹${suggestedPricePerKg}/kg counter keeps most farmer value while narrowing the buyer gap.`,
      'This is a suggestion only; no offer is automatically accepted or sent.',
    ],
    confidence,
  };
};

export const optimizeRoute = (pickup: string | Address, destination: string | Address, cargo: CargoInput): OptimizedRouteResult => {
  const pickupLabel = typeof pickup === 'string' ? pickup : pickup.formattedAddress;
  const destinationLabel = typeof destination === 'string' ? destination : destination.formattedAddress;
  const routes: OptimizedRouteOption[] = [
    { id: 'A', label: 'Route A', distanceKm: 42, costInr: 5200, durationHours: 3.5, recommended: false, explanation: 'Longest route with higher toll exposure.' },
    { id: 'B', label: 'Route B', distanceKm: 31, costInr: 3900, durationHours: 2.4, recommended: false, explanation: 'Balanced route with moderate cost and time.' },
    { id: 'C', label: 'Route C', distanceKm: 28, costInr: 3400, durationHours: 2, recommended: true, explanation: 'Shortest and lowest-cost route; recommended for this cargo.' },
  ];

  return {
    pickup: pickupLabel,
    destination: destinationLabel,
    cargo,
    routes,
    recommendedRoute: routes[2],
  };
};

export const voiceIntentDemoInputs = [
  'I need 500 kg Grade A tomatoes in Ghaziabad tomorrow.',
  'Mujhe 500 kilo Grade A tamatar chahiye, Ghaziabad mein kal tak.',
  'I have 2 tonnes Grade A potatoes to sell.',
  'Mere paas 2 ton Grade A aloo hain, mujhe buyers dhoondho.',
  'Mujhe 200 kg achhe quality ke tamatar Delhi mein kal chahiye.',
  'I need 500 kg tomatoes.',
  'Mere paas 1 tonne onions hain, buyers dhoondho.',
  'Please help me with something.',
];

export const runVoiceIntentDemoCalls = () => Promise.all(voiceIntentDemoInputs.map((input) => parseVoiceIntent(input)));

export const aiServiceDemoCalls = {
  voiceIntentInputs: voiceIntentDemoInputs,
  voiceIntents: runVoiceIntentDemoCalls,
  farmerMatches: matchFarmers({
    product: 'Tomato',
    quantityKg: 500,
    quality: 'Grade A',
    location: 'Ghaziabad',
    date: DEMO_TOMORROW_DATE,
    budgetPerKg: 31,
  }),
  buyerMatches: matchBuyers({
    product: 'Potato',
    quantityKg: 2000,
    quality: 'Grade A',
    location: 'Ghaziabad',
    askPricePerKg: 22,
  }),
  aggregatedSupply: aggregateSupply({
    product: 'Tomato',
    quantityKg: 1450,
    quality: 'Grade A',
    location: 'Ghaziabad',
    budgetPerKg: 31,
  }),
  negotiation: suggestNegotiation(24, 27),
  optimizedRoutes: optimizeRoute('Muradnagar, Ghaziabad', 'Azadpur, Delhi', {
    product: 'Potato',
    quantityKg: 1000,
  }),
};

export const assistantResponseTestCases = [
  {
    label: 'English BUYER',
    input: 'I need 500 kg Grade A tomatoes in Ghaziabad tomorrow.',
    requirement: { intent: 'BUYER' as const, product: 'Tomato', quantity: 500, unit: 'kg' as const, quality: 'Grade A', location: 'Ghaziabad', date: DEMO_TOMORROW_DATE, price: null },
    context: {} as AssistantContext,
  },
  {
    label: 'Hindi/Hinglish BUYER',
    input: 'Mujhe 500 kilo Grade A tamatar chahiye, Ghaziabad mein kal tak.',
    requirement: { intent: 'BUYER' as const, product: 'Tomato', quantity: 500, unit: 'kg' as const, quality: 'Grade A', location: 'Ghaziabad', date: DEMO_TOMORROW_DATE, price: null },
    context: {} as AssistantContext,
  },
  {
    label: 'English SELLER',
    input: 'I have 2 tonnes Grade A potatoes to sell.',
    requirement: { intent: 'SELLER' as const, product: 'Potato', quantity: 2, unit: 'tonnes' as const, quality: 'Grade A', location: null, date: null, price: null },
    context: {} as AssistantContext,
  },
  {
    label: 'Hindi/Hinglish SELLER',
    input: 'Mere paas 2 ton Grade A aloo hain, mujhe buyers dhoondho.',
    requirement: { intent: 'SELLER' as const, product: 'Potato', quantity: 2, unit: 'tonnes' as const, quality: 'Grade A', location: null, date: null, price: null },
    context: {} as AssistantContext,
  },
  {
    label: 'Mixed Hinglish',
    input: 'Mujhe 200 kg achhe quality ke tamatar Delhi mein kal chahiye.',
    requirement: { intent: 'BUYER' as const, product: 'Tomato', quantity: 200, unit: 'kg' as const, quality: 'Grade A', location: 'Delhi', date: DEMO_TOMORROW_DATE, price: null },
    context: {} as AssistantContext,
  },
  {
    label: 'Missing price',
    input: 'I need 500 kg tomatoes.',
    requirement: { intent: 'BUYER' as const, product: 'Tomato', quantity: 500, unit: 'kg' as const, quality: null, location: null, date: null, price: null },
    context: {} as AssistantContext,
  },
  {
    label: 'Seller without quality',
    input: 'Mere paas 1 tonne onions hain, buyers dhoondho.',
    requirement: { intent: 'SELLER' as const, product: 'Onion', quantity: 1, unit: 'tonnes' as const, quality: null, location: null, date: null, price: null },
    context: {} as AssistantContext,
  },
  {
    label: 'No-match context',
    input: 'I need 500 kg Grade A tomatoes in Ghaziabad tomorrow.',
    requirement: { intent: 'BUYER' as const, product: 'Tomato', quantity: 500, unit: 'kg' as const, quality: 'Grade A', location: 'Ghaziabad', date: DEMO_TOMORROW_DATE, price: null },
    context: { farmersFound: 0 } as AssistantContext,
  },
  {
    label: 'Match context',
    input: 'I need 500 kg Grade A tomatoes in Ghaziabad tomorrow.',
    requirement: { intent: 'BUYER' as const, product: 'Tomato', quantity: 500, unit: 'kg' as const, quality: 'Grade A', location: 'Ghaziabad', date: DEMO_TOMORROW_DATE, price: null },
    context: { farmersFound: 3, farmerNames: ['Ramesh Kumar', 'Suresh Singh', 'Priya Devi'] } as AssistantContext,
  },
];

export const runAssistantResponseTests = () =>
  Promise.all(
    assistantResponseTestCases.map((tc) =>
      generateAssistantResponse(tc.requirement, tc.context, tc.input).then((response) => ({
        label: tc.label,
        input: tc.input,
        response,
      })),
    ),
  );
