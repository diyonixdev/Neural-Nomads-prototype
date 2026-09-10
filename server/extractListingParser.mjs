// Grammar glue words (closed-class function words in Hindi/Hinglish/English).
// Linguistic, not domain, knowledge: no product or place name consists of
// these, so they are excluded from dynamic extraction to prevent speech noise
// (or the assistant's own echo) from becoming data.
const GLUE_WORDS = new Set([
  'ko', 'se', 'mein', 'me', 'ka', 'ki', 'ke', 'par', 'tak', 'bhi', 'hi', 'to', 'na', 'ne', 'liye',
  'wala', 'wali', 'rakho', 'rakhi', 'rakhna', 'rakhta', 'rakhte', 'rakhu',
  'de', 'dena', 'dene', 'do', 'dijiye', 'diya', 'diye', 'kara',
  'karo', 'kar', 'karna', 'karni', 'kiye', 'liya', 'hua', 'hoti', 'hota', 'honge', 'hogi',
  'aur', 'the', 'a', 'an', 'of', 'for', 'and',
  'ji', 'aap', 'aapko', 'aapka', 'aapki', 'aapne', 'mujhe', 'main', 'mera', 'meri', 'mere',
  'hum', 'tum', 'yeh', 'ye', 'woh', 'wo', 'kya',
  'nahi', 'nahin', 'haan', 'theek', 'thik', 'bilkul', 'sahi', 'galat', 'sab', 'kuch',
  'kitna', 'kitne', 'ek', 'baar', 'teen', 'chaar', 'paanch',
  // Common verbs and time adverbs (closed-class grammar words)
  'bechna', 'chahiye', 'chahte', 'chahenge', 'khareed', 'kal', 'aaj', 'parso',
  'subah', 'shaam', 'raat', 'din', 'tak',
]);

// A candidate value is rejected when it looks like a sentence fragment or
// speech-recognition noise rather than a real name: contains digits, a stray
// single letter ("N Isi"), or any glue word ("Isi ko dar rakho").
const looksLikeCleanValue = (value, maxWords = 3) => {
  if (!value || typeof value !== 'string') return false;
  const lower = value.toLowerCase().trim();
  if (/\d/.test(lower)) return false;
  const words = lower.replace(/[.,!?;:'"()]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > maxWords) return false;
  if (words.some((w) => w.length < 2)) return false; // stray single-letter fragment
  if (words.some((w) => GLUE_WORDS.has(w))) return false;
  if (words.some((w) => /^(hai|hain|hoon|hun|nahi|nahin|bechna|sell|buy)$/.test(w))) return false;
  return true;
};

const titleCase = (s) =>
  s.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const normalizeProduct = (text) => {
  const t = text.toLowerCase();
  // Unicode-aware word boundaries (\b is ASCII-only in JS, which breaks
  // Devanagari matching) so words like "price" (contains "rice") or "naam"
  // (contains "aam") are not mistaken for products.
  const has = (pattern) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${pattern})(?![\\p{L}])`, 'u').test(t);
  if (has('tomato|tomatoes|tamatar|टमाटर')) return 'Tomato';
  if (has('potato|potatoes|aloo|आलू')) return 'Potato';
  if (has('onion|onions|pyaaz|pyaz|प्याज')) return 'Onion';
  if (has('wheat|gehun|gehu|गेहूं')) return 'Wheat';
  if (has('rice|chawal|चावल')) return 'Rice';
  if (has('cauliflower|gobhi|गोभी')) return 'Cauliflower';
  if (has('cabbage|patta\\s*gobhi')) return 'Cabbage';
  if (has('carrot|carrots|gajar|गाजर')) return 'Carrot';
  if (has('peas|matar|मटर')) return 'Peas';
  if (has('apple|apples|seb|सेब')) return 'Apple';
  if (has('banana|bananas|kela|केला')) return 'Banana';
  if (has('mango|mangoes|aam|आम')) return 'Mango';
  // Accept any unknown product: look for a word that isn't a filler word or location/name.
  return extractAnyProduct(text);
};

// Fallback: extract an arbitrary product name from text.
// Looks for a word that is not a number, unit, price word, or common filler.
const PRODUCT_FILLERS = new Set([
  'i','my','me','we','you','he','she','it','they','the','a','an',
  'mere','mera','meri','paas','hai','hain','ho','hun','hoon','se','mein','me','ka','ki','ke',
  'kya','kitna','kitne','yeh','woh','aur','ya','bhi','to','phir','ab','kal','aaj','wo','ye',
  // Greetings
  'hello','hi','hey','hii','helloo','helo','namaste','namaskar','namaskaram',
  'bechna','sell','buy','chahiye','khareed','chahte','chahenge','chahti',
  'rupaye','rupee','price','rate','kimat','daam','bhav',
  'kilo','kg','tonne','ton','quintal','litre','liter','piece','bag','dozen',
  'location','address','gaon','village','shehar','city','jagah',
  'phone','number','mobile','name','naam','quality','grade',
  'nahi','nahin','no','yes','haan','theek','ok','okay','ji','hun','hoon',
  'actually','wait','sorry','please','sir','madam','bhaiya','didi','uncle','aunty',
  'change','modify','edit','update','correct','fix','badal','badalna','badalni','karo','karna','kar',
  'galat','kuch','sab','fasal','saman','item','product','crop',
  'want','wants','need','needs','have','has','had','give','giving','getting',
]);

const extractAnyProduct = (text) => {
  const detectedLoc = detectAnyLocation(text);
  const locWords = detectedLoc ? new Set(detectedLoc.toLowerCase().split(/\s+/)) : new Set();
  const detectedName = extractNameFromText(text);
  const nameWords = detectedName ? new Set(detectedName.toLowerCase().split(/\s+/)) : new Set();

  const norm = text.toLowerCase().replace(/[.,!?;:'"()]/g, ' ');
  const words = norm.split(/\s+/).filter(Boolean);
  const LOC_PREP = new Set(['se', 'from', 'mein', 'me', 'in', 'at', 'near']);
  const LOC_BE   = new Set(['hai', 'hain', 'ho', 'hun', 'hoon', 'am', 'is', 'are']);

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (/^\d/.test(w)) continue;
    if (PRODUCT_FILLERS.has(w)) continue;
    if (GLUE_WORDS.has(w)) continue;
    if (locWords.has(w)) continue; // Skip words belonging to detected location
    if (nameWords.has(w)) continue; // Skip words belonging to detected farmer name
    // Skip unit words
    if (/^(kg|kilo|kilos|kilogram|ton|tonne|tonnes|quintal|qtl|litre|liter|piece|bag|dozen|किलो|टन|क्विंटल|लीटर|पीस|बोरी|दर्जन)$/.test(w)) continue;
    // Skip price words
    if (/^(rupaye|rupee|rs|₹|per|kimat|rate|daam|bhav)$/.test(w)) continue;
    // Skip common verbs/fillers
    if (/^(hai|hain|ho|hun|hoon|se|mein|me|ka|ki|ke|aur|ya|bhi|to|phir|ab)$/.test(w)) continue;

    // Skip words in a location pattern: <WORD> <PREP> (<BE>|time|end-of-sentence)
    if (i + 1 < words.length && LOC_PREP.has(words[i + 1]) &&
        (i + 2 >= words.length || LOC_BE.has(words[i + 2]) || /^(kal|aaj|parso|subah|shaam|raat|din|tak)$/.test(words[i + 2]))) {
      continue;
    }
    // Skip words that follow context markers (naam, hai, se, mein, location, jagah, etc.)
    if (i > 0) {
      const prev = words[i - 1];
      if (/^(naam|name|hai|hain|ho|hun|hoon|se|mein|me|location|jagah|place|village|gaon|town|city|shehar|sthan|maal)$/.test(prev)) continue;
    }

    if (w.length >= 2 && w.length <= 30) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    }
  }
  return null;
};

const parseQuantity = (text) => {
  const norm = text.toLowerCase().replace(/\s+/g, ' ');
  let m = norm.match(/(\d+(?:\.\d+)?)\s*(kg|kilo|kilos|kilogram|kilograms|किलो|किलोग्राम)(?:\s|,|\.|$)/)
    || norm.match(/(\d+(?:\.\d+)?)\s*(ton|tons|tonne|tonnes|टन)(?:\s|,|\.|$)/)
    || norm.match(/(\d+(?:\.\d+)?)\s*(quintal|qtl|क्विंटल)(?:\s|,|\.|$)/)
    || norm.match(/(\d+(?:\.\d+)?)\s*(litre|liter|litres|liters|लीटर)(?:\s|,|\.|$)/)
    || norm.match(/(\d+(?:\.\d+)?)\s*(piece|pieces|पीस)(?:\s|,|\.|$)/)
    || norm.match(/(\d+(?:\.\d+)?)\s*(bag|bags|bori|boriyon|बोरी|बोरियां)(?:\s|,|\.|$)/)
    || norm.match(/(\d+(?:\.\d+)?)\s*(dozen|darjan|दर्जन)(?:\s|,|\.|$)/);
  if (!m) return { quantity: null, unit: null };
  const qty = Number(m[1]);
  const raw = m[2].toLowerCase();
  if (raw.includes('quintal') || raw.includes('qtl') || raw.includes('क्विंटल')) {
    return { quantity: qty * 100, unit: 'kg' };
  }
  if (raw.startsWith('ton') || raw === 'टन') return { quantity: qty, unit: 'tonnes' };
  if (raw.startsWith('litre') || raw.startsWith('liter') || raw === 'लीटर') return { quantity: qty, unit: 'litre' };
  if (raw.startsWith('piece') || raw === 'पीस') return { quantity: qty, unit: 'piece' };
  if (raw.startsWith('bag') || raw.startsWith('bori') || raw === 'बोरी' || raw === 'बोरियां') return { quantity: qty, unit: 'bag' };
  if (raw.startsWith('dozen') || raw === 'दर्जन') return { quantity: qty, unit: 'dozen' };
  return { quantity: qty, unit: 'kg' };
};

const parsePrice = (text) => {
  const n = text.toLowerCase();
  let m = n.match(/(?:₹|rs\.?|inr|रु\.?)\s*(\d+(?:\.\d+)?)/)
    || n.match(/(\d+(?:\.\d+)?)\s*(?:rupees|rs|रुपये|rupaye|rupaiya)\s*(?:per\s*)?(?:kg|kilo|किलो)?/)
    || n.match(/(\d+(?:\.\d+)?)\s*per\s*kg/);
  if (!m) {
    m = n.match(/(\d+(?:\.\d+)?)\s*rupaye/) || n.match(/(\d+(?:\.\d+)?)\s*rupaiya/);
  }
  if (m) {
    const num = Number(m[1]);
    if (!isNaN(num) && num > 0 && num < 10000) return num;
  }
  return null;
};

const parseGrade = (text) => {
  const n = text.toLowerCase();
  if (/(grade\s*a|ग्रेड\s*ए)/.test(n)) return 'Grade A';
  if (/(grade\s*b|ग्रेड\s*बी)/.test(n)) return 'Grade B';
  if (/organic|ऑर्गेनिक/.test(n)) return 'Organic';
  if (/(quality\s+(?:achhi|acchi|accha|achha|badhiya|badiya|good|best)|(?:achhi|acchi|accha|achha|badhiya|badiya|good|best|shandar|uttam)\s+quality|quality\s+is\s+good|quality\s+good)/.test(n)) {
    return 'Good';
  }
  if (/(quality\s+(?:theek|thik|average|normal|medium|ok)|(?:theek|thik|average|normal|medium|ok)\s+quality)/.test(n)) {
    return 'Average';
  }
  if (/(quality\s+(?:kharab|bekar|poor|bad)|(?:kharab|bekar|poor|bad)\s+quality)/.test(n)) {
    return 'Poor';
  }
  if (/\b(achhi|acchi|accha|achha|badhiya|badiya|shandar|uttam)\b/.test(n) && !/\b(naam|name|se|kilo|rupaye)\b/.test(n)) {
    return 'Good';
  }
  return null;
};

const parseIntent = (text) => {
  const lower = text.toLowerCase();
  const isBuyer = /(chahiye|chahie|need|needs|want|wants|buy|khareed|kharid|talash|dhoondh.*chahiye|चाहिए|खरीद)/.test(lower);
  const isSeller = /(paas\s+(?:hai|hain)|\bhave\b|\bhain\b|(?<![a-z])hai(?![a-z])|bechna|sell|available|mere\s+paas|mujhe\s+(?:hai|hain)|बेचना)/i.test(lower);
  if (isSeller && !isBuyer) return 'sell';
  if (isBuyer && !isSeller) return 'buy';
  if (isSeller && isBuyer) return /buyers|khareedar/.test(lower) ? 'sell' : 'buy';
  return 'sell';
};

const extractNameFromText = (text) => {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();

  // Pattern: "mera naam Ramesh hai", "my name is Ramesh"
  let m = lower.match(/(?:mera naam|my name is)\s+([a-zA-Z\u0900-\u097F][a-zA-Z\u0900-\u097F\s]{0,30}?)(?:\s+(?:hai|hain|ho|se|mein|from|is|am)|[.,]|$)/);
  if (m) {
    const name = m[1].trim();
    if (name.length >= 2 && name.length <= 40 && looksLikeCleanValue(name, 3)) {
      return titleCase(name);
    }
  }

  // Pattern: "i am Ramesh", "i'm Ramesh"
  m = lower.match(/(?:i am|i'm)\s+([a-zA-Z\u0900-\u097F][a-zA-Z\u0900-\u097F\s]{0,30}?)(?:\s+(?:from|hai|hain|ho|se|mein)|[.,]|$)/);
  if (m) {
    const name = m[1].trim();
    if (name.length >= 2 && name.length <= 40 && !/\b(from|se|in|at)\b/.test(name) && looksLikeCleanValue(name, 3)) {
      return titleCase(name);
    }
  }

  // Pattern: "main Ramesh hoon", "main Ramesh hun" (protecting from "main Ghaziabad se hoon")
  m = lower.match(/(?:main)\s+([a-zA-Z\u0900-\u097F][a-zA-Z\u0900-\u097F\s]{0,30}?)\s+(?:hun|hoon|hain|hai)/);
  if (m) {
    const name = m[1].trim();
    if (name.length >= 2 && name.length <= 40 && !/\b(se|mein|me|from|in|at)\b/.test(name) && looksLikeCleanValue(name, 3)) {
      return titleCase(name);
    }
  }

  // Pattern: "naam Ramesh hai", "naam: Ramesh", "name Ramesh"
  m = lower.match(/(?:naam|name)\s+(?:mera|hai|is|:)?\s*([a-zA-Z\u0900-\u097F][a-zA-Z\u0900-\u097F\s]{0,30}?)(?:\s+(?:hai|hain|ho|se|mein|from|is)|[.,]|$)/);
  if (m) {
    const name = m[1].trim();
    if (name.length >= 2 && name.length <= 40 && !/\b(se|mein|me|from|in|at)\b/.test(name) && looksLikeCleanValue(name, 3)) {
      return titleCase(name);
    }
  }

  return null;
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
  return null;
};

const detectAnyLocation = (text) => {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();
  const tokens = lower.replace(/[.,!?;:'"()\u0964\u0965]/g, ' ').split(/\s+/).filter(Boolean);
  const BE = new Set(['hai', 'hain', 'ho', 'hun', 'hoon', 'am', 'is', 'are', 'rehta', 'rehte', 'rahta', 'rahte', 'live', 'living']);
  const PREP = new Set(['se', 'from', 'mein', 'me', 'in', 'at', 'near', 'paas']);
  const HEAD = new Set(['location', 'jagah', 'place', 'gaon', 'village', 'shehar', 'city', 'town', 'nagar', 'sthan', 'maal', 'address', 'pata']);
  const CONJ = new Set(['aur', 'and', 'lekin', 'but', 'ya', 'or']);
  const TIME = new Set(['kal', 'aaj', 'parso', 'subah', 'shaam', 'raat', 'din', 'tak']);
  const NOT_PLACE = new Set([
    'kilo', 'kilos', 'kg', 'kilogram', 'ton', 'tons', 'tonne', 'tonnes', 'quintal', 'qtl',
    'litre', 'liters', 'liter', 'piece', 'pieces', 'bag', 'bags', 'dozen', 'bori',
    'rupaye', 'rupaiya', 'rupee', 'rupees', 'rs', 'per', 'total', 'rate', 'price', 'daam', 'bhav',
  ]);
  const SWALLOWED = new Set([
    'main', 'mein', 'me', 'i', 'my', 'mera', 'meri', 'mere', 'hum', 'naam', 'name',
    'hello', 'hi', 'hey', 'hii', 'helloo', 'helo', 'namaste', 'namaskar', 'namaskaram',
    ...Array.from(GLUE_WORDS),
  ]);

  const cleanCandidate = (start, end) => {
    const words = [];
    for (let i = start; i <= end; i++) {
      const w = tokens[i];
      if (HEAD.has(w)) continue;
      if (BE.has(w) || PREP.has(w)) break;
      if (CONJ.has(w)) break;
      if (NOT_PLACE.has(w)) return null;
      if (SWALLOWED.has(w) && words.length === 0) continue;
      if (SWALLOWED.has(w)) break;
      if (/^\d/.test(w)) return null;
      words.push(w);
    }
    if (words.length === 0 || words.length > 3) return null;
    const cand = words.join(' ');
    return looksLikeCleanValue(cand, 3) ? titleCase(cand) : null;
  };

  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i];
    // Pattern: <PLACE> <PREP> (<BE>|<TIME>|end) — "ghaziabad se hoon", "meerut se", "pune mein hoon"
    if (!PREP.has(w) && !HEAD.has(w) && !SWALLOWED.has(w) && !BE.has(w) && !NOT_PLACE.has(w) &&
        i + 1 < tokens.length && PREP.has(tokens[i + 1]) &&
        (i + 2 >= tokens.length || BE.has(tokens[i + 2]) || TIME.has(tokens[i + 2]))) {
      const cand = cleanCandidate(i, i);
      if (cand) return cand;
    }
    // Pattern: from/in/at/mein/location <PLACE>
    if ((w === 'from' || w === 'in' || w === 'at' || w === 'near' || w === 'mein' || w === 'me' || HEAD.has(w)) && i + 1 < tokens.length) {
      const cand = cleanCandidate(i + 1, i + 1);
      if (cand) return cand;
    }
    // Pattern: <BE> after preposition+place
    if (BE.has(w) && i >= 2 && PREP.has(tokens[i - 2])) {
      const cand = cleanCandidate(i - 1, i - 1);
      if (cand) return cand;
    }
  }

  // Pattern: comma-separated field lists
  const CORRECTION = new Set(['no', 'nope', 'nahi', 'nahin', 'actually', 'wait', 'change', 'modify', 'edit', 'update', 'correct', 'wrong', 'galat', 'cancel', 'stop']);
  const segments = text.split(/[,;]/).map(s => s.trim()).filter(Boolean);
  for (const seg of segments) {
    let segTokens = seg.toLowerCase().replace(/[.,!?;:'"()]/g, ' ').split(/\s+/).filter(Boolean);
    while (segTokens.length && CORRECTION.has(segTokens[0])) segTokens = segTokens.slice(1);
    if (segTokens.length < 1 || segTokens.length > 2) continue;
    const joined = segTokens.join(' ');
    if (segTokens.some(t => /^\d/.test(t) || NOT_PLACE.has(t) || GLUE_WORDS.has(t) || BE.has(t) || PREP.has(t) || SWALLOWED.has(t) || HEAD.has(t))) continue;
    if (!looksLikeCleanValue(joined, 2)) continue;
    // Don't mistake a known crop for a place
    const tLower = joined.toLowerCase();
    if (/(tomato|tomatoes|tamatar|potato|potatoes|aloo|onion|onions|pyaaz|wheat|gehun|rice|chawal|cauliflower|gobhi|cabbage|carrot|gajar|peas|matar|apple|seb|banana|kela|mango|aam)/.test(tLower)) continue;
    return titleCase(joined);
  }

  // Devanagari place transliteration map (script mapping, not city hardcoding).
  const devanagariMap = {
    'गाज़ियाबाद': 'Ghaziabad', 'गाजियाबाद': 'Ghaziabad',
    'दिल्ली': 'Delhi', 'नोएडा': 'Noida', 'मेरठ': 'Meerut',
    'हापुड़': 'Hapur', 'बुलंदशहर': 'Bulandshahr', 'सोनीपत': 'Sonipat',
    'पानीपत': 'Panipat', 'करनाल': 'Karnal', 'गुरुग्राम': 'Gurugram',
    'मुरादनगर': 'Muradnagar', 'दसना': 'Dasna', 'मोदीनगर': 'Modinagar',
  };
  const devMatch = Object.entries(devanagariMap).find(([dev]) => text.includes(dev));
  if (devMatch) return devMatch[1];

  return null;
};

const detectLocation = detectAnyLocation;

const extractListingFallback = (text) => {
  const farmer_name = extractNameFromText(text);
  const phone = extractPhoneFromText(text);
  const location = detectAnyLocation(text);
  const product = normalizeProduct(text);
  const { quantity, unit } = parseQuantity(text);
  const grade = parseGrade(text);
  const price = parsePrice(text);
  const intent = parseIntent(text);

  let normalizedProduct = product;
  if (farmer_name && product && product.toLowerCase() === farmer_name.toLowerCase()) {
    normalizedProduct = null;
  }
  if (location && product && product.toLowerCase() === location.toLowerCase()) {
    normalizedProduct = null;
  }

  return {
    farmer_name,
    phone,
    product: normalizedProduct,
    quantity,
    unit,
    asking_price: price,
    price_unit: price ? 'kg' : null,
    location,
    quality: grade,
    intent,
  };
};

export {
  normalizeProduct,
  parseQuantity,
  parsePrice,
  parseGrade,
  parseIntent,
  detectLocation,
  detectAnyLocation,
  extractNameFromText,
  extractPhoneFromText,
  extractListingFallback,
  looksLikeCleanValue,
  GLUE_WORDS,
};
