import { extractListingFallback, looksLikeCleanValue, extractNameFromText as extractNameFromTextImported, normalizeProduct, parseQuantity, parsePrice, detectAnyLocation } from './extractListingParser.mjs';

const LISTINGS_API_URL = process.env.LISTINGS_API_URL || 'http://localhost:8787/api/listings';

const submitListing = async (listing) => {
  const payload = {
    farmer_name: listing.farmer_name,
    phone: listing.phone,
    product: listing.product,
    quantity: listing.quantity,
    unit: listing.unit,
    asking_price: listing.asking_price,
    price_unit: listing.price_unit,
    location: listing.location,
    quality: listing.quality || null,
    intent: listing.intent || 'sell',
    source: 'voice_agent',
  };

  try {
    const res = await fetch(LISTINGS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    if (res.status === 201 && data?.success) {
      return {
        success: true,
        listing_id: data.listing_id,
        status: data.status,
      };
    }

    if (res.status === 400) {
      return {
        success: false,
        error: 'validation',
        message: data?.error || 'Listing data is invalid. Please check all fields.',
      };
    }

    if (res.status === 404) {
      return {
        success: false,
        error: 'not_found',
        message: 'Listing service not found. Please try again later.',
      };
    }

    return {
      success: false,
      error: 'server',
      message: data?.error || 'Something went wrong. Please try again.',
    };
  } catch (err) {
    return {
      success: false,
      error: 'network',
      message: err?.message || 'Could not reach listing service.',
    };
  }
};

// Test-only override: when set, processTurn calls this instead of the real HTTP submitListing.
let _submitListingOverride = null;
const setSubmitListingImpl = (fn) => { _submitListingOverride = fn; };

const STATES = {
  IDLE: 'IDLE',
  LISTENING: 'LISTENING',
  PROCESSING: 'PROCESSING',
  ASKING: 'ASKING',
  CONFIRMING: 'CONFIRMING',
  SUBMITTING: 'SUBMITTING',
  SUCCESS: 'SUCCESS',
  CANCELLED: 'CANCELLED',
  ERROR: 'ERROR',
};

const EMPTY_LISTING = {
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

const REQUIRED_FIELDS = ['farmer_name', 'phone', 'product', 'quantity', 'unit', 'asking_price', 'price_unit', 'location', 'quality', 'intent'];

const OPTIONAL_FIELDS = ['quality'];

// Terminal success message for a submitted listing (spoken as-is by Twilio).
export const SUCCESS_MESSAGE = 'Aapki listing ho gayi. FarmDirect se dhanyawaad!';

// Short nudge used when the listing is already complete but the last utterance
// carried nothing new. Deliberately does NOT repeat the itemised summary and
// does NOT contain "ek baar dekh lo" / "just to confirm" (the Twilio adapter
// keys off those phrases to detect a repeating confirmation loop).
const shortConfirmMsg = (language) =>
  farmerMsg(language, 'Ji, agar sab sahi hai toh haan bol dijiye.', 'If everything is correct, please just say yes.');

const numberToHindiWords = (n, language = 'hinglish') => {
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

  const compoundDev = [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'इक्कीस',
    'बाईस',
    'तेईस',
    'चौबीस',
    'पच्चीस',
    'छब्बीस',
    'सत्ताईस',
    'अट्ठाईस',
    'उनतीस',
    'तीस',
    'इकतीस',
    'बत्तीस',
    'तैंतीस',
    'चौंतीस',
    'पैंतीस',
    'छत्तीस',
    'सैंतीस',
    'अड़तीस',
    'उनतालीस',
    'चालीस',
    'इकतालीस',
    'बयालीस',
    'तैंतालीस',
    'चौंतालीस',
    'पैंतालीस',
    'छियालीस',
    'सैंतालीस',
    'अड़तालीस',
    'उनचास',
    'पचास',
    'इक्यावन',
    'बावन',
    'तिरपन',
    'चौंपन',
    'पचपन',
    'छप्पन',
    'सत्तावन',
    'अट्ठावन',
    'उनसठ',
    'साठ',
    'इकसठ',
    'बासठ',
    'तिरसठ',
    'चौंसठ',
    'पैंसठ',
    'छियासठ',
    'सड़सठ',
    'अड़सठ',
    'उनहत्तर',
    'सत्तर',
    'इकहत्तर',
    'बहत्तर',
    'तिहत्तर',
    'चौंहत्तर',
    'पचहत्तर',
    'छिहत्तर',
    'सतहत्तर',
    'अठहत्तर',
    'उन्नासी',
    'अस्सी',
    'इक्यासी',
    'बयासी',
    'तिरासी',
    'चौंसी',
    'पचासी',
    'छियासी',
    'सतासी',
    'अठासी',
    'उन्नवे',
    'नब्बे',
    'इक्यानवे',
    'बानवे',
    'तिरानवे',
    'चौंनवे',
    'पचानवे',
    'छियानवे',
    'सतानवे',
    'अठानवे',
    'निन्यानवे'
  ];
  const compoundHing = [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'ikkis',
    'bais',
    'teis',
    'chaubis',
    'pachees',
    'chabbis',
    'satais',
    'athais',
    'unatees',
    'tees',
    'iktis',
    'baitis',
    'taentis',
    'chauntis',
    'paintis',
    'chhattis',
    'saintis',
    'adtis',
    'untalis',
    'chalis',
    'iktalis',
    'byalis',
    'taentalis',
    'chauntalis',
    'paintalis',
    'chhiyalis',
    'saintalis',
    'adtalis',
    'unchas',
    'pachaas',
    'ikkyaavan',
    'baavan',
    'tirpan',
    'chaunpan',
    'chappan',
    'chhihappan',
    'sattavan',
    'athhavan',
    'unsath',
    'saath',
    'ikksath',
    'baasath',
    'tirsath',
    'chaunsath',
    'paintsath',
    'chhiyasath',
    'sadsath',
    'athsath',
    'unnhattar',
    'sattar',
    'ikkhattar',
    'bahattar',
    'tihattar',
    'chaunhattar',
    'pachhattar',
    'chhihattar',
    'satahattar',
    'athhattar',
    'unnaasi',
    'assi',
    'ikkyasi',
    'byasi',
    'tirasi',
    'chaunsi',
    'pachasi',
    'chhiyasi',
    'satasi',
    'athasi',
    'unanve',
    'nabbe',
    'ikkyaanve',
    'baanve',
    'tiraanve',
    'chaunve',
    'pachaanve',
    'chhiyaanve',
    'sataanve',
    'athaanve',
    'ninyanve'
  ];

  const hundredsDev = ['', 'एक सौ', 'दो सौ', 'तीन सौ', 'चार सौ', 'पाँच सौ', 'छह सौ', 'सात सौ', 'आठ सौ', 'नौ सौ'];
  const hundredsHing = ['', 'ek sau', 'do sau', 'teen sau', 'chaar sau', 'paanch sau', 'chhe sau', 'saat sau', 'aath sau', 'nau sau'];

  const ones = isDev ? onesDev : onesHing;
  const tens = isDev ? tensDev : tensHing;
  const hundreds = isDev ? hundredsDev : hundredsHing;
  const compound = isDev ? compoundDev : compoundHing;

  if (n < 20) return ones[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    if (o === 0) return tens[t];
    return compound[n] || tens[t] + ' ' + ones[o];
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

const PRODUCT_SAY = {
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
  Maize: { hi: 'makka', en: 'maize' },
  Cotton: { hi: 'kapas', en: 'cotton' },
  Sugarcane: { hi: 'ganna', en: 'sugarcane' },
  Soybean: { hi: 'soyabean', en: 'soybean' },
  Bajra: { hi: 'bajra', en: 'bajra' },
  Jowar: { hi: 'jowar', en: 'jowar' },
  Barley: { hi: 'jau', en: 'barley' },
  Mustard: { hi: 'sarson', en: 'mustard' },
  Groundnut: { hi: 'moongphali', en: 'groundnut' },
  Moong: { hi: 'moong', en: 'moong dal' },
  Chana: { hi: 'chana', en: 'chickpeas' },
  Masoor: { hi: 'masoor', en: 'masoor dal' },
  Urad: { hi: 'urad', en: 'urad dal' },
  Arhar: { hi: 'arhar', en: 'arhar dal' },
  Mirch: { hi: 'mirch', en: 'chilli' },
  Dhaniya: { hi: 'dhaniya', en: 'coriander' },
  Jeera: { hi: 'jeera', en: 'cumin' },
  Haldi: { hi: 'haldi', en: 'turmeric' },
  Garlic: { hi: 'lahsun', en: 'garlic' },
  Ginger: { hi: 'adrak', en: 'ginger' },
  Brinjal: { hi: 'baingan', en: 'brinjal' },
  'Bottle Gourd': { hi: 'lauki', en: 'bottle gourd' },
  'Ridge Gourd': { hi: 'torai', en: 'ridge gourd' },
  Parwal: { hi: 'parwal', en: 'pointed gourd' },
  'Bitter Gourd': { hi: 'karela', en: 'bitter gourd' },
  Pumpkin: { hi: 'kaddu', en: 'pumpkin' },
  Spinach: { hi: 'palak', en: 'spinach' },
  Methi: { hi: 'methi', en: 'fenugreek' },
};

const sessions = new Map();

const createSession = (sessionId) => {
  const session = {
    id: sessionId,
    state: STATES.IDLE,
    listing: { ...EMPTY_LISTING },
    turns: [],
    language: null,
    last_asked: null,
    last_echo_field: null,
    confirmation_stage: null,
    pending_correction_field: null,
    created_at: Date.now(),
    updated_at: Date.now(),
  };
  sessions.set(sessionId, session);
  return session;
};

const getSession = (sessionId) => sessions.get(sessionId) || null;

const deleteSession = (sessionId) => sessions.delete(sessionId);

const detectLanguage = (text) => {
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  const lower = text.toLowerCase();
  if (/(mere|mera|meri|paas|hai|hain|kaun|kitna|kitne|kya|mein|se|ho|hun|hoon|chahiye|rupaye|naam|nahi|haan|theek|bataiye|chahte|chahenge)/.test(lower)) {
    return 'hinglish';
  }
  return 'en';
};

const isHiLang = (language) => language === 'hi' || language === 'hinglish';

const resolveLanguage = (session, text) => {
  const detected = detectLanguage(text);
  const trimmed = text.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const isYesNo = /^(haan|ha|haanji|yes|yep|yup|ji|ok|okay|theek|no|nahi|nahin|nope)$/i.test(trimmed.replace(/[.,!?]/g, ''));
  if (session.language && (isYesNo || (detected === 'en' && wordCount <= 4))) {
    return session.language;
  }
  return detected;
};

const isNoiseAnswer = (text) => {
  const lower = text.trim().toLowerCase().replace(/[.,!?]/g, '');
  return /^(nahi|nahin|no|nope|haan|ha|yes|ji|ok|okay|theek|sahi|galat|wrong|change|modify)$/.test(lower);
};

const isCorrectionText = (text) => {
  const lower = text.toLowerCase().trim();
  return /^(nahi|nahin|no|nope|galat|wrong|wait|actually|arre|arey|oops|sorry)\b/.test(lower)
    || /\b(galat|wrong|change|badal|nahi\s*,|actually\s*,|arre\s*,|arey\s*,|not\s+\d|sorry)\b/.test(lower);
};

const DATA_KEYS = ['farmer_name', 'phone', 'product', 'quantity', 'unit', 'asking_price', 'location', 'quality'];

const hasExtractedData = (extracted) =>
  DATA_KEYS.some((k) => extracted[k] !== null && extracted[k] !== undefined);

// Words a farmer uses when naming what they want to change.
const FIELD_WORDS = {
  asking_price: /\b(price|kimat|keemat|rate|bhav|daam)\b/i,
  quantity: /\b(vajan|wajan|weight|quantity|kitne\s+kilo|kitna\s+kilo)\b/i,
  product: /\b(product|crop|fasal|saman)\b/i,
  location: /\b(location|address|gaon|village|shehar|city|jagah)\b/i,
  phone: /\b(phone|number|mobile)\b/i,
  farmer_name: /\b(name|naam)\b/i,
  quality: /\b(quality|grade|kisam|kism)\b/i,
};

const detectChangeField = (text) => {
  for (const [field, re] of Object.entries(FIELD_WORDS)) {
    if (re.test(text)) return field;
  }
  return null;
};

const generateChangeQuestion = (field, language) => {
  if (isHiLang(language)) {
    const questions = {
      asking_price: 'Kitne rupaye kilo?',
      quantity: 'Kitna bechna hai?',
      product: 'Ab kya bechna hai?',
      location: 'Nayi jagah kahan hai?',
      phone: 'Naya mobile number kya hai?',
      farmer_name: 'Aapka sahi naam kya hai?',
      quality: 'Quality kaisi hai?',
    };
    return questions[field] || 'Kya badalna hai?';
  }
  const questions = {
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

const sayProduct = (product, language) => {
  if (!product) return isHiLang(language) ? 'saman' : 'produce';
  const map = PRODUCT_SAY[product];
  // For Hindi/Hinglish, always use Hindi product name (e.g., Potato → aalu, Tomato → tamatar)
  // This ensures "2 kg potatoes" → "do kilo aalu" dynamically, without hardcoding or confusing products.
  if (map) return isHiLang(language) ? map.hi : map.en;
  // Unknown product — use it as-is (title-cased by extraction), dynamically for ALL products.
  return String(product);
};

const sayQty = (listing, language) => {
  if (listing.quantity == null) return null;
  const unit = listing.unit || 'kg';
  const isHi = language === 'hi';
  const isHing = language === 'hinglish';
  const isHiL = isHi || isHing;

  const unitSay = {
    kg: isHi ? 'किलो' : isHing ? 'kilo' : 'kg',
    tonnes: isHi ? 'टन' : isHing ? 'tonne' : 'tonnes',
    litre: isHi ? 'लीटर' : isHing ? 'litre' : 'litre',
    piece: isHi ? 'पीस' : isHing ? 'piece' : 'pieces',
    bag: isHi ? 'बोरी' : isHing ? 'bori' : 'bags',
    dozen: isHi ? 'दर्जन' : isHing ? 'darjan' : 'dozen',
  };
  const label = unitSay[unit] || unit;
  const numStr = isHiL ? numberToHindiWords(listing.quantity, language) : String(listing.quantity);
  return `${numStr} ${label}`;
};

const sayPrice = (listing, language) => {
  if (listing.asking_price == null) return null;
  const priceUnit = listing.price_unit || 'kg';
  const isHi = language === 'hi';
  const isHing = language === 'hinglish';
  const isHiL = isHi || isHing;

  const unitLabel = {
    kg: isHi ? 'किलो' : isHing ? 'kilo' : 'kg',
    litre: isHi ? 'लीटर' : isHing ? 'litre' : 'litre',
    piece: isHi ? 'पीस' : isHing ? 'piece' : 'piece',
    bag: isHi ? 'बोरी' : isHing ? 'bori' : 'bag',
    dozen: isHi ? 'दर्जन' : isHing ? 'darjan' : 'dozen',
  };
  const uLabel = unitLabel[priceUnit] || priceUnit;
  const numStr = isHiL ? numberToHindiWords(listing.asking_price, language) : String(listing.asking_price);
  if (isHi) {
    return `${numStr} रुपये ${uLabel}`;
  }
  if (isHing) {
    return `${numStr} rupaye ${uLabel}`;
  }
  return `${listing.asking_price} rupees per ${uLabel}`;
};

const sayPhone = (phone) => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  // Digit-by-digit so the farmer can verify each number when spoken aloud.
  return digits.split('').join(' ');
};

const extractStandaloneNumber = (text) => {
  const cleaned = text.toLowerCase().replace(/,/g, ' ').trim();
  const m = cleaned.match(/(?:nahi|nahin|no|galat|wrong)?[.\s]*(\d+(?:\.\d+)?)\s*(?:hai|hain|only|he)?\s*[.!]?\s*$/i);
  if (!m) {
    const any = cleaned.match(/(?:^|\s)(\d+(?:\.\d+)?)(?:\s|$)/);
    if (!any) return null;
    const n = Number(any[1]);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
};

const extractNameFromText = extractNameFromTextImported;

const WORD_TO_DIGIT = {
  'zero': '0', 'oh': '0', 'o': '0',
  'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
  'shunya': '0', 'sunya': '0', 'shuniya': '0', 'suniya': '0', 'shuny': '0',
  'ek': '1', 'aek': '1',
  'do': '2',
  'teen': '3',
  'chaar': '4', 'char': '4',
  'paanch': '5', 'panch': '5', 'paach': '5',
  'chhah': '6', 'chheh': '6', 'chhe': '6', 'cheh': '6', 'chah': '6', 'che': '6', 'chhay': '6',
  'saat': '7', 'saath': '7', 'sath': '7',
  'aath': '8', 'ath': '8', 'aat': '8',
  'nau': '9', 'nao': '9', 'nav': '9',
  'शून्य': '0', 'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4', 'पाँच': '5', 'पांच': '5', 'छह': '6', 'छः': '6', 'सात': '7', 'आठ': '8', 'नौ': '9',
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};

const normalizePhoneDigits = (digits) => {
  let d = String(digits).replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 10 && /^[6-9]/.test(d)) return d;
  return null;
};

const extractPhoneFromWords = (text) => {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();
  const tokens = lower.replace(/[^a-z0-9\u0900-\u097F]+/g, ' ').split(/\s+/).filter(Boolean);
  let currentSeq = '';
  let best = null;
  const flush = () => {
    if (currentSeq.length >= 10) {
      for (let s = 0; s <= currentSeq.length - 10; s++) {
        const win = currentSeq.slice(s, s + 10);
        if (/^[6-9]/.test(win)) { best = win; return true; }
      }
      const norm = normalizePhoneDigits(currentSeq);
      if (norm) { best = norm; return true; }
    }
    return false;
  };
  for (const tok of tokens) {
    const d = WORD_TO_DIGIT[tok];
    if (d !== undefined) {
      currentSeq += d;
    } else {
      if (flush()) break;
      currentSeq = '';
    }
  }
  if (!best) flush();
  return best;
};

const extractPhoneFromText = (text) => {
  if (!text || typeof text !== 'string') return null;
  const cleaned = text.replace(/[\s\-\(\)\.]/g, '');
  let m = cleaned.match(/(?:^|\D)([6-9]\d{9})(?:\D|$)/);
  if (m) return m[1];
  m = cleaned.match(/(?:^|\D)(0[6-9]\d{9})(?:\D|$)/);
  if (m) return m[1].slice(1);
  m = text.match(/(?:^|\D)(91\s?)?([6-9]\d{4})\s?(\d{5})(?:\D|$)/);
  if (m) return m[2] + m[3];
  m = text.match(/(\d{5})\s*(\d{5})/);
  if (m) {
    const combined = m[1] + m[2];
    if (/^[6-9]/.test(combined)) return combined;
  }
  const devDigits = text.replace(/[^०-९]/g, '');
  if (devDigits.length >= 10) {
    const ascii = devDigits.split('').map(ch => WORD_TO_DIGIT[ch] || '').join('');
    const norm = normalizePhoneDigits(ascii);
    if (norm) return norm;
    for (let s = 0; s <= ascii.length - 10; s++) {
      const win = ascii.slice(s, s + 10);
      if (/^[6-9]/.test(win)) return win;
    }
  }
  const fromWords = extractPhoneFromWords(text);
  if (fromWords) return fromWords;
  return null;
};

const mergeListing = (existing, extracted) => {
  const merged = { ...existing };
  for (const key of Object.keys(extracted)) {
    const v = extracted[key];
    if (v !== null && v !== undefined) {
      // Empty string signals "clear this field" (e.g. name matched as product).
      merged[key] = v === '' ? null : v;
    }
  }
  if (merged.asking_price !== null && merged.price_unit === null) {
    merged.price_unit = 'kg';
  }
  if (merged.quantity !== null && merged.unit === null) {
    merged.unit = 'kg';
  }
  if (merged.intent === null || merged.intent === undefined) {
    merged.intent = 'sell';
  }
  return merged;
};

const getMissingRequiredFields = (listing) => {
  return REQUIRED_FIELDS.filter(f => listing[f] === null || listing[f] === undefined);
};

const isComplete = (listing) => getMissingRequiredFields(listing).length === 0;

const getPriorityNextField = (missing) => {
  // Strict conversation order: PRODUCT → NAME → LOCATION → QUANTITY → QUALITY → PRICE → PHONE
  // unit / price_unit / intent are auto-derived in mergeListing and are never asked.
  const order = ['product', 'farmer_name', 'location', 'quantity', 'quality', 'asking_price', 'phone'];
  const next = order.find((f) => missing.includes(f));
  if (next) return next;
  return missing.find((f) => !['unit', 'price_unit', 'intent'].includes(f)) || null;
};

const generateQuestion = (field, language) => {
  if (isHiLang(language)) {
    const questions = {
      product: 'Aaj kya bechna chahte hain ji?',
      farmer_name: 'Aapka naam kya hai ji?',
      location: 'Aap kahan se hain ji?',
      quantity: 'Kitna maal hai ji?',
      quality: 'Aapke maal ki quality kya hai ji? Grade A, B ya C?',
      asking_price: 'Kitne rupaye kilo mein bechna chahte hain ji?',
      phone: 'Aapka phone number kya hai ji?',
      unit: 'Kisme hai — kilo, tonne, litre, piece?',
      price_unit: 'Yeh kimat per kya hai?',
      intent: 'Bechna hai kya?',
    };
    return questions[field] || 'Aur thoda bataiye.';
  }

  const questions = {
    product: 'What do you want to sell?',
    farmer_name: 'What is your name?',
    location: 'Where are you from?',
    quantity: 'How much do you want to sell?',
    quality: 'What is the quality of your produce? Grade A, B, or C?',
    asking_price: 'How much is the price?',
    phone: 'What is your mobile number?',
    unit: 'What unit — kg, tonne, litre, piece?',
    price_unit: 'Is that price per kg?',
    intent: 'Do you want to sell?',
  };
  return questions[field] || 'Please tell me a bit more.';
};

const generateConfirmation = (listing, language) => {
  // Dynamic, no hardcoding — every value from user input
  // Respects language param for direct tests, but voice flow (processTurn) always passes 'hinglish' for Hindi-only
  const product = sayProduct(listing.product, language);
  const qty = sayQty(listing, language) || (isHiLang(language) ? 'kuch' : 'some');
  const price = sayPrice(listing, language);
  const place = listing.location || (isHiLang(language) ? 'aapke gaon' : 'your place');
  const name = listing.farmer_name;
  const phone = sayPhone(listing.phone);
  const quality = listing.quality ? `${listing.quality} ` : '';

  if (isHiLang(language)) {
    let msg = `Theek hai ji. Ek baar dekh lo — ${qty} ${quality}${product} bechna hai`;
    if (price) msg += `, ${price}`;
    msg += `, ${place} se.`;
    if (name) msg += ` Naam ${name}.`;
    if (phone) msg += ` Number ${phone}.`;
    msg += ' Sab sahi hai?';
    return msg;
  }

  let msg = `Okay. Just to confirm — you want to sell ${qty} of ${quality}${product}`;
  if (price) msg += ` at ${price}`;
  msg += ` from ${place}.`;
  if (name) msg += ` Name ${name}.`;
  if (phone) msg += ` Number ${phone}.`;
  msg += ' Is that correct?';
  return msg;
};

// Did the farmer give us anything usable this turn? Guards against skipping
// ahead while the previous question went unanswered.
const isUnusableTurn = (extracted) => !hasExtractedData(extracted);

const generateEcho = (listing, extracted, prevListing, language) => {
  const hi = isHiLang(language);
  const product = listing.product ? sayProduct(listing.product, language) : null;
  const qty = sayQty(listing, language);
  const price = sayPrice(listing, language);
  const qtyChanged = prevListing?.quantity != null && extracted.quantity != null && prevListing.quantity !== extracted.quantity;
  const priceChanged = prevListing?.asking_price != null && extracted.asking_price != null && prevListing.asking_price !== extracted.asking_price;
  const productChanged = prevListing?.product && extracted.product && prevListing.product !== extracted.product;
  const nameChanged = prevListing?.farmer_name && extracted.farmer_name != null && prevListing.farmer_name !== extracted.farmer_name;
  const phoneChanged = prevListing?.phone && extracted.phone != null && prevListing.phone !== extracted.phone;
  const locationChanged = prevListing?.location && extracted.location != null && prevListing.location !== extracted.location;
  const qualityChanged = prevListing?.quality && extracted.quality != null && prevListing.quality !== extracted.quality;
  const unitChanged = prevListing?.unit && extracted.unit != null && prevListing.unit !== extracted.unit;

  if (qtyChanged && product && qty) {
    return hi ? `Samajh gaya. Ab ${qty} ${product}.` : `Got it. Now ${qty} of ${product}.`;
  }
  if (priceChanged && price) {
    return hi ? `Theek hai. Ab ${price}.` : `Okay. Now ${price}.`;
  }
  if (productChanged && product) {
    return hi ? `Achha. Ab ${product}.` : `Okay. Now ${product}.`;
  }
  if (nameChanged && listing.farmer_name) {
    return hi ? `Theek hai ji. Ab naam ${listing.farmer_name}.` : `Okay. Now name ${listing.farmer_name}.`;
  }
  if (phoneChanged && listing.phone) {
    return hi ? `Theek hai. Ab number ${sayPhone(listing.phone)}.` : `Okay. Now number ${sayPhone(listing.phone)}.`;
  }
  if (locationChanged && listing.location) {
    return hi ? `Samajh gaya. Ab ${listing.location} se.` : `Got it. Now from ${listing.location}.`;
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
      ? `Achha ji. ${qty} ${product} bechna hai`
      : `Okay. You want to sell ${qty} of ${product}`;
    if (justPrice && price) msg += hi ? `, ${price}` : ` at ${price}`;
    if (justPlace && listing.location) msg += hi ? `, ${listing.location} se` : ` from ${listing.location}`;
    return `${msg}.`;
  }
  if (justPrice && price) {
    return hi ? `Theek hai. ${price}.` : `Okay. ${price}.`;
  }
  if (justPlace && listing.location) {
    return hi ? `Samajh gaya, ${listing.location} note kar liya.` : `Got it, noted ${listing.location}.`;
  }
  if (justName && listing.farmer_name) {
    return hi ? `Achha ji, ${listing.farmer_name}.` : `Okay, ${listing.farmer_name}.`;
  }
  if (justPhone && listing.phone) {
    return hi ? `Theek hai ji. Number ${sayPhone(listing.phone)}.` : `Okay. Number ${sayPhone(listing.phone)}.`;
  }
  if (justQuality && listing.quality) {
    return hi ? `Theek hai. Quality ${listing.quality}.` : `Okay. Quality ${listing.quality}.`;
  }
  if (justProduct && product) {
    return hi ? `Achha ji. ${product}.` : `Okay. ${product}.`;
  }
  if (justQty && qty) {
    return hi ? `Theek hai ji. ${qty}.` : `Okay. ${qty}.`;
  }
  return '';
};

// Which number did the agent last echo back to the farmer? Used to decide
// what a bare correction like "Nahi, 25 hain." refers to.
const lastEchoField = (extracted) => {
  if (extracted?.quantity != null) return 'quantity';
  if (extracted?.asking_price != null) return 'price';
  if (extracted?.product != null) return 'product';
  if (extracted?.location != null) return 'location';
  if (extracted?.farmer_name != null) return 'farmer_name';
  if (extracted?.phone != null) return 'phone';
  if (extracted?.quality != null) return 'quality';
  return null;
};

const buildAskMessage = (listing, extracted, prevListing, nextField, language) => {
  // If the next field already has a value in the listing, find the next missing field
  // This ensures we NEVER re-ask for a field that is already captured, including
  // farmer_name and phone. The recursion handles newly filled fields correctly.
  if (nextField && (listing[nextField] !== null && listing[nextField] !== undefined)) {
    // Get the missing fields and find the next one that's actually missing
    const missing = getMissingRequiredFields(listing);
    if (missing.length === 0) {
      return isHiLang(language) ? 'Sab set hai!' : 'All fields are complete!';
    }
    // Use the same priority order as getPriorityNextField
    const order = ['product', 'farmer_name', 'location', 'quantity', 'quality', 'asking_price', 'phone'];
    for (const f of order) {
      if (missing.includes(f)) {
        return buildAskMessage(listing, extracted, prevListing, f, language);
      }
    }
    // Fallback to first missing field
    return buildAskMessage(listing, extracted, prevListing, missing[0], language);
  }

  // Unclear answer to the previous question: gently re-ask, don't skip ahead.
  if (extracted && isUnusableTurn(extracted)) {
    return isHiLang(language)
      ? 'Maaf kijiye, samajh nahi aaya. ' + generateQuestion(nextField, language)
      : `Sorry, I didn't catch that. ${generateQuestion(nextField, language)}`;
  }
  const echo = generateEcho(listing, extracted, prevListing, language);
  const question = generateQuestion(nextField, language);
  return echo ? `${echo} ${question}` : question;
};

// Affirmation matching -------------------------------------------------------
// STT returns the same "yes" many ways: Latin hinglish ("haan", "han",
// "sab sahi hai") and Devanagari ("हाँ", "सब सही है"). We normalise to a small
// roman token vocabulary, then accept ONLY short token sequences that START
// with an affirmation word and consist entirely of affirmation/filler words.
// Anything else (a field name, a number, a negation, arbitrary speech) is not
// an affirmation, so it can never be mistaken for "yes".
const AFFIRM_DEV_MAP = [
  [/सब\s*कुछ\s*(सही|ठीक|बढ़िया|बढिया)\s*हैं?/g, 'sab kuch $1 hai'],
  [/सब\s*सही\s*हैं?/g, 'sab sahi hai'],
  [/सब\s*ठीक\s*हैं?/g, 'sab theek hai'],
  [/हाँ|हां|हँ/g, 'haan'],
  [/बढ़िया|बढिया/g, 'badhiya'],
  [/ठीक/g, 'theek'],
  [/सही/g, 'sahi'],
  [/सब/g, 'sab'],
  [/कुछ/g, 'kuch'],
  [/हैं|है/g, 'hai'],
  [/जी/g, 'ji'],
];

const AFFIRM_NEGATIVE = /\b(nahi|nahin|no|nope|cancel|ruk|stop|band|exit|quit|galat|wrong|change|modify|badal|badalna|edit|update|fix|wait|actually|lekin|par|but|however|sorry|oops)\b/i;
const AFFIRM_NEGATIVE_DEV = /नही|रुक|ग़लत|गलत|बदल|रोक/;

const AFFIRM_STARTERS = new Set([
  'haan', 'ha', 'han', 'yes', 'yep', 'yup', 'ji', 'ok', 'okay', 'sahi', 'theek',
  'bilkul', 'zaroor', 'pakka', 'definitely', 'sure', 'confirmed', 'confirm',
  'correct', 'create', 'done', 'banado', 'bana', 'ho', 'sab', 'all', 'everything',
  'badhiya', 'badiya', 'set', 'haanji', 'y', '+', 'accha', 'acha', 'perfect',
  'great', 'clear', 'fine', 'good', 'right',
]);

const AFFIRM_TAIL = new Set([
  'ji', 'haan', 'han', 'ha', 'haanji', 'sab', 'kuch', 'bilkul', 'theek', 'sahi',
  'badhiya', 'badiya', 'set', 'hai', 'hain', 'he', 'ho', 'gaya', 'gayi', 'bana',
  'do', 'done', 'ok', 'okay', 'correct', 'right', 'good', 'fine', 'clear',
  'perfect', 'great', 'all', 'everything', 'yes', 'please', 'ab', 'sure',
  'confirmed', 'accha', 'acha', 'y', '+', 'ban', 'gay', 'chuka', 'wala', 'wale',
]);

const normalizeAffirmation = (raw) => {
  let s = String(raw ?? '').toLowerCase().trim();
  if (!s) return '';
  s = s.replace(/[\u2018\u2019\u201C\u201D'"`]/g, '');
  s = s.replace(/[.,!?;:()\[\]{}|/\\]+/g, ' ');
  for (const [re, to] of AFFIRM_DEV_MAP) s = s.replace(re, to);
  // Any Devanagari we could not map is not a known affirmation -> drop it so
  // it cannot smuggle a non-affirmative phrase past the token allow-list.
  s = s.replace(/[\u0900-\u097F]+/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
};

const isConfirmationAffirmative = (text) => {
  const raw = String(text ?? '').toLowerCase();
  if (!raw.trim()) return false;
  if (AFFIRM_NEGATIVE.test(raw) || AFFIRM_NEGATIVE_DEV.test(raw)) return false;
  const lower = normalizeAffirmation(text);
  if (!lower) return false;
  const tokens = lower.split(' ').filter(Boolean);
  if (tokens.length > 6) return false;
  if (!AFFIRM_STARTERS.has(tokens[0])) return false;
  return tokens.every((t, i) => i === 0 || AFFIRM_TAIL.has(t));
};

const isConfirmationNegative = (text) => {
  const lower = text.toLowerCase().trim().replace(/[.,!?]/g, '');
  if (isConfirmationCancelled(text)) return false;
  return /^(nahi|nahin|no|nope|wrong|galat|change|modify|badal|edit|arre|arey)/i.test(lower) ||
    /^(kuch|something|ye|yeh|wo|woh)\s+(change|badal|edit|modify)/i.test(lower) ||
    /^(change|modify|badal|edit)\s+(karna|kar)/i.test(lower) ||
    /\b(badal|badalna|change|modify)\b/.test(lower);
};

const isConfirmationCancelled = (text) => {
  const lower = text.toLowerCase().trim().replace(/[.,!?]/g, '');
  return /^(cancel|ruk|stop|band|exit|quit|never\s*mind|bhool\s*ja|bhul\s*ja|rakh\s*do|bas\s*band)/i.test(lower) ||
    /^(cancel\s+karo|band\s+karo|ruk\s*jao|bas\s+karo)$/i.test(lower);
};

// Detect bare "no change" responses during confirmation.
// "Nahi" alone, or "nahi, sab theek hai", "nahi sab sahi hai" etc. — all mean
// the listing is correct as-is and should be submitted immediately.
const isBareNoChangeResponse = (text) => {
  const lower = text.toLowerCase().trim().replace(/[.,!?]/g, '');
  return /^(nahi|nahin|no|nope)$/i.test(lower) ||
    /^(nahi|nahin|no|nope)[,.\s]+(sab|all|everything|sahi|theek|correct|right|good|badhiya|set)\b/i.test(lower) ||
    /^(nahi|nahin|no|nope)[,.\s]+(kuch|nothing|no)\s*(nahi|nahin|no)?$/i.test(lower) ||
    /^(sab|all|everything)\s+(sahi|theek|correct|right|good|set)\s*(hai)?$/i.test(lower) ||
    /^(sab|all|everything)\s+(hai|sahihai|theekhai|sethai)$/i.test(lower) ||
    /^(nothing|no)\s+(to\s+change|changes?)$/i.test(lower) ||
    /^(nahi|nahin|no)[,.\s]+(mujhe|kuch)\s+(nahi|nahin|no)\s*(change|badalna|karna)?$/i.test(lower);
};

// "Nahi, sab theek hai" / "nahi, kuch nahi" / "sab theek hai" — a no-change
// answer: the listing is already correct, so this affirms it (submit now)
// rather than requesting a change.
const isNoChangeAllGood = (text) => {
  const lower = text.toLowerCase().trim().replace(/[.,!?]/g, '');
  return /^(nahi|nahin|no|nope)[,.\s]+(sab|all|everything)\s+(sahi|theek|correct|right|good|set)/i.test(lower) ||
    /^(nahi|nahin|no|nope)[,.\s]+(kuch|nothing|no)\s*(nahi|nahin|no)?$/i.test(lower) ||
    /^(sab|all|everything)\s+(sahi|theek|correct|right|good|set)\s*(hai)?$/i.test(lower);
};

const applySellIntentOverride = (text, extracted) => {
  const lower = text.toLowerCase();
  if (/\bsell\b|bechna|à¤¬à¥‡à¤šà¤¨à¤¾/.test(lower) && !/\bbuy\b|khareed|à¤–à¤°à¥€à¤¦/.test(lower)) {
    extracted.intent = 'sell';
  }
};

const applyBareNumberAndCorrections = (text, extracted, session) => {
  const lower = text.toLowerCase();
  const hasQtyWord = /(kilo|kg|tonne|ton|quintal|litre|liter|piece|bag|dozen|किलो|टन|क्विंटल|लीटर|पीस|बोरी|दर्जन)/.test(lower);
  const hasPriceWord = /(rupaye|rupee|rs\b|â‚¹|per\s*kilo|per\s*kg|à¤°à¥à¤ªà¤¯à¥‡)/.test(lower);
  const asked = session.last_asked;
  const standalone = extractStandaloneNumber(text);

  // Phone numbers must never be mistaken for quantity/price.
  // A 10-digit number starting 6-9 is a phone, not a bare quantity.
  const isPhoneLike = standalone != null && (() => {
    const s = String(standalone).replace(/\D/g, '');
    return s.length >= 10 && /^[6-9]/.test(s);
  })();
  if (isPhoneLike) {
    if (extracted.phone == null) {
      const norm = normalizePhoneDigits(String(standalone));
      if (norm) {
        extracted.phone = norm;
        return;
      }
    }
    // Don't treat phone-like huge numbers as quantity/price when no explicit unit/price word
    if (!hasQtyWord && !hasPriceWord) {
      return;
    }
  }

  if (extracted.quantity == null && hasQtyWord && standalone != null && !hasPriceWord) {
    extracted.quantity = standalone;
    if (!extracted.unit) extracted.unit = /tonne|ton|à¤Ÿà¤¨/.test(lower) ? 'tonnes' : 'kg';
  }

  if (extracted.asking_price == null && hasPriceWord && standalone != null && !hasQtyWord) {
    extracted.asking_price = standalone;
    extracted.price_unit = extracted.price_unit || 'kg';
  }

  if (extracted.quantity == null && extracted.asking_price == null && standalone != null) {
    if (isCorrectionText(text) && !hasQtyWord && !hasPriceWord
        && asked === 'asking_price'
        && session.last_echo_field === 'quantity'
        && session.listing?.quantity != null) {
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
    } else if (asked === 'quantity') {
      extracted.quantity = standalone;
      extracted.unit = extracted.unit || 'kg';
    } else if (asked == null) {
      // Bare number with no field hint — use pending_correction_field if set
      // (from explicit field selection in correction flow), otherwise fall back
      // to last_echo_field or default to asking_price.
      const pending = session.pending_correction_field;
      if (pending === 'quantity' || (!pending && session.last_echo_field === 'quantity')) {
        extracted.quantity = standalone;
        extracted.unit = extracted.unit || session.listing.unit || 'kg';
      } else if (pending === 'asking_price') {
        extracted.asking_price = standalone;
        extracted.price_unit = extracted.price_unit || 'kg';
      } else if (pending === 'location') {
        extracted.location = String(standalone);
      } else if (pending === 'product') {
        extracted.product = String(standalone);
      } else if (pending === 'quality') {
        extracted.quality = String(standalone);
      } else {
        extracted.asking_price = standalone;
        extracted.price_unit = extracted.price_unit || 'kg';
      }
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

const applySlotFallbacks = (text, extracted, session) => {
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
    const hasNonNameWords = /\b(namaste|namaskar|se|hai|hain|ho|hun|hoon|mein|mera|meri|mere|ka|ki|ke|kya|kitna|kitne|yeh|woh|aur|ya|bhi|to|phir|ab|kal|aaj|wo|ye|paas|rupo?ye|kilo|wheat|rice|tomato|potato|onion|bechna|sell|buy|number|mobile|price|kimat|rate|quality|grade|location|address|gaon|village|shehar|city|jagah)\b/.test(stripped);
    if (stripped.length >= 2 && stripped.length <= 20 && !/\d/.test(stripped) && !hasNonNameWords) {
      extracted.farmer_name = stripped.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }
  if (isCorrectionText(text) && extractStandaloneNumber(text) == null && !extracted.product && !extracted.location && !extracted.farmer_name) {
    return;
  }
  if (nextField === 'farmer_name' && !extracted.farmer_name) {
    const trimmed = text.trim().replace(/[.,!?;:'"()]/g, '');
    const lower = trimmed.toLowerCase();
    if (['namaste','namaste ji','namaskar','hello','hi','hey','hii'].includes(lower)) return;
    const hasNonNameWords = /\b(namaste|namaskar|se|hai|hain|ho|hun|hoon|mein|mera|meri|mere|ka|ki|ke|kya|kitna|kitne|yeh|woh|aur|ya|bhi|to|phir|ab|kal|aaj|wo|ye|paas|rupo?ye|kilo|wheat|rice|tomato|potato|onion|bechna|sell|buy|number|mobile)\b/.test(lower);
    if (trimmed.length >= 2 && trimmed.length <= 20 && !/\d/.test(trimmed) && !hasNonNameWords && looksLikeCleanValue(trimmed, 3)) {
      extracted.farmer_name = trimmed.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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
      // Fallback for spoken Hindi/Hinglish/English number words when digits not found
      const fromWords = extractPhoneFromWords(text);
      if (fromWords) extracted.phone = fromWords;
    }
  }
  if (nextField === 'location' && !extracted.location) {
    const trimmed = text.trim().replace(/[.,!?;:'"()]/g, '');
    const lower = trimmed.toLowerCase();
    // Never treat greetings as location — "Namaste" is a greeting, not a place
    if (['namaste','namaste ji','namaskar','hello','hi','hey','hii'].includes(lower)) return;
    // A bare product answer ("Gobhi") is NEVER a place name; the echo of the
    // assistant's own words is rejected by looksLikeCleanValue as well.
    const isEcho = /\b(aap|ji|bechna|chahte|chahenge|theek|sab|ek\s+baar|check)\b/.test(lower);
    // Multi-word bare text without location grammar ("se", "mein", "from") is
    // more likely a name than a place — e.g. "Diya Raghav" must not become a
    // location. Only accept as location if it has location grammar or is a
    // single word (which is ambiguous and resolved by last_asked).
    const hasLocPrep = /\b(se|mein|me|from|in|at|near|paas)\b/i.test(trimmed);
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    if (
      trimmed.length >= 2 && trimmed.length <= 40 && !/\d/.test(trimmed)
      && !isNoiseAnswer(text) && !isEcho && looksLikeCleanValue(trimmed, 3)
    ) {
      if (hasLocPrep || wordCount === 1) {
        extracted.location = trimmed.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      } else if (!extracted.farmer_name && wordCount >= 2) {
        // Multi-word text without location grammar is a name, not a place.
        // Capture as farmer_name so the name isn't lost when the agent asked
        // for location but the farmer gave their name instead.
        extracted.farmer_name = trimmed.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
  }
};

// ── Grade-answer normalization ─────────────────────────────────────────────
// Speech-to-text renders a grade answer in many shapes: "Grade A", "A grade",
// "quality A", "grade, a", "grade-a", "Grade A.", "ग्रेड ए". Every one of them
// must land on the quality slot — otherwise the agent drops the answer, never
// fills quality and re-asks the same question forever. One normalizer strips
// punctuation and Devanagari so the matchers below do not depend on word order.
const GRADE_WORD = '(?:grade|quality|kism|kisam|darja)';
const GRADE_LETTER = '(a|ay|ey|ai|aay|b|bee|be|bi|c|see|sea|ci|si)';
const GRADE_TAIL = '(?:\\s+(?:hai|hain|he|is|ji))?';
const GRADE_LETTER_MAP = {
  a: 'A', ay: 'A', ey: 'A', ai: 'A', aay: 'A',
  b: 'B', bee: 'B', be: 'B', bi: 'B',
  c: 'C', see: 'C', sea: 'C', ci: 'C', si: 'C',
};
const DEV_GRADE_WORD_SRC = '\\u0917\\u094d\\u0930\\u0947\\u0921|\\u0921\\u093f\\u0917\\u094d\\u0930\\u0940|\\u0915\\u093f\\u0938\\u094d\\u092e|\\u0926\\u0930\\u091c\\u093e';
const DEV_LETTER_SRC = '\\u0910|\\u092c\\u0940|\\u0938\\u0940';
const DEV_GRADE_WORD = new RegExp(DEV_GRADE_WORD_SRC);
const DEV_GRADE_WORD_G = new RegExp(DEV_GRADE_WORD_SRC, 'g');
const DEV_LETTER_G = new RegExp(DEV_LETTER_SRC, 'g');

const normalizeGradeSpeech = (raw) => {
  let s = String(raw == null ? '' : raw).toLowerCase();
  // Devanagari grade answers ("ग्रेड ए", bare "बी") map onto their Latin
  // letters, but only when the utterance really is a grade answer. Hindi words
  // that merely contain those letter signs (किसी, बीमार) must stay untouched.
  const devRun = s.replace(/[^ऀ-ॿ]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (devRun) {
    const isGradeUtterance = DEV_GRADE_WORD.test(devRun)
      || devRun.replace(DEV_GRADE_WORD_G, '').replace(DEV_LETTER_G, '').replace(/\s+/g, ' ').trim() === '';
    if (isGradeUtterance) {
      s = s
        .replace(new RegExp(DEV_GRADE_WORD_SRC, 'g'), ' grade ')
        .replace(/ए/g, ' a ')
        .replace(/बी/g, ' b ')
        .replace(/सी/g, ' c ')
        .replace(/ऎ-ॏ।॥/g, ' ')
        .replace(/ -ࠀ/g, ' ')
        .replace(/ऀ-ॿ/g, ' ');
    }
  }
  s = s.replace(/[^a-z0-9]+/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
};

// Parses ONLY a grade value (Grade A / B / C). Explicit grade phrases work in
// either word order and do not depend on the quality question being pending;
// a bare letter ("A") only counts while we are actually waiting for the
// quality answer, so single letters can never hijack another slot.
const parseGradeAnswer = (text, askedQuality) => {
  const n = normalizeGradeSpeech(text);
  if (!n) return null;
  const letterOf = (raw) => GRADE_LETTER_MAP[raw] || null;
  const explicit = new RegExp(`\\b${GRADE_WORD}\\s+${GRADE_LETTER}${GRADE_TAIL}\\b`).exec(n)
    || new RegExp(`\\b${GRADE_LETTER}\\s+${GRADE_WORD}${GRADE_TAIL}\\b`).exec(n);
  if (explicit) {
    const g = letterOf(explicit[1]);
    if (g) return `Grade ${g}`;
  }
  if (askedQuality) {
    const bare = new RegExp(`^${GRADE_LETTER}${GRADE_TAIL}$`).exec(n);
    if (bare) {
      const g = letterOf(bare[1]);
      if (g) return `Grade ${g}`;
    }
  }
  return null;
};

// True when the whole utterance is nothing but a grade answer. Such a turn
// must not write into any other slot: the word detectors would otherwise store
// "B Grade" / "C" as the location or the farmer name.
const isPureGradeAnswer = (text, askedQuality) => {
  const n = normalizeGradeSpeech(text);
  if (!n) return false;
  if (new RegExp(`^(?:${GRADE_WORD}\\s+${GRADE_LETTER}|${GRADE_LETTER}\\s+${GRADE_WORD})${GRADE_TAIL}$`).test(n)) {
    return true;
  }
  return !!askedQuality && new RegExp(`^${GRADE_LETTER}${GRADE_TAIL}$`).test(n);
};

// ── Correction pair: "<old value> nahi <new value>" ──────────────────────────
// A farmer correcting something already stored usually says BOTH values:
//   "2 kg nahi 5 kg aalu bechna hai", "Ghaziabad nahi Noida",
//   "Grade A nahi Grade B hai", "30 nahi 35 rupaye kilo".
// The generic extractors scan the WHOLE utterance and keep the first/last
// match, so the OLD value wins, the correction is dropped — and the bare-name
// fallback can swallow the whole sentence as a farmer name. Split the
// utterance at the negation, decide which SINGLE field is being corrected, and
// extract ONLY the new value for that field; every other slot stays null so
// mergeListing() leaves the stored values untouched.
const CORR_NEG = '(?:nahi|nahin|no|nope|\\u0928\\u0939\\u0940\\u0902|\\u0928\\u0939\\u0940)';
const KNOWN_PRODUCT = /^(Tomato|Potato|Onion|Wheat|Rice|Cauliflower|Cabbage|Carrot|Peas|Apple|Banana|Mango|Maize|Cotton|Sugarcane|Soybean|Bajra|Jowar|Barley|Mustard|Groundnut|Moong|Chana|Masoor|Urad|Arhar|Mirch|Dhaniya|Jeera|Haldi|Garlic|Ginger|Brinjal|Bottle Gourd|Ridge Gourd|Parwal|Bitter Gourd|Pumpkin|Spinach|Methi)$/i;

const normValue = (v) => String(v ?? '').toLowerCase().replace(/[.,!?;:'"()]/g, ' ').replace(/\s+/g, ' ').trim();

// { before, after } only when the negation really separates two spoken values
// (speech on BOTH sides). A leading "Nahi," is the correction frame, not the
// separator, so "Nahi, 5 kilo hai" stays on the ordinary extraction path.
const splitCorrectionPair = (raw) => {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const stripped = text.replace(new RegExp(`^\\s*${CORR_NEG}[\\s,.;:!?)\\-]*`, 'i'), '').trim();
  if (!stripped) return null;
  const re = new RegExp(`(?:^|[\\s,.;:!?)\\-])(${CORR_NEG})(?=$|[\\s,.;:!?)\\-])`, 'gi');
  let m = null;
  let last = null;
  while ((m = re.exec(stripped)) !== null) {
    last = m;
    if (m.index === re.lastIndex) re.lastIndex += 1;
  }
  if (!last) return null;
  const before = stripped.slice(0, last.index).trim();
  const after = stripped.slice(last.index + last[0].length).trim();
  if (!before || !after) return null;
  return { before, after };
};

// The value spoken AFTER the negation is what the farmer wants stored now, so
// it decides the field first (content inference). Only when the new value is
// itself ambiguous (a bare place/name) do we fall back to asking which stored
// field the OLD value refers to.
const inferCorrectionField = (segment) => {
  const seg = String(segment ?? '').trim();
  if (!seg) return null;
  if (parseGradeAnswer(seg, true)) return 'quality';
  if (extractPhoneFromText(seg)) return 'phone';
  if (parsePrice(seg) != null) return 'asking_price';
  if (parseQuantity(seg).quantity != null) return 'quantity';
  if (detectAnyLocation(seg)) return 'location';
  const prod = normalizeProduct(seg);
  if (prod && KNOWN_PRODUCT.test(prod)) return 'product';
  return null;
};

// Which stored field does the OLD half of the pair refer to?
const matchStoredField = (rawBefore, listing) => {
  if (!listing) return null;
  const before = String(rawBefore ?? '').trim();
  if (!before) return null;
  const phone = extractPhoneFromText(before);
  if (phone && listing.phone && phone === String(listing.phone)) return 'phone';
  const grade = parseGradeAnswer(before, true);
  if (grade && listing.quality && grade === listing.quality) return 'quality';
  const qty = parseQuantity(before);
  if (qty.quantity != null && listing.quantity != null && qty.quantity === listing.quantity) return 'quantity';
  const price = parsePrice(before);
  if (price != null && listing.asking_price != null && price === listing.asking_price) return 'asking_price';
  const prod = normalizeProduct(before);
  if (prod && listing.product && prod.toLowerCase() === String(listing.product).toLowerCase()) return 'product';
  const beforeLoc = detectAnyLocation(before);
  if (listing.location && (normValue(before) === normValue(listing.location)
      || (beforeLoc && normValue(beforeLoc) === normValue(listing.location)))) return 'location';
  const bareName = before.replace(/^(naam|name)\s+/i, '').trim();
  if (listing.farmer_name && normValue(bareName) === normValue(listing.farmer_name)) return 'farmer_name';
  return null;
};

const CORR_EDGE_DROP = /^(nahi|nahin|no|nope|hai|hain|ho|hun|hoon|se|mein|me|from|in|at|near|ka|ki|ke|ko|par|bhi|hi|to|ji|karo|kar|karna|karni|dena|chahiye|bechna|sell|buy|rahah|raha|rahi|hun|hoon)$/i;

const titleCaseValue = (s) => s.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

// Up to three clean words with the sentence frame stripped off the edges.
const correctionFreeValue = (raw) => {
  const words = String(raw ?? '').replace(/[.,!?;:'"()]/g, ' ').split(/\s+/).filter(Boolean);
  while (words.length && CORR_EDGE_DROP.test(words[0])) words.shift();
  while (words.length && CORR_EDGE_DROP.test(words[words.length - 1])) words.pop();
  if (!words.length || words.length > 3) return null;
  const cand = words.join(' ');
  if (!looksLikeCleanValue(cand, 3)) return null;
  return cand;
};

// Same, but a canonical crop word can never be a place.
const correctionPlaceValue = (raw) => {
  const cand = correctionFreeValue(raw);
  if (!cand) return null;
  const canon = normalizeProduct(cand);
  if (canon && KNOWN_PRODUCT.test(canon) && canon.toLowerCase() !== cand.toLowerCase()) return null;
  return titleCaseValue(cand);
};

// Build an extracted-payload holding ONLY the corrected field. Returns null when
// the segment carries no value for that field, which makes the caller fall back
// to the ordinary full-utterance extraction (no behaviour change).
const correctionExtracted = (field, raw, session) => {
  const ex = {
    farmer_name: null,
    phone: null,
    product: null,
    quantity: null,
    unit: null,
    asking_price: null,
    price_unit: null,
    location: null,
    quality: null,
    intent: null,
  };
  const seg = String(raw ?? '').trim();
  if (!seg) return null;
  switch (field) {
    case 'quality': {
      const g = parseGradeAnswer(seg, true);
      if (!g) return null;
      ex.quality = g;
      return ex;
    }
    case 'phone': {
      const ph = extractPhoneFromText(seg);
      if (!ph) return null;
      ex.phone = ph;
      return ex;
    }
    case 'quantity': {
      const q = parseQuantity(seg);
      const n = q.quantity != null ? q.quantity : extractStandaloneNumber(seg);
      if (n == null) return null;
      ex.quantity = n;
      ex.unit = q.unit || session?.listing?.unit || 'kg';
      return ex;
    }
    case 'asking_price': {
      const p = parsePrice(seg);
      const n = p != null ? p : extractStandaloneNumber(seg);
      if (n == null) return null;
      ex.asking_price = n;
      ex.price_unit = session?.listing?.price_unit || 'kg';
      return ex;
    }
    case 'product': {
      const prod = normalizeProduct(seg);
      if (!prod) return null;
      ex.product = prod;
      ex.intent = 'sell';
      return ex;
    }
    case 'location': {
      const loc = correctionPlaceValue(seg);
      if (!loc) return null;
      ex.location = loc;
      return ex;
    }
    case 'farmer_name': {
      const name = correctionFreeValue(seg);
      if (!name || name.length < 2 || name.length > 30) return null;
      ex.farmer_name = titleCaseValue(name);
      return ex;
    }
    default:
      return null;
  }
};

const resolveCorrectionPair = (text, session) => {
  const parts = splitCorrectionPair(text);
  if (!parts) return null;
  const field = inferCorrectionField(parts.after) || matchStoredField(parts.before, session?.listing);
  if (!field) return null;
  const extracted = correctionExtracted(field, parts.after, session);
  if (!extracted) return null;
  return extracted;
};

const extractTurnData = (text, session) => {
  // "<old> nahi <new>" is an explicit single-field correction: resolve it first
  // and return ONLY that field so no other stored value can be overwritten.
  const corrected = resolveCorrectionPair(text, session);
  if (corrected) return corrected;
  const extracted = extractListingFallback(text);
  if (session && session.last_asked === 'farmer_name') {
    extracted.location = null;
  }
  applySellIntentOverride(text, extracted);
  const nameFromText = extractNameFromText(text);
  if (nameFromText) {
    // If the extracted name is the same as the detected location, the name
    // wins — the name detector uses grammar context ("main X hoon", "mera naam
    // X hai") so it is more reliable for identity statements. Clear the false
    // location to prevent farmer name from appearing as location in the
    // confirmation message.
    if (extracted.location && extracted.location.toLowerCase() === nameFromText.toLowerCase()) {
      extracted.location = null;
    }
    extracted.farmer_name = nameFromText;
    // If the extracted product is the same as the name, it was a false positive.
    // Use empty string (not null) so mergeListing overwrites the previous product.
    if (extracted.product && extracted.product.toLowerCase() === nameFromText.toLowerCase()) {
      extracted.product = '';
    }
  }
  const phoneFromText = extractPhoneFromText(text);
  if (phoneFromText) extracted.phone = phoneFromText;
  applyBareNumberAndCorrections(text, extracted, session);
  applySlotFallbacks(text, extracted, session);
  // Defense-in-depth with the adapter's duplicate guard: a known produce word
  // must NEVER become the farmer name, whichever extraction path proposed it
  // (e.g. the bare-name fallback accepting "Aalu" while the name question was
  // pending). Compare the name's canonical product (parser vocabulary:
  // "Aalu" -> "Potato") against the STORED canonical product — never against
  // this turn's extracted.product, which can be a false positive that reuses
  // the name word itself ("Diya" -> product "Diya"). Also reject names that
  // canonicalize into the manager's existing canonical produce list. Real
  // names canonicalize to null/unchanged, so valid farmer names are
  // preserved. Setting null means "leave the stored farmer_name alone"
  // (same convention as product).
  if (extracted.farmer_name) {
    const rawName = String(extracted.farmer_name).trim();
    const canonName = normalizeProduct(rawName);
    const canonProduct = session?.listing?.product || null;
    const singleWord = !/\s/.test(rawName);
    const isKnownProduceName = !!canonName && (
      (canonProduct && canonName.toLowerCase() === String(canonProduct).toLowerCase())
      || (singleWord && canonName.toLowerCase() !== rawName.toLowerCase())
      || /^(Tomato|Potato|Onion|Wheat|Rice|Cauliflower|Cabbage|Carrot|Peas|Apple|Banana|Mango)$/i.test(canonName)
    );
    if (isKnownProduceName) extracted.farmer_name = null;
  }
  // Prevent non-product answers (location/quality/name/price) from overwriting
  // product: null means "leave the stored product alone". (An empty string
  // would clear it, which is how a false-positive extraction wiped the product
  // when the farmer was answering a different question, e.g. the name.)
  // `product` may only be written when we are actually waiting for it. During
  // confirmation nothing is being asked (last_asked is null), so free text must
  // never land in product — a prompt echo, a stray word or the name of another
  // field used to count as a "changed" product and re-emit the whole summary.
  const awaitingProductAnswer = session.last_asked === 'product' || session.last_asked === 'intent';
  const guardsProduct = session.last_asked
    ? !awaitingProductAnswer
    : session?.state === 'CONFIRMING';
  if (guardsProduct && extracted.product && !/^(Tomato|Potato|Onion|Wheat|Rice|Cauliflower|Cabbage|Carrot|Peas|Apple|Banana|Mango)$/.test(extracted.product)) {
    extracted.product = null;
  }
  if ((extracted.product || extracted.quantity != null || extracted.asking_price != null) && !extracted.intent) {
    extracted.intent = 'sell';
  }
  const askedQuality = session?.last_asked === 'quality' || session?.pending_correction_field === 'quality';
  // A turn that is ONLY a grade answer ("Grade A", "A grade", "quality B")
  // carries no other slot value. The word detectors must never store the grade
  // itself as location / farmer name / product ("B Grade", "C"). null means
  // "leave the stored value alone" (same convention as product).
  if (isPureGradeAnswer(text, askedQuality)) {
    extracted.product = null;
    extracted.location = null;
    extracted.farmer_name = null;
  }
  const trimmedText = String(text).trim().replace(/[.!?]+$/, '');
  const said = extracted.quality != null ? /^grade\s*([abc])$/i.exec(String(extracted.quality).trim()) : null;
  const legacy = said
    || /\bgrade\s*([abc])\b/i.exec(trimmedText)
    || (askedQuality ? /^([abc])(?:\s+(?:hai|hain))?$/i.exec(trimmedText) : null);
  // Quality accepts ONLY Grade A / Grade B / Grade C - arbitrary speech (a
  // number, an unrelated word) must never populate the field, it is dropped so
  // the agent simply re-asks. The tolerant parser accepts the same strict
  // patterns PLUS the spoken forms the old regex rejected: "A grade",
  // "quality A", "grade, a", "grade-a", "ग्रेड ए". Every previously accepted
  // answer still resolves through `legacy`, so nothing regresses.
  extracted.quality = parseGradeAnswer(text, askedQuality)
    || (legacy ? `Grade ${legacy[1].toUpperCase()}` : null);
  return extracted;
};

const farmerMsg = (language, hi, en) => (isHiLang(language) ? hi : en);

// Submit the finished listing and return the terminal result. Called on the
// FIRST clear affirmative during confirmation — single-stage confirmation:
// "Haan sab sahi hai" creates the listing immediately and returns SUCCESS.
// There is no second "Kuch badalna hai?" prompt; a wrong detail is reported
// through the correction flow instead ("Kya badalna hai ji?").
const submitConfirmedListing = async (session, language, sessionId) => {
  session.state = STATES.SUBMITTING;
  const submittingMsg = farmerMsg(language, 'Theek hai ji, ab daal raha hoon...', 'Okay, saving it now...');
  session.turns.push({ role: 'agent', text: submittingMsg, timestamp: Date.now() });

  const result = await (_submitListingOverride?.(session.listing) ?? submitListing(session.listing));

  if (result.success) {
    session.state = STATES.SUCCESS;
    session.listing_id = result.listing_id ?? session.listing_id ?? null;
    session.confirmation_stage = null;
    session.pending_correction_field = null;
    session.last_asked = null;
    session.last_echo_field = null;
    // Terminal success message. Deliberately short and fixed: a longer
    // summary here was read by the farmer as another "confirm again" prompt.
    const successMsg = farmerMsg(
      language,
      SUCCESS_MESSAGE,
      SUCCESS_MESSAGE
    );
    session.turns.push({ role: 'agent', text: successMsg, timestamp: Date.now() });
    return {
      state: STATES.SUCCESS,
      listing: { ...session.listing },
      listing_id: result.listing_id,
      agent_message: successMsg,
      missing_fields: [],
      session_id: sessionId,
    };
  }

  session.state = STATES.CONFIRMING;
  session.confirmation_stage = null;
  const errorMsg = farmerMsg(
    language,
    'Abhi nahi ho paya ji. Ek baar phir try karein?',
    'It did not go through. Try again?'
  );
  session.turns.push({ role: 'agent', text: errorMsg, timestamp: Date.now() });
  return {
    state: STATES.CONFIRMING,
    listing: { ...session.listing },
    agent_message: errorMsg,
    missing_fields: [],
    session_id: sessionId,
  };
};

const processTurn = async (sessionId, text) => {
  if (!sessionId || typeof sessionId !== 'string') {
    return { state: STATES.ERROR, error: 'session_id is required' };
  }
  if (!text || typeof text !== 'string' || !text.trim()) {
    return { state: STATES.ERROR, error: 'text is required' };
  }

  let session = getSession(sessionId);
  if (!session) {
    session = createSession(sessionId);
  }

  session.updated_at = Date.now();
  session.turns.push({ role: 'farmer', text: text.trim(), timestamp: Date.now() });

  const prevState = session.state;
  // Hindi-only speech: always respond in Hindi (Hinglish Roman) dynamically from user data
  const language = 'hinglish';
  session.language = 'hinglish';

  // First contact: handle Namaste greeting naturally, without treating as data
  if (prevState === STATES.IDLE && !session.greeted) {
    session.greeted = true;
    const trimmedLower = text.trim().toLowerCase().replace(/[.,!?]/g, '');
    const isGreeting = /^(namaste|namaskar|hello|hi|hii|hey|नमस्ते|नमस्कार)/i.test(trimmedLower)
      || /^(namaste\s*ji|namaskar\s*ji|hello\s*ji|hi\s*ji)$/i.test(trimmedLower);
    if (isGreeting) {
      const msg = 'Namaste ji, FarmDirect se bol raha hoon. Kya bechna chahte hain?';
      session.state = STATES.LISTENING;
      session.last_asked = 'product';
      session.turns.push({ role: 'agent', text: msg, timestamp: Date.now() });
      return {
        state: STATES.LISTENING,
        listing: { ...session.listing },
        agent_message: msg,
        missing_fields: REQUIRED_FIELDS,
        next_field: 'product',
        session_id: sessionId,
      };
    }
    const firstExtracted = extractTurnData(text, session);
    if (isUnusableTurn(firstExtracted)) {
      const msg = 'Namaste ji, FarmDirect se bol raha hoon. Kya bechna chahte hain?';
      session.state = STATES.LISTENING;
      session.last_asked = 'product';
      session.turns.push({ role: 'agent', text: msg, timestamp: Date.now() });
      return {
        state: STATES.LISTENING,
        listing: { ...session.listing },
        agent_message: msg,
        missing_fields: REQUIRED_FIELDS,
        next_field: 'product',
        session_id: sessionId,
      };
    }
  }

  // Duplicate protection at state level: an already-approved session stays
  // SUCCESS. A repeated affirmation, a retried webhook or a re-render returns
  // the SAME listing without resetting state or triggering another submission.
  if (prevState === STATES.SUCCESS) {
    const lastAgent = [...session.turns].reverse().find((t) => t.role === 'agent')?.text || SUCCESS_MESSAGE;
    return {
      state: STATES.SUCCESS,
      listing: { ...session.listing },
      listing_id: session.listing_id ?? null,
      agent_message: lastAgent,
      missing_fields: [],
      session_id: sessionId,
    };
  }

  // Guard against re-entry while the API submission is in flight.
  if (prevState === STATES.SUBMITTING) {
    const msg = farmerMsg(language, 'Listing submit ho raha hai ji, ek second.', 'Submitting the listing, one second.');
    return {
      state: STATES.SUBMITTING,
      listing: { ...session.listing },
      listing_id: session.listing_id ?? null,
      agent_message: msg,
      missing_fields: [],
      session_id: sessionId,
    };
  }

  if (prevState === STATES.CONFIRMING) {
    if (isConfirmationCancelled(text)) {
      session.state = STATES.CANCELLED;
      session.listing = { ...EMPTY_LISTING };
      session.last_asked = null;
      const msg = farmerMsg(
        language,
        'Theek hai, rok diya. Phir se shuru karna ho toh bataiye.',
        'Okay, stopped. Tell me if you want to start again.'
      );
      session.turns.push({ role: 'agent', text: msg, timestamp: Date.now() });
      return {
        state: STATES.CANCELLED,
        listing: { ...session.listing },
        agent_message: msg,
        missing_fields: [],
        session_id: sessionId,
      };
    }
    // A recognised affirmation is checked FIRST, before any correction stage
    // and before slot extraction, so "सब सही है" / "Han sab sahi hai" can
    // never be merged into a field and can never re-trigger the summary.
    if (isConfirmationAffirmative(text)) {
      // Single-stage confirmation: the first clear "yes" submits the listing
      // immediately — there is no second "Kuch badalna hai?" prompt. A wrong
      // detail is reported through the correction flow instead.
      return submitConfirmedListing(session, language, sessionId);
    }
    // Correction field selection: user responds to "Kya badalna hai ji?"
    if (session.confirmation_stage === 'correction_field') {
      // "Nahi, sab theek hai" / "sab theek hai" — nothing to change after all:
      // the listing is correct, submit it now.
      if (isNoChangeAllGood(text)) {
        return submitConfirmedListing(session, language, sessionId);
      }
      // Bare "nahi" while choosing → back to the summary.
      if (isBareNoChangeResponse(text)) {
        session.confirmation_stage = null;
        session.pending_correction_field = null;
        session.last_asked = null;
        session.last_echo_field = null;
        const msg = generateConfirmation(session.listing, language);
        session.turns.push({ role: 'agent', text: msg, timestamp: Date.now() });
        return {
          state: STATES.CONFIRMING,
          listing: { ...session.listing },
          agent_message: msg,
          missing_fields: [],
          session_id: sessionId,
        };
      }
      const changeField = detectChangeField(text);
      if (changeField) {
        // Check if the input also contains a value (e.g. "price 15" or "5 kilo")
        const extracted = extractTurnData(text, session);
        applyBareNumberAndCorrections(text, extracted, session);
        if (hasExtractedData(extracted)) {
          // Input has both field and value — resolve directly
          const prevListing = { ...session.listing };
          session.listing = mergeListing(session.listing, extracted);
          session.confirmation_stage = null;
          session.pending_correction_field = null;
          session.last_asked = null;
          session.last_echo_field = null;
          const echo = generateEcho(session.listing, extracted, prevListing, language);
          const confirmMsg = generateConfirmation(session.listing, language);
          const msg = echo ? `${echo} ${confirmMsg}` : confirmMsg;
          session.turns.push({ role: 'agent', text: msg, timestamp: Date.now() });
          return {
            state: STATES.CONFIRMING,
            listing: { ...session.listing },
            agent_message: msg,
            missing_fields: [],
            session_id: sessionId,
          };
        }
        // Field word only — set pending_correction_field and ask for value
        session.pending_correction_field = changeField;
        session.confirmation_stage = 'correction_value';
        session.last_asked = changeField;
        session.last_echo_field = null;
        const askMsg = farmerMsg(language, 'Theek hai. ', 'Okay. ') + generateChangeQuestion(changeField, language);
        session.turns.push({ role: 'agent', text: askMsg, timestamp: Date.now() });
        return {
          state: STATES.CONFIRMING,
          listing: { ...session.listing },
          agent_message: askMsg,
          missing_fields: [],
          session_id: sessionId,
        };
      }
      // No field word detected — ask again with guidance
      const askMsg = farmerMsg(
        language,
        'Samajh nahi aaya ji. Quantity, price, location — kya badalna hai?',
        'I did not catch that. Please say quantity, price, location, or something else.'
      );
      session.turns.push({ role: 'agent', text: askMsg, timestamp: Date.now() });
      return {
        state: STATES.CONFIRMING,
        listing: { ...session.listing },
        agent_message: askMsg,
        missing_fields: [],
        session_id: sessionId,
      };
    }
    // Correction value: user responds to field-specific question (e.g. "Kitne rupaye hai?")
    if (session.confirmation_stage === 'correction_value' && session.pending_correction_field) {
      const extracted = extractTurnData(text, session);
      applyBareNumberAndCorrections(text, extracted, session);
      if (hasExtractedData(extracted)) {
        const prevListing = { ...session.listing };
        session.listing = mergeListing(session.listing, extracted);
        session.confirmation_stage = null;
        session.pending_correction_field = null;
        session.last_asked = null;
        session.last_echo_field = null;
        const echo = generateEcho(session.listing, extracted, prevListing, language);
        const confirmMsg = generateConfirmation(session.listing, language);
        const msg = echo ? `${echo} ${confirmMsg}` : confirmMsg;
        session.turns.push({ role: 'agent', text: msg, timestamp: Date.now() });
        return {
          state: STATES.CONFIRMING,
          listing: { ...session.listing },
          agent_message: msg,
          missing_fields: [],
          session_id: sessionId,
        };
      }
      // No data extracted — re-ask with field-specific question
      const askMsg = farmerMsg(language, 'Theek hai. ', 'Okay. ') + generateChangeQuestion(session.pending_correction_field, language);
      session.turns.push({ role: 'agent', text: askMsg, timestamp: Date.now() });
      return {
        state: STATES.CONFIRMING,
        listing: { ...session.listing },
        agent_message: askMsg,
        missing_fields: [],
        session_id: sessionId,
      };
    }
    if (isBareNoChangeResponse(text)) {
      // "Nahi, sab theek hai" / "nahi, kuch nahi" — nothing is wrong: the
      // listing is correct, so submit immediately (same as a plain "yes").
      if (isNoChangeAllGood(text)) {
        return submitConfirmedListing(session, language, sessionId);
      }
      // "Nahi" while choosing what to change → back to the summary.
      if (session.confirmation_stage === 'correction_field' || session.confirmation_stage === 'correction_value') {
        session.confirmation_stage = null;
        session.pending_correction_field = null;
        session.last_asked = null;
        session.last_echo_field = null;
        const msg = generateConfirmation(session.listing, language);
        session.turns.push({ role: 'agent', text: msg, timestamp: Date.now() });
        return {
          state: STATES.CONFIRMING,
          listing: { ...session.listing },
          agent_message: msg,
          missing_fields: [],
          session_id: sessionId,
        };
      }
      // Bare "no" at the summary → the farmer wants something changed. Ask
      // which field, then wait for the specific correction.
      session.confirmation_stage = 'correction_field';
      session.pending_correction_field = null;
      session.last_asked = null;
      session.last_echo_field = null;
      const msg = 'Kya badalna hai ji?';
      session.turns.push({ role: 'agent', text: msg, timestamp: Date.now() });
      return {
        state: STATES.CONFIRMING,
        listing: { ...session.listing },
        agent_message: msg,
        missing_fields: [],
        session_id: sessionId,
      };
    }
    if (isConfirmationNegative(text) || isCorrectionText(text)) {
      const prevListing = { ...session.listing };
      const extracted = extractTurnData(text, session);
      // Apply bare number correction with CONFIRMING context so that e.g.
      // "Nahi, 35" when we asked for price resolves to asking_price = 35.
      applyBareNumberAndCorrections(text, extracted, session);
      const hasNewData = hasExtractedData(extracted);
      if (hasNewData) {
        session.listing = mergeListing(session.listing, extracted);
        const missing = getMissingRequiredFields(session.listing);
        if (missing.length === 0) {
          session.state = STATES.CONFIRMING;
          session.confirmation_stage = null;
          session.last_asked = null;
          session.last_echo_field = null;
          const echo = generateEcho(session.listing, extracted, prevListing, language);
          const msg = echo ? `${echo} ${generateConfirmation(session.listing, language)}` : generateConfirmation(session.listing, language);
          session.turns.push({ role: 'agent', text: msg, timestamp: Date.now() });
          return {
            state: STATES.CONFIRMING,
            listing: { ...session.listing },
            agent_message: msg,
            missing_fields: [],
            session_id: sessionId,
          };
        }
        const nextField = getPriorityNextField(missing);
        session.last_asked = nextField;
        session.last_echo_field = lastEchoField(extracted);
        session.state = STATES.ASKING;
        const msg = buildAskMessage(session.listing, extracted, prevListing, nextField, language);
        session.turns.push({ role: 'agent', text: msg, timestamp: Date.now() });
        return {
          state: STATES.ASKING,
          listing: { ...session.listing },
          agent_message: msg,
          missing_fields: missing,
          next_field: nextField,
          session_id: sessionId,
        };
      }
      session.state = STATES.CONFIRMING;
      session.last_echo_field = null;
      const changeField = detectChangeField(text);
      let askMsg;
      if (changeField) {
        // Field named ("naam galat hai") — ask for the new value via the
        // correction machinery (pending_correction_field).
        session.confirmation_stage = 'correction_value';
        session.pending_correction_field = changeField;
        session.last_asked = changeField;
        askMsg = farmerMsg(language, 'Theek hai. ', 'Okay. ') + generateChangeQuestion(changeField, language);
      } else {
        // Correction given without naming a field — ask which one.
        session.confirmation_stage = 'correction_field';
        session.pending_correction_field = null;
        session.last_asked = null;
        askMsg = farmerMsg(language, 'Kya badalna hai ji?', 'What should I change?');
      }
      session.turns.push({ role: 'agent', text: askMsg, timestamp: Date.now() });
      return {
        state: STATES.CONFIRMING,
        listing: { ...session.listing },
        agent_message: askMsg,
        missing_fields: getMissingRequiredFields(session.listing),
        next_field: changeField || undefined,
        session_id: sessionId,
      };
    } else {
      const prevListing = { ...session.listing };
      const wasComplete = getMissingRequiredFields(prevListing).length === 0;
      const extracted = extractTurnData(text, session);
      // Farmer names what to change (e.g. just "price") - go straight to it.
      if (!hasExtractedData(extracted)) {
        const wantField = detectChangeField(text);
        if (wantField) {
          session.state = STATES.ASKING;
          session.last_asked = wantField;
          session.last_echo_field = null;
          const msg = farmerMsg(language, 'Theek hai. ', 'Okay. ') + generateChangeQuestion(wantField, language);
          session.turns.push({ role: 'agent', text: msg, timestamp: Date.now() });
          return {
            state: STATES.ASKING,
            listing: { ...session.listing },
            agent_message: msg,
            missing_fields: getMissingRequiredFields(session.listing),
            next_field: wantField,
            session_id: sessionId,
          };
        }
        // The listing was already complete and this turn carried no usable
        // data. Re-emitting the full summary here is what produced the
        // "Ek baar dekh lo ... Sab sahi hai?" confirmation loop.
        if (wasComplete) {
          const msg = shortConfirmMsg(language);
          session.turns.push({ role: 'agent', text: msg, timestamp: Date.now() });
          return {
            state: STATES.CONFIRMING,
            listing: { ...session.listing },
            agent_message: msg,
            missing_fields: [],
            session_id: sessionId,
          };
        }
      }
      session.listing = mergeListing(session.listing, extracted);

      const missing = getMissingRequiredFields(session.listing);
      if (missing.length === 0) {
        const changed = JSON.stringify(session.listing) !== JSON.stringify(prevListing);
        // Complete AND unchanged: never repeat the summary, never merge the
        // turn into a field. Ask for a plain yes instead.
        if (wasComplete && !changed) {
          const msg = shortConfirmMsg(language);
          session.turns.push({ role: 'agent', text: msg, timestamp: Date.now() });
          return {
            state: STATES.CONFIRMING,
            listing: { ...session.listing },
            agent_message: msg,
            missing_fields: [],
            session_id: sessionId,
          };
        }
        session.state = STATES.CONFIRMING;
        session.confirmation_stage = null;
        session.last_asked = null;
        session.last_echo_field = null;
        const msg = generateConfirmation(session.listing, language);
        session.turns.push({ role: 'agent', text: msg, timestamp: Date.now() });
        return {
          state: STATES.CONFIRMING,
          listing: { ...session.listing },
          agent_message: msg,
          missing_fields: [],
          session_id: sessionId,
        };
      }
      const nextField = getPriorityNextField(missing);
      session.last_asked = nextField;
      session.last_echo_field = lastEchoField(extracted);
      session.state = STATES.ASKING;
      const question = buildAskMessage(session.listing, extracted, prevListing, nextField, language);
      session.turns.push({ role: 'agent', text: question, timestamp: Date.now() });
      return {
        state: STATES.ASKING,
        listing: { ...session.listing },
        agent_message: question,
        missing_fields: missing,
        next_field: nextField,
        session_id: sessionId,
      };
    }
  }

  session.state = STATES.PROCESSING;

  const prevListing = { ...session.listing };
  const extracted = extractTurnData(text, session);

  // Farmer is steering to a different field (e.g. says "price" while we
  // asked for the phone number) - honor that switch instead of re-asking.
  if (!hasExtractedData(extracted)) {
    const wantField = detectChangeField(text);
    const missingNow = getMissingRequiredFields(session.listing);
    if (wantField && missingNow.includes(wantField)) {
      session.state = STATES.ASKING;
      session.last_asked = wantField;
      session.last_echo_field = null;
      const msg = farmerMsg(language, 'Theek hai. ', 'Okay. ') + generateChangeQuestion(wantField, language);
      session.turns.push({ role: 'agent', text: msg, timestamp: Date.now() });
      return {
        state: STATES.ASKING,
        listing: { ...session.listing },
        agent_message: msg,
        missing_fields: missingNow,
        next_field: wantField,
        session_id: sessionId,
      };
    }
  }

  // If the farmer just said a greeting mid-conversation and nothing useful was
  // extracted, respond naturally instead of "Maaf kijiye, samajh nahi aaya."
  if (!hasExtractedData(extracted)) {
    const trimmedLower = text.trim().toLowerCase().replace(/[.,!?]/g, '');
    const isGreeting = /^(namaste|namaskar|hello|hi|hii|hey|नमस्ते|नमस्कार)/i.test(trimmedLower)
      || /^(namaste\s*ji|namaskar\s*ji|hello\s*ji|hi\s*ji)$/i.test(trimmedLower);
    if (isGreeting) {
      const nextField = getPriorityNextField(getMissingRequiredFields(session.listing));
      session.last_asked = nextField;
      session.state = STATES.ASKING;
      const msg = 'Namaste ji! ' + generateQuestion(nextField, language);
      session.turns.push({ role: 'agent', text: msg, timestamp: Date.now() });
      return {
        state: STATES.ASKING,
        listing: { ...session.listing },
        agent_message: msg,
        missing_fields: getMissingRequiredFields(session.listing),
        next_field: nextField,
        session_id: sessionId,
      };
    }
  }

  session.listing = mergeListing(session.listing, extracted);

  const missing = getMissingRequiredFields(session.listing);

  if (missing.length === 0) {
    session.state = STATES.CONFIRMING;
    session.confirmation_stage = null;
    session.last_asked = null;
    session.last_echo_field = null;
    const msg = generateConfirmation(session.listing, language);
    session.turns.push({ role: 'agent', text: msg, timestamp: Date.now() });
    return {
      state: STATES.CONFIRMING,
      listing: { ...session.listing },
      agent_message: msg,
      missing_fields: [],
      session_id: sessionId,
    };
  }

  const nextField = getPriorityNextField(missing);
  session.last_asked = nextField;
  session.last_echo_field = lastEchoField(extracted);
  const msg = buildAskMessage(session.listing, extracted, prevListing, nextField, language);

  session.state = STATES.ASKING;
  session.turns.push({ role: 'agent', text: msg, timestamp: Date.now() });

  return {
    state: STATES.ASKING,
    listing: { ...session.listing },
    agent_message: msg,
    missing_fields: missing,
    next_field: nextField,
    session_id: sessionId,
  };
};

export {
  STATES,
  EMPTY_LISTING,
  REQUIRED_FIELDS,
  createSession,
  getSession,
  deleteSession,
  processTurn,
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
  sessions,
  setSubmitListingImpl,
  normalizeGradeSpeech,
  parseGradeAnswer,
  isPureGradeAnswer,
};
