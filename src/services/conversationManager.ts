// Local, dynamic slot-filling conversation engine (no API calls).
// Port of the Phase 1 server conversation manager (server/conversationManager.mjs)
// so the FarmDirect voice agent works entirely in the browser.
//
// Rules:
// - Collect the full Phase 1 listing schema (farmer_name, phone, product, quantity,
//   unit, asking_price, price_unit, location, quality, intent, source).
// - Never invent information; merge only what the farmer actually said.
// - Never re-ask for anything already provided.
// - Ask exactly one question per turn for the next missing field.
// - Allow multiple fields in a single sentence ("Mera naam Raj Kumar hai aur mere
//   paas 20 kilo wheat hai" fills 4 slots at once).

import {
  normalizeProduct,
  parseQuantity,
  parsePrice,
  parseGrade,
  parseIntent,
  detectLocation,
  extractNameFromText,
  extractPhoneFromText,
  extractStandaloneNumber,
  isBareProductUtterance,
  isKnownCrop,
  looksLikeCleanValue,
} from './listingParser.ts';

export type ListingData = {
  farmer_name: string | null;
  phone: string | null;
  product: string | null;
  quantity: number | null;
  unit: string | null;
  asking_price: number | null;
  price_unit: string | null;
  location: string | null;
  quality: string | null;
  intent: 'sell' | 'buy';
  source: 'voice_agent';
};

export type ConversationState =
  | 'IDLE'
  | 'LISTENING'
  | 'PROCESSING'
  | 'ASKING'
  | 'CONFIRMING'
  | 'SUBMITTING'
  | 'SUCCESS'
  | 'CANCELLED'
  | 'ERROR';

export interface ConversationTurn {
  role: 'farmer' | 'agent';
  text: string;
  timestamp: number;
}

export interface ConversationSession {
  id: string;
  state: ConversationState;
  listing: ListingData;
  listing_id?: string;
  turns: ConversationTurn[];
  language: 'hi' | 'hinglish' | 'en';
  last_asked: string | null;
  quality_asked: boolean;
  last_echo_field: string | null;
  greeted: boolean;
  confirmation_stage: 'changes' | null;
  created_at: number;
  updated_at: number;
}

export interface ConversationTurnResult {
  success: boolean;
  state: ConversationState;
  listing: ListingData;
  agent_message: string;
  missing_fields: string[];
  next_field?: string;
  session_id: string;
  listing_id?: string;
  error?: string;
}

export const REQUIRED_FIELDS = [
  'farmer_name',
  'phone',
  'product',
  'quantity',
  'unit',
  'asking_price',
  'price_unit',
  'location',
  'intent',
] as const;

const EMPTY_LISTING: ListingData = {
  farmer_name: null,
  phone: null,
  product: null,
  quantity: null,
  unit: null,
  asking_price: null,
  price_unit: null,
  location: null,
  quality: null,
  intent: 'sell',
  source: 'voice_agent',
};

const PRODUCT_SAY: Record<string, { hi: string; en: string }> = {
  Tomato: { hi: 'tamatar', en: 'tomatoes' },
  Potato: { hi: 'aalu', en: 'potatoes' },
  Onion: { hi: 'pyaaz', en: 'onions' },
  Wheat: { hi: 'gehun', en: 'wheat' },
  Rice: { hi: 'chawal', en: 'rice' },
  Cauliflower: { hi: 'gobhi', en: 'cauliflower' },
  Cabbage: { hi: 'patta gobhi', en: 'cabbage' },
  Carrot: { hi: 'gajar', en: 'carrots' },
  Peas: { hi: 'matar', en: 'peas' },
  Apple: { hi: 'seb', en: 'apples' },
  Banana: { hi: 'kela', en: 'bananas' },
  Mango: { hi: 'aam', en: 'mangoes' },
};

const sessions = new Map<string, ConversationSession>();

const getSession = (sessionId: string): ConversationSession | undefined => {
  return sessions.get(sessionId);
};

const detectLanguage = (text: string): 'hi' | 'hinglish' | 'en' => {
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  const lower = text.toLowerCase();
  if (
    /(namaste|namaskar|mere|mera|meri|paas|hai|hain|kaun|kitna|kitne|kya|mein|ho|hun|hoon|chahiye|rupaye|naam|nahi|haan|theek|bataiye|chahte|chahenge|tamatar|gehu|chawal|aalu|pyaz|gajar|matar|bhindi|gobhi|palak|mirch|adrak|lahsun|chini|namak|tel|doodh|paneer|ghee|atta|maida|dal|chana|moong|masoor|urad|arhar|moongfali|sesame|sarson|sunflower)/.test(
      lower
    )
  ) {
    return 'hinglish';
  }
  return 'en';
};

const isHiLang = (language: string) => language === 'hi' || language === 'hinglish';

const numberToHindiWords = (n: number, language: string = 'hinglish'): string => {
  if (n == null || isNaN(n)) return '';
  if (n === 0) return language === 'hi' ? 'शून्य' : 'shunya';
  if (n < 0) return (language === 'hi' ? 'माइनस ' : 'minus ') + numberToHindiWords(-n, language);

  const isDev = language === 'hi';

  const onesDev = ['', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ',
    'दस', 'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस'];
  const onesHing = ['', 'ek', 'do', 'teen', 'chaar', 'paanch', 'chhe', 'saat', 'aath', 'nau',
    'das', 'gyaarah', 'baarah', 'terah', 'chaudah', 'pandrah', 'solah', 'satrah', 'athaarah', 'unnis'];

  const tensDev = ['', '', 'बीस', 'तीस', 'चालीस', 'पचास', 'साठ', 'सत्तर', 'अस्सी', 'नब्बे'];
  const tensHing = ['', '', 'bees', 'tees', 'chalis', 'pachaas', 'saath', 'sattar', 'assi', 'nabbe'];

  const hundredsDev = ['', 'एक सौ', 'दो सौ', 'तीन सौ', 'चार सौ', 'पाँच सौ', 'छह सौ', 'सात सौ', 'आठ सौ', 'नौ सौ'];
  const hundredsHing = ['', 'ek sau', 'do sau', 'teen sau', 'chaar sau', 'paanch sau', 'chhe sau', 'saat sau', 'aath sau', 'nau sau'];

  const ones = isDev ? onesDev : onesHing;
  const tens = isDev ? tensDev : tensHing;
  const hundreds = isDev ? hundredsDev : hundredsHing;

  if (n < 20) return ones[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return tens[t] + (o ? ' ' + ones[o] : '');
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const remainder = n % 100;
    return hundreds[h] + (remainder ? ' ' + numberToHindiWords(remainder, language) : '');
  }
  if (n < 100000) {
    const thousands = Math.floor(n / 1000);
    const remainder = n % 1000;
    const prefix = (thousands === 1 ? (isDev ? 'एक हज़ार' : 'ek hazaar') : numberToHindiWords(thousands, language) + (isDev ? ' हज़ार' : ' hazaar'));
    return prefix + (remainder ? ' ' + numberToHindiWords(remainder, language) : '');
  }
  if (n < 10000000) {
    const lakhs = Math.floor(n / 100000);
    const remainder = n % 100000;
    const prefix = (lakhs === 1 ? (isDev ? 'एक लाख' : 'ek lakh') : numberToHindiWords(lakhs, language) + (isDev ? ' लाख' : ' lakh'));
    return prefix + (remainder ? ' ' + numberToHindiWords(remainder, language) : '');
  }
  return String(n);
};

const resolveLanguage = (session: ConversationSession, text: string): 'hi' | 'hinglish' | 'en' => {
  const detected = detectLanguage(text);
  const trimmed = text.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const isYesNo = /^(haan|ha|haanji|yes|yep|yup|ji|ok|okay|theek|no|nahi|nahin|nope)$/i.test(
    trimmed.replace(/[.,!?]/g, '')
  );
  if (session.language && (isYesNo || (detected === 'en' && wordCount <= 4))) {
    return session.language;
  }
  return detected;
};

const isNoiseAnswer = (text: string) => {
  const lower = text.trim().toLowerCase().replace(/[.,!?]/g, '');
  return /^(nahi|nahin|no|nope|haan|ha|yes|ji|ok|okay|theek|sahi|galat|wrong|change|modify)$/.test(lower);
};

const isCorrectionText = (text: string) => {
  const lower = text.toLowerCase().trim();
  return (
    /^(nahi|nahin|no|nope|galat|wrong|wait|actually|actually,)\b/.test(lower) ||
    /\b(galat|wrong|change|badal|nahi\s*,|actually\s*,|not\s+\d)/.test(lower)
  );
};

const DATA_KEYS: (keyof ListingData)[] = [
  'farmer_name',
  'phone',
  'product',
  'quantity',
  'unit',
  'asking_price',
  'location',
  'quality',
];

const hasExtractedData = (extracted: Partial<ListingData>) =>
  DATA_KEYS.some((k) => extracted[k] !== null && extracted[k] !== undefined);

// Words a farmer uses when naming what they want to change.
const FIELD_WORDS: Record<string, RegExp> = {
  asking_price: /\b(price|kimat|keemat|rate|bhav|daam)\b/i,
  quantity: /\b(vajan|wajan|weight|quantity|kitne\s+kilo|kitna\s+kilo)\b/i,
  product: /\b(product|crop|fasal|saman)\b/i,
  location: /\b(location|address|gaon|village|shehar|city|jagah)\b/i,
  phone: /\b(phone|number|mobile)\b/i,
  farmer_name: /\b(name|naam)\b/i,
  quality: /\b(quality|grade|kisam|kism)\b/i,
};

const detectChangeField = (text: string): string | null => {
  for (const [field, re] of Object.entries(FIELD_WORDS)) {
    if (re.test(text)) return field;
  }
  return null;
};

const titleCase = (s: string) =>
  s
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const generateChangeQuestion = (field: string, language: string): string => {
  if (isHiLang(language)) {
    const questions: Record<string, string> = {
      asking_price: 'Kitne rupaye hai?',
      quantity: 'Kitna bechna hai?',
      product: 'Ab kya bechna hai?',
      location: 'Nayi jagah kahan hai?',
      phone: 'Naya mobile number kya hai?',
      farmer_name: 'Aapka sahi naam kya hai?',
      quality: 'Quality kya rahegi?',
    };
    return questions[field] || 'Kya badalna hai?';
  }
  const questions: Record<string, string> = {
    asking_price: 'How much is the price now?',
    quantity: 'How much do you want to sell now?',
    product: 'What do you want to sell instead?',
    location: 'Which place now?',
    phone: 'What is the new mobile number?',
    farmer_name: 'What is your correct name?',
    quality: 'What quality?',
  };
  return questions[field] || 'What should I change?';
};

const sayProduct = (product: string | null, language: string): string => {
  if (!product) return isHiLang(language) ? 'saman' : 'produce';
  const map = PRODUCT_SAY[product];
  // For Hindi/Hinglish, always use Hindi product name (e.g., Potato → aalu)
  // Dynamically for ALL products without hardcoding user data.
  if (map) return isHiLang(language) ? map.hi : map.en;
  // Unknown product — use it as-is (title-cased by extraction), dynamically.
  return String(product);
};

const sayQty = (listing: ListingData, language: string): string | null => {
  if (listing.quantity == null) return null;
  const unit = listing.unit || 'kg';
  const isHi = language === 'hi';
  const isHing = language === 'hinglish';
  const isHiL = isHi || isHing;

  const unitSay: Record<string, { hi: string; en: string }> = {
    kg: { hi: 'किलो', en: 'kg' },
    tonnes: { hi: 'टन', en: 'tonnes' },
    litre: { hi: 'लीटर', en: 'litre' },
    piece: { hi: 'पीस', en: 'pieces' },
    bag: { hi: 'बोरी', en: 'bags' },
    dozen: { hi: 'दर्जन', en: 'dozen' },
  };
  const labels = unitSay[unit] || { hi: unit, en: unit };
  const label = isHi ? labels.hi : isHing ? (unit === 'kg' ? 'kilo' : labels.hi) : labels.en;
  // Use Hindi number words for natural speech in Hindi/Hinglish
  const numStr = isHiL ? numberToHindiWords(listing.quantity, language) : String(listing.quantity);
  return `${numStr} ${label}`;
};

const sayPrice = (listing: ListingData, language: string): string | null => {
  if (listing.asking_price == null) return null;
  const priceUnit = listing.price_unit || 'kg';
  const isHi = language === 'hi';
  const isHing = language === 'hinglish';
  const isHiL = isHi || isHing;

  const unitLabel: Record<string, { hi: string; en: string }> = {
    kg: { hi: 'किलो', en: 'kg' },
    litre: { hi: 'लीटर', en: 'litre' },
    piece: { hi: 'पीस', en: 'piece' },
    bag: { hi: 'बोरी', en: 'bag' },
    dozen: { hi: 'दर्जन', en: 'dozen' },
  };
  const labels = unitLabel[priceUnit] || { hi: priceUnit, en: priceUnit };
  const uLabel = isHi ? labels.hi : isHing ? (priceUnit === 'kg' ? 'kilo' : labels.hi) : labels.en;
  // Use Hindi number words for natural speech in Hindi/Hinglish
  const numStr = isHiL ? numberToHindiWords(listing.asking_price, language) : String(listing.asking_price);
  if (isHi) {
    return `${numStr} रुपये ${uLabel}`;
  }
  if (isHing) {
    return `${numStr} rupaye ${uLabel}`;
  }
  return `${listing.asking_price} rupees per ${uLabel}`;
};

const sayPhone = (phone: string | null): string | null => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  // Digit-by-digit so the farmer can verify each number when spoken aloud.
  return digits.split('').join(' ');
};

const mergeListing = (existing: ListingData, extracted: Partial<ListingData>): ListingData => {
  const merged: ListingData = { ...existing };
  for (const key of Object.keys(extracted) as (keyof ListingData)[]) {
    const value = extracted[key];
    if (value !== null && value !== undefined) {
      // Empty string signals "clear this field" (e.g., name matched as product).
      (merged as Record<string, unknown>)[key] = value === '' ? null : value;
    }
  }
  // price_unit always follows asking_price when not explicitly given.
  if (merged.asking_price !== null && merged.price_unit === null) {
    merged.price_unit = 'kg';
  }
  return merged;
};

const getMissingRequiredFields = (listing: ListingData): string[] =>
  (REQUIRED_FIELDS as readonly string[]).filter(
    (f) => (listing as Record<string, unknown>)[f] === null || (listing as Record<string, unknown>)[f] === undefined
  );

const isComplete = (listing: ListingData) => getMissingRequiredFields(listing).length === 0;

const getPriorityNextField = (missing: string[]): string => {
  // Ask name before phone: farmers naturally give their name before their
  // number, so a name-only answer must never be dropped mid-flow.
  // Quality comes after price (matches the example flow) but never blocks
  // confirmation - it is asked once and skipped if unanswered.
  const order = ['product', 'quantity', 'asking_price', 'quality', 'location', 'farmer_name', 'phone'];
  for (const f of order) {
    if (missing.includes(f)) return f;
  }
  return missing[0] ?? '';
};

const generateQuestion = (field: string, language: string, listing?: ListingData): string => {
  const product = listing?.product ? sayProduct(listing.product, language) : null;
  if (isHiLang(language)) {
    const questions: Record<string, string> = {
      product: 'Aap kya bechna chahte hain?',
      quantity: 'Kitna bechna hai?',
      asking_price: 'Aap kitne rupaye mein bechna chahenge?',
      quality: product ? `${product} ki quality kaisi hai?` : 'Quality kaisi hai?',
      location: 'Aap kahan se hain?',
      phone: 'Aapka mobile number kya hai?',
      farmer_name: 'Aapka naam kya hai?',
      unit: 'Kya unit hai — kilo, tonne, litre, piece?',
      price_unit: 'Yeh kimat per kya hai?',
      intent: 'Bechna hai kya?',
    };
    return questions[field] || 'Thoda aur bataiye.';
  }
  const questions: Record<string, string> = {
    product: 'What do you want to sell?',
    quantity: 'How much do you want to sell?',
    asking_price: 'How much is the price?',
    quality: product ? `What is the quality of the ${product}?` : 'How is the quality?',
    location: 'Where are you from?',
    phone: 'What is your mobile number?',
    farmer_name: 'What is your name?',
    unit: 'What unit — kg, tonne, litre, piece?',
    price_unit: 'Is that price per kg?',
    intent: 'Do you want to sell?',
  };
  return questions[field] || 'Please tell me a bit more.';
};

const generateConfirmation = (listing: ListingData, _language: string): string => {
  // Single-stage final summary per spec — ONE complete dynamic listing.
  // Every value comes from the collected listing; nothing is hardcoded.
  const name = listing.farmer_name ?? '-';
  const phone = listing.phone ?? '-';
  const product = listing.product ?? '-';
  const qty = listing.quantity ?? '-';
  const unit = listing.unit ?? '-';
  const price = listing.asking_price ?? '-';
  const priceUnit = listing.price_unit ?? '-';
  const place = listing.location ?? '-';
  const quality = listing.quality ?? '-';
  return (
    `Yeh aapki listing ki details hain:\n` +
    `Naam: ${name}\n` +
    `Phone: ${phone}\n` +
    `Product: ${product}\n` +
    `Quantity: ${qty} ${unit}\n` +
    `Price: ₹${price}/${priceUnit}\n` +
    `Location: ${place}\n` +
    `Quality: ${quality}\n\n` +
    `Sab theek hai?`
  );
};

const isUnusableTurn = (extracted: Partial<ListingData>) => !hasExtractedData(extracted);

const generateEcho = (
  listing: ListingData,
  extracted: Partial<ListingData>,
  prevListing: ListingData,
  language: string
): string => {
  const hi = isHiLang(language);
  const product = listing.product ? sayProduct(listing.product, language) : null;
  const qty = sayQty(listing, language);
  const price = sayPrice(listing, language);
  const qtyChanged =
    prevListing?.quantity != null && extracted.quantity != null && prevListing.quantity !== extracted.quantity;
  const priceChanged =
    prevListing?.asking_price != null &&
    extracted.asking_price != null &&
    prevListing.asking_price !== extracted.asking_price;
  const productChanged = prevListing?.product && extracted.product && prevListing.product !== extracted.product;
  const nameChanged =
    prevListing?.farmer_name && extracted.farmer_name != null && prevListing.farmer_name !== extracted.farmer_name;
  const phoneChanged =
    prevListing?.phone && extracted.phone != null && prevListing.phone !== extracted.phone;
  const locationChanged =
    prevListing?.location && extracted.location != null && prevListing.location !== extracted.location;
  const qualityChanged =
    prevListing?.quality && extracted.quality != null && prevListing.quality !== extracted.quality;
  const unitChanged =
    prevListing?.unit && extracted.unit != null && prevListing.unit !== extracted.unit;

  if (qtyChanged && product && qty) {
    return hi ? `Theek hai. Ab ${qty} ${product}.` : `Okay. Now ${qty} of ${product}.`;
  }
  if (priceChanged && price) {
    return hi ? `Theek hai. Ab ${price}.` : `Okay. Now ${price}.`;
  }
  if (productChanged && product) {
    return hi ? `Theek hai. Ab ${product}.` : `Okay. Now ${product}.`;
  }
  if (nameChanged && listing.farmer_name) {
    return hi ? `Theek hai. Ab naam ${listing.farmer_name}.` : `Okay. Now name ${listing.farmer_name}.`;
  }
  if (phoneChanged && listing.phone) {
    return hi ? `Theek hai. Ab number ${sayPhone(listing.phone)}.` : `Okay. Now number ${sayPhone(listing.phone)}.`;
  }
  if (locationChanged && listing.location) {
    return hi ? `Theek hai. Ab ${listing.location} se.` : `Okay. Now from ${listing.location}.`;
  }
  if (qualityChanged && listing.quality) {
    return hi ? `Theek hai. Ab quality ${listing.quality}.` : `Okay. Now quality ${listing.quality}.`;
  }
  if (unitChanged && qty) {
    return hi ? `Theek hai. Ab ${qty}.` : `Okay. Now ${qty}.`;
  }

  const justQty = extracted.quantity != null;
  const justProduct = extracted.product != null;
  const justPrice = extracted.asking_price != null;
  const justPlace = extracted.location != null;
  const justName = extracted.farmer_name != null;
  const justPhone = extracted.phone != null;
  const justQuality = extracted.quality != null;

  if ((justProduct || justQty) && product && qty) {
    let msg = hi
      ? `Ji. Aap ${qty} ${product} bechna chahte hain`
      : `Okay. You want to sell ${qty} of ${product}`;
    if (justPrice && price) msg += hi ? `, ${price}` : ` at ${price}`;
    if (justPlace && listing.location) msg += hi ? `, ${listing.location} se` : ` from ${listing.location}`;
    return `${msg}.`;
  }
  if (justPrice && price) {
    return hi ? `Ji. ${price}.` : `Okay. ${price}.`;
  }
  if (justPlace && listing.location) {
    return hi ? `Ji, ${listing.location} note kar liya.` : `Okay, noted ${listing.location}.`;
  }
  if (justName && listing.farmer_name) {
    return hi ? `Ji, ${listing.farmer_name}.` : `Okay, ${listing.farmer_name}.`;
  }
  if (justPhone && listing.phone) {
    return hi ? `Ji. Number ${sayPhone(listing.phone)}.` : `Okay. Number ${sayPhone(listing.phone)}.`;
  }
  if (justQuality && listing.quality) {
    return hi ? `Ji. Quality ${listing.quality}.` : `Okay. Quality ${listing.quality}.`;
  }
  if (justProduct && product) {
    return hi ? `Ji. ${product}.` : `Okay. ${product}.`;
  }
  if (justQty && qty) {
    return hi ? `Ji. ${qty}.` : `Okay. ${qty}.`;
  }
  return '';
};

// Which number did the agent last echo back to the farmer? Used to decide
// what a bare correction like "Nahi, 25 hain." refers to.
const lastEchoField = (extracted: Partial<ListingData>): string | null => {
  if (extracted?.quantity != null) return 'quantity';
  if (extracted?.asking_price != null) return 'price';
  if (extracted?.product != null) return 'product';
  if (extracted?.location != null) return 'location';
  if (extracted?.farmer_name != null) return 'farmer_name';
  if (extracted?.phone != null) return 'phone';
  if (extracted?.quality != null) return 'quality';
  return null;
};

const buildAskMessage = (
  listing: ListingData,
  extracted: Partial<ListingData>,
  prevListing: ListingData,
  nextField: string,
  language: string
): string => {
  // Defensive: NEVER re-ask for a field already captured, including name/phone.
  // If nextField is already filled in listing, find the next truly missing field.
  if (nextField && (listing as Record<string, unknown>)[nextField] !== null && (listing as Record<string, unknown>)[nextField] !== undefined) {
    const missing = getMissingRequiredFields(listing);
    if (missing.length === 0) {
      return isHiLang(language) ? 'Sab theek hai!' : 'All fields are complete!';
    }
    const order = ['product', 'quantity', 'asking_price', 'quality', 'location', 'farmer_name', 'phone'];
    for (const f of order) {
      if (missing.includes(f)) {
        return buildAskMessage(listing, extracted, prevListing, f, language);
      }
    }
    return buildAskMessage(listing, extracted, prevListing, missing[0], language);
  }
  // Unclear answer to the previous question: gently re-ask, don't skip ahead.
  // But if the answer is unusable and we already have phone/name, don't loop on them.
  if (extracted && isUnusableTurn(extracted)) {
    return isHiLang(language)
      ? `Maaf kijiye, samajh nahi aaya. ${generateQuestion(nextField, language, listing)}`
      : `Sorry, I didn't catch that. ${generateQuestion(nextField, language, listing)}`;
  }
  const echo = generateEcho(listing, extracted, prevListing, language);
  const question = generateQuestion(nextField, language, listing);
  return echo ? `${echo} ${question}` : question;
};

const isConfirmationAffirmative = (text: string): boolean => {
  const lower = text.toLowerCase().trim().replace(/[.,!?]/g, '');
  if (/^haan\s+(lekin|par|but|however)/i.test(lower)) return false;
  if (/^(no|nahi|nahin|cancel|ruk|stop)/i.test(lower)) return false;
  // A correction hidden behind "haan" (e.g. "haan, price change") is NOT approval.
  if (
    lower !== 'correct' &&
    lower !== 'sahi' &&
    lower !== 'theek' &&
    /\b(badal|badalna|badalni|change|modify|galat|wrong|actually|wait|lekin|but|edit|update|fix)\b/i.test(lower)
  )
    return false;
  return (
    /^(haan|haanji|ha|yes|yep|yup|ji\s*haan|bilkul|correct|sahi|theek|ok|okay|ji|confirm|create|banado|bana\s*do|y)(?:\s|$)/i.test(
      lower
    ) ||
    /^(sab|all|everything)\s+(sahi|theek|correct|right|good|badhiya)/i.test(lower) ||
    /^(yes\s+please|ji\s+bilkul|bilkul\s+(sahi|theek)|sab\s+theek\s+hai)/i.test(lower) ||
    /^(theek\s+hai|sahi\s+hai|sab\s+sahi\s+hai)$/i.test(lower)
  );
};

const isConfirmationNegative = (text: string): boolean => {
  const lower = text.toLowerCase().trim().replace(/[.,!?]/g, '');
  if (isConfirmationCancelled(text)) return false;
  return (
    /^(nahi|nahin|no|nope|wrong|galat|change|modify|badal|edit)/i.test(lower) ||
    /^not\s+(correct|right)/i.test(lower) ||
    /^(kuch|something|ye|yeh|wo|woh)\s+(change|badal|edit|modify)/i.test(lower) ||
    /^(change|modify|badal|edit)\s+(karna|kar)/i.test(lower)
  );
};

const isConfirmationCancelled = (text: string): boolean => {
  const lower = text.toLowerCase().trim().replace(/[.,!?]/g, '');
  return (
    /^(cancel|ruk|stop|band|exit|quit|never\s*mind|bhool\s*ja|bhul\s*ja)/i.test(lower) ||
    /^(cancel\s+karo|band\s+karo|ruk\s*jao)/i.test(lower)
  );
};

// Deprecated under the single-stage spec: bare "Nahi" means the farmer wants a
// change (do NOT submit). Kept exported for backwards compatibility; the
// CONFIRMING flow no longer treats any "nahi..." variant as approval.
const isBareNoChangeResponse = (text: string): boolean => {
  const lower = text.toLowerCase().trim().replace(/[.,!?]/g, '');
  return /^(nahi|nahin|no|nope)$/i.test(lower) ||
    /^(nahi|nahin|no|nope)[,.\s]+(sab|all|everything|sahi|theek|correct|right|good|badhiya)\b/i.test(lower) ||
    /^(nahi|nahin|no|nope)[,.\s]+(kuch|nothing|no)\s*(nahi|nahin|no)?$/i.test(lower) ||
    /^(sab|all|everything)\s+(sahi|theek|correct|right|good)\s*(hai)?$/i.test(lower) ||
    /^(sab|all|everything)\s+(hai|sahihai|theekhai)$/i.test(lower) ||
    /^(nothing|no)\s+(to\s+change|changes?)$/i.test(lower);
};

const applySellIntentOverride = (text: string, extracted: Partial<ListingData>) => {
  const lower = text.toLowerCase();
  if (/\bsell\b|bechna|बेचना/.test(lower) && !/\bbuy\b|khareed|खरीद/.test(lower)) {
    extracted.intent = 'sell';
  }
};

const applyBareNumberAndCorrections = (
  text: string,
  extracted: Partial<ListingData>,
  session: ConversationSession
) => {
  const lower = text.toLowerCase();
  const hasQtyWord = /(kilo|kg|tonne|ton|quintal|litre|liter|piece|bag|dozen|किलो|टन|क्विंटल|लीटर|पीस|बोरी|दर्जन)/.test(lower);
  const hasPriceWord = /(rupaye|rupee|rs\b|₹|per\s*kilo|per\s*kg|रुपये)/.test(lower);
  const asked = session.last_asked;
  const standalone = extractStandaloneNumber(text);

  // Phone numbers must never be mistaken for quantity/price.
  const isPhoneLike = standalone != null && (() => {
    const s = String(standalone).replace(/\D/g, '');
    return s.length >= 10 && /^[6-9]/.test(s);
  })();
  if (isPhoneLike) {
    if (extracted.phone == null) {
      const s = String(standalone).replace(/\D/g, '');
      let d = s;
      if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
      if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
      if (d.length === 10 && /^[6-9]/.test(d)) {
        extracted.phone = d;
        return;
      }
    }
    if (!hasQtyWord && !hasPriceWord) {
      return;
    }
  }

  if (extracted.quantity == null && hasQtyWord && standalone != null && !hasPriceWord) {
    extracted.quantity = standalone;
    if (!extracted.unit) extracted.unit = /tonne|ton|टन/.test(lower) ? 'tonnes' : 'kg';
  }

  if (extracted.asking_price == null && hasPriceWord && standalone != null && !hasQtyWord) {
    extracted.asking_price = standalone;
    extracted.price_unit = extracted.price_unit || 'kg';
  }

  if (extracted.quantity == null && extracted.asking_price == null && standalone != null) {
    if (
      isCorrectionText(text) &&
      !hasQtyWord &&
      !hasPriceWord &&
      asked === 'asking_price' &&
      session.last_echo_field === 'quantity' &&
      session.listing?.quantity != null
    ) {
      // Farmer corrects the echoed quantity with a bare number: "Nahi, 25 hain."
      extracted.quantity = standalone;
      extracted.unit = extracted.unit || session.listing.unit || 'kg';
    } else if (isCorrectionText(text) && hasQtyWord) {
      extracted.quantity = standalone;
      extracted.unit = extracted.unit || 'kg';
    } else if (asked === 'quantity' || (isCorrectionText(text) && hasQtyWord)) {
      extracted.quantity = standalone;
      extracted.unit = extracted.unit || 'kg';
    } else if (asked === 'asking_price' || hasPriceWord) {
      extracted.asking_price = standalone;
      extracted.price_unit = extracted.price_unit || 'kg';
    }
  }

  // Bare unit correction: "Nahi, tonne" / "Actually kg" / "Actually litre"
  if (isCorrectionText(text) && extracted.quantity == null && extracted.asking_price == null && standalone == null) {
    if (/(tonne|ton|टन)/.test(lower) && !/(kilo|kg|किलो)/.test(lower)) {
      extracted.unit = 'tonnes';
    } else if (/(kilo|kg|किलो)/.test(lower) && !/(tonne|ton|टन)/.test(lower)) {
      extracted.unit = 'kg';
    } else if (/(litre|liter|लीटर)/.test(lower)) {
      extracted.unit = 'litre';
    } else if (/(piece|पीस)/.test(lower)) {
      extracted.unit = 'piece';
    } else if (/(bag|bori|बोरी)/.test(lower)) {
      extracted.unit = 'bag';
    } else if (/(dozen|दर्जन)/.test(lower)) {
      extracted.unit = 'dozen';
    }
  }
};

// Map common Hinglish/Hindi quality answers onto schema-friendly values.
const parseQualityAnswer = (text: string): string | null => {
  const grade = parseGrade(text);
  if (grade) return grade;
  const lower = text.toLowerCase().trim();
  // Never treat greetings as quality — prevents "Namaste" → quality "Namaste"
  if (['namaste','namaste ji','namaskar','namaskar ji','hello','hi','hey','hii'].includes(lower)) return null;
  if (/\b(achha|achhi|achi|accha|achiya|badhiya|badiya|good|best)\b/.test(lower)) return 'Good';
  if (/\b(theek|thik|average|normal|medium|ok)\b/.test(lower)) return 'Average';
  if (/\b(kharab|bekar|poor|bad)\b/.test(lower)) return 'Poor';
  const trimmed = text.trim().replace(/[.,!?;:'"()]/g, '');
  const lower2 = trimmed.toLowerCase();
  if (['namaste','namaste ji','namaskar','hello','hi','hey','hii'].includes(lower2)) return null;
  // Reject conversational dodges like "aap batado" / "pata nahi" — they are
  // not quality descriptors and must not be invented into the listing.
  const isDodge =
    /\b(bata|nahi|pata|malum|kuch|dekh|baad|aap|tum|khud|batado|batao)\b/.test(lower) ||
    isNoiseAnswer(text);
  if (isDodge) return null;
  if (trimmed.length >= 2 && trimmed.length <= 30 && !/\d/.test(trimmed)) {
    return titleCase(trimmed);
  }
  return null;
};

const applySlotFallbacks = (
  text: string,
  extracted: Partial<ListingData>,
  session: ConversationSession
) => {
  if (isNoiseAnswer(text)) return;
  const nextField = session.last_asked;
  // Bare name fallback: when correction text is present and no standard name
  // pattern matched, treat a short non-numeric word as a name correction.
  // Handles: "Nahi, Rajesh." / "Actually Mohan."
  // Must run before the early-return guard so bare names are extracted.
  if (!extracted.farmer_name && isCorrectionText(text)) {
    const trimmed = text.trim().replace(/[.,!?;:'"()]/g, '');
    const lower = trimmed.toLowerCase();
    // Strip correction prefix to get the bare name
    const stripped = lower.replace(/^(nahi|nahin|no|nope|galat|wrong|wait|actually)[,\s]*/i, '').trim();
    if (['namaste','namaste ji','namaskar','hello','hi','hey','hii'].includes(stripped)) return;
    const hasNonNameWords =
      /\b(namaste|namaskar|se|hai|hain|ho|hun|hoon|mein|mera|meri|mere|ka|ki|ke|kya|kitna|kitne|yeh|woh|aur|ya|bhi|to|phir|ab|kal|aaj|wo|ye|paas|rupo?ye|kilo|wheat|rice|tomato|potato|onion|bechna|sell|buy|number|mobile|price|kimat|rate|quality|grade|location|address|gaon|village|shehar|city|jagah)\b/.test(
        stripped
      );
    if (stripped.length >= 2 && stripped.length <= 20 && !/\d/.test(stripped) && !hasNonNameWords) {
      extracted.farmer_name = titleCase(stripped);
    }
  }
  if (
    isCorrectionText(text) &&
    extractStandaloneNumber(text) == null &&
    !extracted.product &&
    !extracted.location &&
    !extracted.farmer_name
  ) {
    return;
  }
  if (nextField === 'farmer_name' && !extracted.farmer_name) {
    const trimmed = text.trim().replace(/[.,!?;:'"()]/g, '');
    const lower = trimmed.toLowerCase();
    if (['namaste','namaste ji','namaskar','hello','hi','hey','hii'].includes(lower)) return;
    const hasNonNameWords =
      /\b(namaste|namaskar|se|hai|hain|ho|hun|hoon|mein|mera|meri|mere|ka|ki|ke|kya|kitna|kitne|yeh|woh|aur|ya|bhi|to|phir|ab|kal|aaj|wo|ye|paas|rupo?ye|kilo|wheat|rice|tomato|potato|onion|bechna|sell|buy|number|mobile)\b/.test(
        lower
      );
    if (
      trimmed.length >= 2 &&
      trimmed.length <= 20 &&
      !/\d/.test(trimmed) &&
      !hasNonNameWords &&
      looksLikeCleanValue(trimmed, 3)
    ) {
      extracted.farmer_name = titleCase(trimmed);
    }
  }
  if (nextField === 'phone' && !extracted.phone) {
    const digits = text.replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 12) {
      const last10 = digits.length > 10 ? digits.slice(-10) : digits;
      if (/^[6-9]/.test(last10)) {
        extracted.phone = last10;
      }
    } else {
      const fromWords = extractPhoneFromText(text);
      if (fromWords) extracted.phone = fromWords;
    }
  }
  if (nextField === 'quality' && !extracted.quality) {
    const q = parseQualityAnswer(text);
    if (q) extracted.quality = q;
  }
  if (nextField === 'location' && !extracted.location) {
    const trimmed = text.trim().replace(/[.,!?;:'"()]/g, '');
    const lowerCheck = trimmed.toLowerCase();
    // Never treat greetings as location — prevents "Namaste" → "Namaste note kar liya" / "Namaste se"
    if (['namaste','namaste ji','namaskar','hello','hi','hey','hii'].includes(lowerCheck)) return;
    // A bare product answer ("Gobhi") is NEVER a place name; the echo of the
    // assistant's own words ("Ji. Aap do kilo ... bechna chahte hain") is also
    // rejected by looksLikeCleanValue (glue words: do/kilo/bechna/chahte/hain).
    const isEcho = /\b(aap|ji|bechna|chahte|chahenge|theek|sab|ek\s+baar|check)\b/.test(text.toLowerCase());
    if (
      trimmed.length >= 2 &&
      trimmed.length <= 40 &&
      !/\d/.test(trimmed) &&
      !isNoiseAnswer(text) &&
      !isBareProductUtterance(text) &&
      !isEcho &&
      looksLikeCleanValue(trimmed, 3)
    ) {
      extracted.location = titleCase(trimmed);
    }
  }
};

// Confirmation-only repair: extractTurnData's name/location disambiguator
// converts ANY location without "se/mein" into farmer_name when
// last_asked !== 'location' — but CONFIRMING always has last_asked=null.
// An explicit "location X" correction must stay a location and must never
// overwrite the real farmer name. Cumulative state is preserved by mergeListing
// (nulls never overwrite), so clearing the misplaced name is safe.
const repairConfirmationFieldSwap = (text: string, extracted: Partial<ListingData>): void => {
  if (detectChangeField(text) === 'location' && extracted.location == null && extracted.farmer_name != null) {
    extracted.location = extracted.farmer_name;
    extracted.farmer_name = null;
  }
};

const extractTurnData = (text: string, session: ConversationSession): Partial<ListingData> => {
  const extracted: Partial<ListingData> = {
    product: normalizeProduct(text),
    ...parseQuantity(text),
    asking_price: parsePrice(text),
    price_unit: null as string | null,
    quality: parseGrade(text),
    intent: parseIntent(text),
    location: detectLocation(text),
    farmer_name: null,
    phone: null,
  };

  // ── Context-aware field suppression ──────────────────────────────────
  // When the system is asking for a specific field (last_asked), weak
  // extractions for *other* fields must not overwrite already-known
  // listing values.  A "weak" product is one that came from the open-
  // ended extractAnyProduct fallback (not a known crop).  Known crops
  // (Tomato, Wheat, …) carry strong evidence and are always extracted.
  //
  // Also suppress weak products in CONFIRMING state (last_asked is null)
  // to prevent arbitrary words from overwriting the existing product —
  // unless the user is explicitly correcting (e.g. "Nahi, …").
  if (extracted.product && !isKnownCrop(extracted.product)) {
    if (session.last_asked && session.last_asked !== 'product') {
      (extracted as any).product = null;
    } else if (!session.last_asked && session.state === 'CONFIRMING' && !isCorrectionText(text)) {
      (extracted as any).product = null;
    }
  }

  applySellIntentOverride(text, extracted);
  const nameFromText = extractNameFromText(text);
  if (nameFromText) {
    // If the extracted name is the same as the detected location, it's a
    // false positive — the location detector is more reliable (uses grammar
    // context like "se", "mein", "from") so clear the name, not the location.
    if (extracted.location && extracted.location.toLowerCase() === nameFromText.toLowerCase()) {
      // Don't set name — it's actually a place name
    } else {
      extracted.farmer_name = nameFromText;
    }
    // If product extraction mistakenly picked the name, clear it (dynamic, not hardcoded).
    if (extracted.product && extracted.product.toLowerCase() === nameFromText.toLowerCase()) {
      (extracted as any).product = '';
    }
  } else if (extracted.location && !extracted.farmer_name) {
    // detectLocation may have classified a bare word as a location. If the
    // system wasn't asking for location and the text has no grammar context
    // ("se", "mein"), the word is ambiguous — treat as name instead.
    const hasAnyPrep = /\b(se|mein|from|in|at|near|paas)\b/i.test(text);
    if (session.last_asked !== 'location' && !hasAnyPrep) {
      extracted.farmer_name = extracted.location;
      extracted.location = null;
    }
  }
  if (extracted.location && extracted.product && extracted.product.toLowerCase() === extracted.location.toLowerCase()) {
    (extracted as any).product = null;
  }
  const phoneFromText = extractPhoneFromText(text);
  if (phoneFromText) extracted.phone = phoneFromText;
  applyBareNumberAndCorrections(text, extracted, session);
  applySlotFallbacks(text, extracted, session);

  if (extracted.price_unit === null && extracted.asking_price != null) {
    extracted.price_unit = 'kg';
  }
  if ((extracted.product || extracted.quantity != null || extracted.asking_price != null) && !extracted.intent) {
    extracted.intent = 'sell';
  }
  return extracted;
};

const createSession = (sessionId: string): ConversationSession => {
  const session: ConversationSession = {
    id: sessionId,
    state: 'IDLE',
    listing: { ...EMPTY_LISTING },
    turns: [],
    language: null as unknown as ConversationSession['language'],
    last_asked: null,
    last_echo_field: null,
    quality_asked: false,
    greeted: false,
    confirmation_stage: null,
    created_at: Date.now(),
    updated_at: Date.now(),
  };
  sessions.set(sessionId, session);
  return session;
};

const pushTurn = (session: ConversationSession, role: 'farmer' | 'agent', text: string) => {
  session.turns.push({ role, text, timestamp: Date.now() });
};

const respond = (
  session: ConversationSession,
  state: ConversationState,
  agentMessage: string,
  missing: string[],
  nextField?: string,
  error?: string
): ConversationTurnResult => {
  return {
    success: state !== 'ERROR',
    state,
    listing: { ...session.listing },
    agent_message: agentMessage,
    missing_fields: missing,
    next_field: nextField,
    session_id: session.id,
    listing_id: session.listing_id,
    error,
  };
};

const processTurn = async (sessionId: string, text: string): Promise<ConversationTurnResult> => {
  if (!sessionId || typeof sessionId !== 'string') {
    return {
      success: false,
      state: 'ERROR',
      listing: { ...EMPTY_LISTING },
      agent_message: '',
      missing_fields: [],
      session_id: sessionId || '',
      error: 'session_id is required',
    };
  }
  if (!text || typeof text !== 'string' || !text.trim()) {
    return {
      success: false,
      state: 'ERROR',
      listing: { ...EMPTY_LISTING },
      agent_message: '',
      missing_fields: [],
      session_id: sessionId,
      error: 'text is required',
    };
  }

  let session = sessions.get(sessionId);
  if (!session) session = createSession(sessionId);

  session.updated_at = Date.now();
  pushTurn(session, 'farmer', text.trim());

  const prevState = session.state;
  // Hindi-only speech: always respond in Hindi (Hinglish Roman) dynamically from user data
  const language = 'hinglish';
  session.language = 'hinglish' as ConversationSession['language'];

  // First contact: handle Namaste greeting naturally, without treating as data
  if (prevState === 'IDLE' && !session.greeted) {
    session.greeted = true;
    const trimmedLower = text.trim().toLowerCase().replace(/[.,!?]/g, '');
    if (trimmedLower === 'namaste' || trimmedLower === 'namaste ji' || trimmedLower === 'namaskar' || trimmedLower === 'namaskar ji' || trimmedLower === 'namasteji') {
      const msg = 'Namaste ji, aap kya bechna chahte hain?';
      session.state = 'LISTENING';
      session.last_asked = 'product';
      pushTurn(session, 'agent', msg);
      return respond(session, 'LISTENING', msg, getMissingRequiredFields(session.listing), 'product');
    }
    const firstExtracted = extractTurnData(text, session);
    if (isUnusableTurn(firstExtracted)) {
      const msg = 'Namaste ji, aap kya bechna chahte hain?';
      session.state = 'LISTENING';
      session.last_asked = 'product';
      pushTurn(session, 'agent', msg);
      return respond(session, 'LISTENING', msg, getMissingRequiredFields(session.listing), 'product');
    }
  }

  // Duplicate protection at state level: an already-approved session stays
  // SUCCESS. Repeated "Haan" speech events, re-renders, or retries return the
  // same listing without resetting state or triggering another submission.
  if (prevState === 'SUCCESS') {
    const lastAgent = [...session.turns].reverse().find((t) => t.role === 'agent')?.text || 'Ho gaya! Aapki listing ban gayi.';
    return respond(session, 'SUCCESS', lastAgent, []);
  }

  // Guard against re-entry while API submission is in flight.
  if (prevState === 'SUBMITTING') {
    return respond(session, 'SUBMITTING', 'Listing submit ho raha hai...', []);
  }

  if (prevState === 'CONFIRMING') {
    if (isConfirmationCancelled(text)) {
      session.state = 'CANCELLED';
      session.listing = { ...EMPTY_LISTING };
      session.last_asked = null;
      session.confirmation_stage = null;
      const msg = isHiLang(language)
        ? 'Theek hai, rok diya. Phir se shuru karna ho toh bataiye.'
        : 'Okay, stopped. Tell me if you want to start again.';
      pushTurn(session, 'agent', msg);
      return respond(session, 'CANCELLED', msg, []);
    }

    // YES / HAAN — single-stage final approval per spec.
    // Submit to POST /api/listings now and return the authoritative
    // listing_id + complete listing in the SUCCESS response.
    if (isConfirmationAffirmative(text)) {
      session.state = 'SUBMITTING';
      session.confirmation_stage = null;
      session.last_asked = null;
      session.last_echo_field = null;

      const finalListing = buildFinalListing(session.listing);
      const apiResult = await submitListing(finalListing);

      if (apiResult.success && apiResult.listing_id) {
        session.state = 'SUCCESS';
        session.listing_id = apiResult.listing_id;
        const msg = 'Ho gaya! Aapki listing ban gayi.';
        pushTurn(session, 'agent', msg);
        return respond(session, 'SUCCESS', msg, []);
      }

      // API failed — revert to CONFIRMING so user can retry.
      session.state = 'CONFIRMING';
      const msg = isHiLang(language)
        ? 'Listing banane mein samasya aayi. Dobara koshish karein.'
        : 'There was a problem creating the listing. Please try again.';
      pushTurn(session, 'agent', msg);
      return respond(session, 'ERROR', msg, [], undefined, apiResult.error);
    }

    // NO / NAHI — never create a listing here.
    if (isConfirmationNegative(text) || isCorrectionText(text)) {
      const prevListing = { ...session.listing };
      const extracted = extractTurnData(text, session);
      repairConfirmationFieldSwap(text, extracted);
      // Apply bare number correction with CONFIRMING context so that e.g.
      // "Nahi, 35" when we asked for price resolves to asking_price = 35.
      applyBareNumberAndCorrections(text, extracted, session);
      // Field-word fallback for bare numbers without unit/price words:
      // "Nahi, price 35 kar do" must update asking_price to 35 directly.
      if (!hasExtractedData(extracted)) {
        const standalone = extractStandaloneNumber(text);
        const hinted = detectChangeField(text);
        if (standalone != null && hinted === 'asking_price') {
          extracted.asking_price = standalone;
          (extracted as Partial<ListingData>).price_unit = session.listing.price_unit || 'kg';
        } else if (standalone != null && hinted === 'quantity') {
          extracted.quantity = standalone;
          (extracted as Partial<ListingData>).unit = session.listing.unit || 'kg';
        }
      }
      if (hasExtractedData(extracted)) {
        // Cumulative state: merge ONLY the requested change, preserve everything else.
        session.listing = mergeListing(session.listing, extracted);
        const missing = getMissingRequiredFields(session.listing);
        if (missing.length === 0) {
          session.state = 'CONFIRMING';
          session.confirmation_stage = null;
          session.last_asked = null;
          session.last_echo_field = null;
          const msg = generateConfirmation(session.listing, language);
          pushTurn(session, 'agent', msg);
          return respond(session, 'CONFIRMING', msg, []);
        }
        const nextField = getPriorityNextField(missing);
        session.last_asked = nextField;
        session.last_echo_field = lastEchoField(extracted);
        session.state = 'ASKING';
        const msg = buildAskMessage(session.listing, extracted, prevListing, nextField, language);
        pushTurn(session, 'agent', msg);
        return respond(session, 'ASKING', msg, missing, nextField);
      }
      // Bare "Nahi" with no change specified — ask what to change, keep all fields.
      session.state = 'CONFIRMING';
      session.confirmation_stage = null;
      session.last_asked = null;
      session.last_echo_field = null;
      const changeField = detectChangeField(text);
      let askMsg: string;
      if (changeField) {
        session.last_asked = changeField;
        askMsg = generateChangeQuestion(changeField, language);
      } else {
        askMsg = isHiLang(language) ? 'Kya change karna hai?' : 'What should I change?';
      }
      pushTurn(session, 'agent', askMsg);
      return respond(session, 'CONFIRMING', askMsg, getMissingRequiredFields(session.listing), changeField || undefined);
    }

    // Follow-up value while confirming (e.g. "price 35" / "35" after bare
    // "Nahi"): treat as the requested change. Never reset preserved fields.
    {
      const prevListing = { ...session.listing };
      const extracted = extractTurnData(text, session);
      repairConfirmationFieldSwap(text, extracted);
      applyBareNumberAndCorrections(text, extracted, session);
      if (!hasExtractedData(extracted)) {
        const standalone = extractStandaloneNumber(text);
        const hinted = detectChangeField(text) || session.last_asked;
        if (standalone != null && hinted === 'asking_price') {
          extracted.asking_price = standalone;
          (extracted as Partial<ListingData>).price_unit = session.listing.price_unit || 'kg';
        } else if (standalone != null && hinted === 'quantity') {
          extracted.quantity = standalone;
          (extracted as Partial<ListingData>).unit = session.listing.unit || 'kg';
        }
      }
      if (hasExtractedData(extracted)) {
        session.listing = mergeListing(session.listing, extracted);
        const missing = getMissingRequiredFields(session.listing);
        if (missing.length === 0) {
          session.state = 'CONFIRMING';
          session.confirmation_stage = null;
          session.last_asked = null;
          session.last_echo_field = null;
          const msg = generateConfirmation(session.listing, language);
          pushTurn(session, 'agent', msg);
          return respond(session, 'CONFIRMING', msg, []);
        }
        const nextField = getPriorityNextField(missing);
        session.last_asked = nextField;
        session.last_echo_field = lastEchoField(extracted);
        session.state = 'ASKING';
        const msg = buildAskMessage(session.listing, extracted, prevListing, nextField, language);
        pushTurn(session, 'agent', msg);
        return respond(session, 'ASKING', msg, missing, nextField);
      }
    }
    // Unclear answer while confirming: do NOT submit — ask what to change.
    const changeField = detectChangeField(text);
    session.confirmation_stage = null;
    session.last_asked = changeField;
    const askMsg = changeField
      ? generateChangeQuestion(changeField, language)
      : isHiLang(language)
        ? 'Kya change karna hai?'
        : 'What should I change?';
    pushTurn(session, 'agent', askMsg);
    return respond(session, 'CONFIRMING', askMsg, getMissingRequiredFields(session.listing), changeField || undefined);
  }

  session.state = 'PROCESSING';

  const prevListing = { ...session.listing };
  const extracted = extractTurnData(text, session);

  // Farmer is steering to a different field (e.g. says "price" while we
  // asked for the phone number) - honor that switch instead of re-asking.
  if (!hasExtractedData(extracted)) {
    const wantField = detectChangeField(text);
    const missingNow = getMissingRequiredFields(session.listing);
    if (wantField && missingNow.includes(wantField)) {
      session.state = 'ASKING';
      session.last_asked = wantField;
      session.last_echo_field = null;
      const msg = `${isHiLang(language) ? 'Theek hai. ' : 'Okay. '}${generateChangeQuestion(wantField, language)}`;
      pushTurn(session, 'agent', msg);
      return respond(session, 'ASKING', msg, missingNow, wantField);
    }
  }

  session.listing = mergeListing(session.listing, extracted);

  const missing = getMissingRequiredFields(session.listing);

  // Quality is part of the listing schema but optional in the API. Ask it
  // once, right after product/quantity/price are known (matches the example
  // flow: "Wheat ki quality kaisi hai?") - it never blocks confirmation.
  // Only ask if the user hasn't provided ALL fields (name/phone still missing).
  const qualityPending = !session.listing.quality && !session.quality_asked;
  const coreMissing = missing.filter((f) => f !== 'location' && f !== 'farmer_name' && f !== 'phone');
  const namePhoneMissing = missing.filter((f) => f === 'location' || f === 'farmer_name' || f === 'phone');

  if (qualityPending && coreMissing.length === 0 && namePhoneMissing.length > 0) {
    session.quality_asked = true;
    session.state = 'ASKING';
    session.last_asked = 'quality';
    session.last_echo_field = lastEchoField(extracted);
    const echo = generateEcho(session.listing, extracted, prevListing, language);
    const question = generateQuestion('quality', language, session.listing);
    const msg = echo ? `${echo} ${question}` : question;
    pushTurn(session, 'agent', msg);
    return respond(session, 'ASKING', msg, missing, 'quality');
  }

  if (missing.length === 0) {
    session.state = 'CONFIRMING';
    session.last_asked = null;
    session.last_echo_field = null;
    const msg = generateConfirmation(session.listing, language);
    pushTurn(session, 'agent', msg);
    return respond(session, 'CONFIRMING', msg, []);
  }

  // Noise in reply to the optional quality question: don't apologize, just
  // move on to the next missing field.
  if (session.last_asked === 'quality' && isUnusableTurn(extracted)) {
    session.last_echo_field = null;
    session.state = 'ASKING';
    const nf = getPriorityNextField(missing);
    session.last_asked = nf;
    const msg = generateQuestion(nf, language, session.listing);
    pushTurn(session, 'agent', msg);
    return respond(session, 'ASKING', msg, missing, nf);
  }

  const nextField = getPriorityNextField(missing);
  session.last_asked = nextField;
  session.last_echo_field = lastEchoField(extracted);
  const msg = buildAskMessage(session.listing, extracted, prevListing, nextField, language);

  session.state = 'ASKING';
  pushTurn(session, 'agent', msg);

  return respond(session, 'ASKING', msg, missing, nextField);
};

export const sendConversationTurn = async (
  sessionId: string,
  text: string
): Promise<ConversationTurnResult> => {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      success: false,
      state: 'ERROR',
      listing: { ...EMPTY_LISTING },
      agent_message: '',
      missing_fields: [],
      session_id: sessionId,
      error: 'Text is required',
    };
  }
  // Local engine — resolves immediately, no network. Kept async so the UI
  // contract (await sendConversationTurn) stays unchanged.
  return await processTurn(sessionId, trimmed);
};

export const resetConversation = (sessionId: string): void => {
  sessions.delete(sessionId);
};

export const generateSessionId = (): string =>
  `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Build the final structured listing object from the session listing.
 * Guarantees the exact JSON shape required by the Phase 1 API schema.
 * Never invents missing values — nulls are preserved.
 */
export const buildFinalListing = (listing: ListingData) => ({
  farmer_name: listing.farmer_name,
  phone: listing.phone,
  product: listing.product,
  quantity: listing.quantity,
  unit: listing.unit,
  asking_price: listing.asking_price,
  price_unit: listing.price_unit,
  location: listing.location,
  quality: listing.quality,
  intent: 'sell' as const,
  source: 'voice_agent' as const,
});

export type FinalListing = ReturnType<typeof buildFinalListing>;

// ===== API SUBMISSION =====

export interface SubmitListingResult {
  success: boolean;
  listing_id?: string;
  status?: string;
  error?: string;
}

/**
 * Submit the final listing to POST /api/listings.
 * Uses relative URL — Vite proxy forwards to the backend at :8787.
 */
export const submitListing = async (listing: FinalListing): Promise<SubmitListingResult> => {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), 20000);
  const jsonBody = JSON.stringify(listing);
  console.log('[SUBMIT_LISTING] POST /api/listings');
  console.log('[SUBMIT_LISTING] POST BODY:', jsonBody);
  try {
    const res = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonBody,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => null);
    console.log('[SUBMIT_LISTING] HTTP STATUS:', res.status);
    console.log('[SUBMIT_LISTING] RESPONSE BODY:', JSON.stringify(data, null, 2));
    if (res.status === 201 && data?.success) {
      console.log('[SUBMIT_LISTING] SUCCESS - listing_id:', data.listing_id);
      return {
        success: true,
        listing_id: data.listing_id,
        status: data.status,
      };
    }
    console.log('[SUBMIT_LISTING] FAILED - error:', data?.error || `HTTP ${res.status}`);
    return {
      success: false,
      error: data?.error || `HTTP ${res.status}`,
    };
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      return { success: false, error: 'Request timed out. Please try again.' };
    }
    return {
      success: false,
      error: e?.message?.includes('Failed to fetch')
        ? 'Backend server is not running. Start the server and try again.'
        : e?.message || 'Network error',
    };
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
};

export {
  mergeListing,
  getMissingRequiredFields,
  isComplete,
  detectLanguage,
  extractNameFromText,
  extractPhoneFromText,
  generateQuestion,
  generateConfirmation,
  isConfirmationAffirmative,
  isConfirmationNegative,
  isConfirmationCancelled,
  getSession,
  sessions,
};
