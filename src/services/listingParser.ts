// Client-side port of the Phase 1 extraction logic (server/extractListingParser.mjs).
// Used by the local conversation engine so the voice agent works without any API calls.

export interface ExtractedSlots {
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
}

const titleCase = (s: string) =>
  s.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

// Grammar glue words (closed-class function words in Hindi/Hinglish/English).
// This is linguistic, not domain, knowledge: no product or place name consists
// of these, so they are excluded from dynamic extraction to prevent speech-
// recognition noise (or the assistant's own echo) from becoming data.
const GLUE_WORDS = new Set([
  // Postpositions / particles
  'ko', 'se', 'mein', 'ka', 'ki', 'ke', 'par', 'tak', 'bhi', 'hi', 'to', 'na', 'ne', 'liye',
  'wala', 'wali', 'rakho', 'rakhi', 'rakhna', 'rakhta', 'rakhte', 'rakhu',
  'de', 'dena', 'dene', 'do', 'dijiye', 'kara',
  'karo', 'kar', 'kiye', 'liya', 'hua', 'hoti', 'hota', 'honge', 'hogi',
  'aur', 'the', 'a', 'an', 'of', 'for', 'and',
  // Pronouns and address words
  'ji', 'aap', 'aapko', 'aapka', 'aapki', 'aapne', 'mujhe', 'main', 'mera', 'meri', 'mere',
  'hum', 'tum', 'yeh', 'ye', 'woh', 'wo', 'kya',
  // Conversation fillers / yes-no / quality descriptors / quantity-in-words used by echoes
  'nahi', 'nahin', 'haan', 'theek', 'thik', 'bilkul', 'sahi', 'galat', 'sab', 'kuch',
  'kitna', 'kitne', 'ek', 'baar', 'teen', 'chaar', 'paanch',
  'achhi', 'acchi', 'accha', 'achha', 'badhiya', 'badiya', 'shandar', 'uttam',
  'kharab', 'bekar',
  // Common verbs and time adverbs (closed-class grammar words)
  'bechna', 'chahiye', 'chahte', 'chahenge', 'khareed', 'kal', 'aaj', 'parso',
  'subah', 'shaam', 'raat', 'din', 'tak',
]);

// A candidate value is rejected when it looks like a sentence fragment or
// speech-recognition noise rather than a real name: contains digits, a stray
// single letter ("N Isi"), or any glue word ("Isi ko dar rakho").
const looksLikeCleanValue = (value: string, maxWords = 3): boolean => {
  const lower = value.toLowerCase();
  if (/\d/.test(lower)) return false;
  const words = lower.replace(/[.,!?;:'"()]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > maxWords) return false;
  if (words.some((w) => w.length < 2)) return false; // stray single-letter fragment
  if (words.some((w) => GLUE_WORDS.has(w))) return false;
  if (words.some((w) => /^(hai|hain|hoon|hun|nahi|nahin|bechna|sell|buy)$/.test(w))) return false;
  return true;
};

// Known crops — the closed vocabulary that normalizeProduct returns before
// falling through to the open-ended extractAnyProduct. Used by
// isKnownCrop() to distinguish strong product evidence (actual crop name)
// from weak evidence (arbitrary word picked up by extractAnyProduct).
const KNOWN_CROPS = new Set([
  'Tomato', 'Potato', 'Onion', 'Wheat', 'Rice',
  'Cauliflower', 'Cabbage', 'Carrot', 'Peas',
  'Apple', 'Banana', 'Mango',
]);

/** Returns true if `product` is one of the known crop names. */
const isKnownCrop = (product: string | null): product is string =>
  product !== null && KNOWN_CROPS.has(product);

const normalizeProduct = (text: string): string | null => {
  const t = text.toLowerCase();
  // Unicode-aware word boundaries (\b is ASCII-only in JS, which breaks
  // Devanagari matching) so words like "price" (contains "rice") or "naam"
  // (contains "aam") are not mistaken for products.
  const has = (pattern: string) =>
    new RegExp(`(?<![\\p{L}\\p{N}])(?:${pattern})(?![\\p{L}])`, 'u').test(t);
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
  // Accept any unknown product: look for a word that isn't a filler word.
  return extractAnyProduct(text);
};

// Fallback: extract an arbitrary product name from text.
// This function identifies product words by排除filler words, units, prices, verbs,
// and words that appear after context markers (like "se", "hai", "mein").
const PRODUCT_FILLERS = new Set([
  // Pronouns and determiners
  'mere','mera','meri','paas','hai','hain','ho','hun','hoon','se','mein','ka','ki','ke',
  'kya','kitna','kitne','yeh','woh','aur','ya','bhi','to','phir','ab','kal','aaj','wo','ye',
  'i','my','me','we','you','he','she','it','they','the','a','an',
  // Greetings
  'hello','hi','hey','hii','helloo','helo','namaste','namaskar','namaskaram',
  // Selling/buying verbs
  'bechna','sell','buy','chahiye','khareed','chahte','chahenge','chahti',
  // Price/money words
  'rupaye','rupee','price','rate','kimat','daam','bhav',
  // Units
  'kilo','kg','tonne','ton','quintal','litre','liter','piece','bag','dozen',
  // Location words
  'location','address','gaon','village','shehar','city','jagah',
  // Contact words
  'phone','number','mobile','name','naam',
  // Quality words — must never be extracted as product names
  'quality','grade','achhi','acchi','accha','achha','badhiya','badiya','shandar','uttam',
  'theek','thik','average','normal','medium','ok',
  'kharab','bekar','poor','bad',
  // Common Hindi/English fillers
  'nahi','nahin','no','yes','haan','theek','ok','okay','ji',
  // Context markers (words that come before location/name)
  'main','mein','se','hoon','hun','hai','hain',
  // Additional filler words
  'actually','wait','sorry','please','sir','madam','bhaiya','didi','uncle','aunty',
  'change','modify','edit','update','correct','fix','badal','badalna','badalni','karo','karna','kar',
  'galat','kuch','sab','fasal','saman','item','product','crop',
  'want','wants','need','needs','have','has','had','give','giving','getting','is','are','was','were','am','be','been','being','do','does','did','will','would','can','could','should','may','might','must','shall',
  // NOTE: Never hardcode person names — dynamic nameWords exclusion handles that.
]);

const extractAnyProduct = (text: string): string | null => {
  const detectedLoc = detectLocation(text);
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
    if (/^[₹$€£]|^(?:rs|inr)\b/i.test(w)) continue;
    if (PRODUCT_FILLERS.has(w)) continue;
    if (GLUE_WORDS.has(w)) continue;
    if (locWords.has(w)) continue; // Skip words belonging to detected location
    if (nameWords.has(w)) continue; // Skip words belonging to detected farmer name (dynamic, not hardcoded)
    if (/^(kg|kilo|kilos|kilogram|ton|tonne|tonnes|quintal|qtl|litre|liter|piece|bag|dozen|किलो|टन|क्विंटal|लीटर|पीस|बोरी|दर्जन)$/.test(w)) continue;
    if (/^(rupaye|rupee|rs|₹|per|kimat|rate|daam|bhav)$/.test(w)) continue;
    if (/^(hai|hain|ho|hun|hoon|se|mein|ka|ki|ke|aur|ya|bhi|to|phir|ab)$/.test(w)) continue;

    // Skip words in a location pattern: <WORD> <PREP> (<BE>|time|end-of-sentence)
    if (i + 1 < words.length && LOC_PREP.has(words[i + 1]) &&
        (i + 2 >= words.length || LOC_BE.has(words[i + 2]) || /^(kal|aaj|parso|subah|shaam|raat|din|tak)$/.test(words[i + 2]))) {
      continue;
    }
    // Skip words that follow context markers (appear after "naam", "hai", "se", etc.)
    if (i > 0) {
      const prev = words[i - 1];
      if (/^(naam|name|hai|hain|ho|hun|hoon|se|mein|location|jagah|place|village|gaon|town|city|shehar|sthan|maal)$/.test(prev)) continue;
    }
    if (w.length >= 2 && w.length <= 30) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    }
  }
  return null;
};

// True when the whole utterance is ONLY product + quantity (optionally with
// price/location too). Used to protect bare single-word answers like
// "Gobhi" from the location fallback: a bare product is never a place name.
const isBareProductUtterance = (text: string): boolean => {
  const product = extractAnyProduct(text);
  const { quantity } = parseQuantity(text);
  const price = parsePrice(text);
  const remainder = text
    .toLowerCase()
    .replace(/[.,!?;:'"()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !/^\d/.test(w))
    .filter((w) => !PRODUCT_FILLERS.has(w))
    .filter((w) => !GLUE_WORDS.has(w))
    .filter((w) => !/^(kg|kilo|kilos|kilogram|ton|tonne|tonnes|quintal|qtl|litre|liter|piece|bag|dozen|किलो|टन|क्विंटल|लीटर|पीस|बोरी|दर्जन)$/.test(w))
    .filter((w) => !/^(rupaye|rupee|rs|₹|per|kimat|rate|daam|bhav)$/.test(w))
    .filter((w) => !/^(hai|hain|ho|hun|hoon|se|mein|ka|ki|ke|aur|ya|bhi|to|phir|ab)$/.test(w))
    .filter((w) => !(product && w === product.toLowerCase()))
    .filter((w) => !(quantity != null && /^\d+$/.test(w)))
    .join(' ')
    .trim();
  return Boolean((product || quantity != null || price != null) && remainder.length === 0);
};

const parseQuantity = (text: string): { quantity: number | null; unit: string | null } => {
  const norm = text.toLowerCase().replace(/\s+/g, ' ');
  const m =
    norm.match(/(\d+(?:\.\d+)?)\s*(kg|kilo|kilos|kilogram|kilograms|किलो|किलोग्राम)(?:\s|,|\.|$)/) ||
    norm.match(/(\d+(?:\.\d+)?)\s*(ton|tons|tonne|tonnes|टन)(?:\s|,|\.|$)/) ||
    norm.match(/(\d+(?:\.\d+)?)\s*(quintal|qtl|क्विंटल)(?:\s|,|\.|$)/) ||
    norm.match(/(\d+(?:\.\d+)?)\s*(litre|liter|litres|liters|लीटर)(?:\s|,|\.|$)/) ||
    norm.match(/(\d+(?:\.\d+)?)\s*(piece|pieces|पीस)(?:\s|,|\.|$)/) ||
    norm.match(/(\d+(?:\.\d+)?)\s*(bag|bags|bori|boriyon|बोरी|बोरियां)(?:\s|,|\.|$)/) ||
    norm.match(/(\d+(?:\.\d+)?)\s*(dozen|darjan|दर्जन)(?:\s|,|\.|$)/);
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

const parsePrice = (text: string): number | null => {
  const n = text.toLowerCase();
  let m =
    n.match(/(?:₹|rs\.?|inr|रु\.?)\s*(\d+(?:\.\d+)?)/) ||
    n.match(/(\d+(?:\.\d+)?)\s*(?:rupees|rs|रुपये|rupaye|rupaiya)\s*(?:per\s*)?(?:kg|kilo|किलो)?/) ||
    n.match(/(\d+(?:\.\d+)?)\s*per\s*kg/);
  if (!m) {
    m = n.match(/(\d+(?:\.\d+)?)\s*rupaye/) || n.match(/(\d+(?:\.\d+)?)\s*rupaiya/);
  }
  if (m) {
    const num = Number(m[1]);
    if (!isNaN(num) && num > 0 && num < 10000) return num;
  }
  return null;
};

const parseGrade = (text: string): string | null => {
  const n = text.toLowerCase();
  if (/(grade\s*a|ग्रेड\s*ए)/.test(n)) return 'Grade A';
  if (/(grade\s*b|ग्रेड\s*बी)/.test(n)) return 'Grade B';
  if (/organic|ऑर्गेनिक/.test(n)) return 'Organic';
  // Hindi/Hinglish quality descriptors — dynamic, not hardcoded product data.
  // Maps spoken quality words to structured values so they are never mistaken
  // for product names or other fields.
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
  if (/\b(theek|thik|average|normal|medium|ok)\b/.test(n) && !/\b(naam|name|se|kilo|rupaye)\b/.test(n)) {
    return 'Average';
  }
  if (/\b(kharab|bekar|poor|bad)\b/.test(n) && !/\b(naam|name|se|kilo|rupaye)\b/.test(n)) {
    return 'Poor';
  }
  return null;
};

const parseIntent = (text: string): 'sell' | 'buy' => {
  const lower = text.toLowerCase();
  const isBuyer = /(chahiye|chahie|need|needs|want|wants|buy|khareed|kharid|talash|dhoondh.*chahiye|चाहिए|खरीद)/.test(lower);
  const isSeller =
    /(paas\s+(?:hai|hain)|\bhave\b|\bhain\b|(?<![a-z])hai(?![a-z])|bechna|sell|available|mere\s+paas|mujhe\s+(?:hai|hain)|बेचना)/i.test(lower);
  if (isSeller && !isBuyer) return 'sell';
  if (isBuyer && !isSeller) return 'buy';
  if (isSeller && isBuyer) return /buyers|khareedar/.test(lower) ? 'sell' : 'buy';
  return 'sell';
};

// Detect any location from text using contextual grammar — not hardcoded city
// lists. A place is recognized by its linguistic ROLE in the sentence:
//   <PLACE> se/ke paas + (hoon|hai)   → "Main Ghaziabad se hoon"
//   from <PLACE> (+ am/is)            → "I am from Pune"
//   <PLACE> mein/me + (hoon|hai)      → "Main Pune mein hoon"
//   (location|jagah|gaon|village|shehar) <PLACE>
// Candidates are validated with looksLikeCleanValue, so sentence fragments,
// be-verbs ("hoon"), glue words ("Isi ko dar rakho"), or stray letters
// ("N Isi") can never become the location.
const detectLocation = (text: string): string | null => {
  const lower = text.toLowerCase();
  const tokens = lower.replace(/[.,!?;:'"()]/g, ' ').split(/\s+/).filter(Boolean);
  const BE = new Set(['hai', 'hain', 'ho', 'hun', 'hoon', 'am', 'is', 'are']);
  const PREP = new Set(['se', 'from', 'mein', 'me', 'in', 'at', 'near', 'paas']);
  const HEAD = new Set(['location', 'jagah', 'place', 'gaon', 'village', 'shehar', 'city', 'town', 'nagar', 'sthan']);
  const CONJ = new Set(['aur', 'and', 'lekin', 'but', 'ya', 'or']);
  const TIME = new Set(['kal', 'aaj', 'parso', 'subah', 'shaam', 'raat', 'din', 'tak']);
  // Units and price words are never place names ("10 kilo mein ..." must not
  // yield location "Kilo"). Closed vocabulary, not a city list.
  const NOT_PLACE = new Set([
    'kilo', 'kilos', 'kg', 'kilogram', 'ton', 'tons', 'tonne', 'tonnes', 'quintal', 'qtl',
    'litre', 'liters', 'liter', 'piece', 'pieces', 'bag', 'bags', 'dozen', 'bori',
    'rupaye', 'rupaiya', 'rupee', 'rupees', 'rs', 'per', 'total', 'rate', 'price', 'daam', 'bhav',
  ]);
  const SWALLOWED = new Set([
    'main', 'mein', 'me', 'i', 'my', 'mera', 'meri', 'mere', 'hum', 'naam', 'name',
    'hello','hi','hey','hii','helloo','helo','namaste','namaskar','namaskaram',
    ...Array.from(GLUE_WORDS),
  ]);
  const PRODUCT_WORDS = new Set([
    'tomato','tomatoes','tamatar','potato','potatoes','aloo','onion','onions','pyaaz','pyaz',
    'wheat','gehun','gehu','rice','chawal','cauliflower','gobhi','cabbage','carrot','gajar',
    'peas','matar','apple','seb','banana','kela','mango','aam','maize','makka','corn','cotton','kapas',
    'sugarcane','ganna','soybean','soyabean','bajra','jowar','barley','jau','mustard','sarson','groundnut','moongphali','moong','dal','chana','masoor','urad','arhar','mirch','chilli','dhaniya','coriander','jeera','cumin','haldi','turmeric',
    // Quality descriptors — never place names
    'achhi','acchi','accha','achha','badhiya','badiya','shandar','uttam','kharab','bekar',
  ]);

  const cleanCandidate = (start: number, end: number): string | null => {
    const words: string[] = [];
    for (let i = start; i <= end; i++) {
      const w = tokens[i];
      if (HEAD.has(w)) continue; // allow "gaon Baroli" / "location X"
      if (BE.has(w) || PREP.has(w)) break;
      if (CONJ.has(w)) break;
      if (SWALLOWED.has(w) && words.length === 0) continue; // leading filler
      if (SWALLOWED.has(w)) break;
      if (/^\d/.test(w)) return null;
      if (PRODUCT_WORDS.has(w)) return null;
      words.push(w);
    }
    if (words.length === 0 || words.length > 3) return null;
    const cand = words.join(' ');
    if (cand.split(/\s+/).some(ww => PRODUCT_WORDS.has(ww.toLowerCase()))) return null;
    return looksLikeCleanValue(cand, 3) ? titleCase(cand) : null;
  };  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i];
    // Pattern: <PLACE> <PREP> — "ghaziabad se", "meerut se", "pune mein" (even mid-sentence)
    if (!PREP.has(w) && !HEAD.has(w) && !SWALLOWED.has(w) && !BE.has(w) && !NOT_PLACE.has(w) &&
        i + 1 < tokens.length && PREP.has(tokens[i + 1])) {
      const cand = cleanCandidate(i, i);
      if (cand) return cand;
    }
    // Pattern: from/in/at/mein <PLACE> — "from pune", "in Ghaziabad",
    // "jagah meerut hai"
    if ((w === 'from' || w === 'in' || w === 'at' || w === 'near' || w === 'mein' || HEAD.has(w)) && i + 1 < tokens.length) {
      const cand = cleanCandidate(i + 1, i + 1);
      if (cand) return cand;
    }
    // Pattern: <BE> after preposition+place: "... se ghaziabad hoon" (rare)
    if (BE.has(w) && i >= 2 && PREP.has(tokens[i - 2])) {
      const cand = cleanCandidate(i - 1, i - 1);
      if (cand) return cand;
    }
  }

  // Pattern: comma-separated field lists — "10 kilo wheat, 30 rupaye,
  // Ghaziabad, mera naam Raj hai". A standalone 1-2 word segment is a
  // location candidate only if it is clean AND cannot be a product of the
  // sentence (normalizeProduct(segment) === null), so crops are never
  // mistaken for places. Names are also excluded: "Priya" in
  // "Priya, 9876543210, Meerut" must not become a location.
  // Leading correction words ("Actually Noida") are stripped; pure
  // corrections ("No", "change") reduce to nothing.
  const CORRECTION = new Set(['no', 'nope', 'nahi', 'nahin', 'actually', 'wait', 'change', 'modify', 'edit', 'update', 'correct', 'wrong', 'galat', 'cancel', 'stop']);
  const detectedName = extractNameFromText(text);
  const nameWords = detectedName ? new Set(detectedName.toLowerCase().split(/\s+/)) : new Set();
  const segments = text.split(/[,;]/).map((x) => x.trim()).filter(Boolean);
  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si];
    // If the next segment is a phone number, this segment is a name, not a
    // place — check BEFORE stripping "se"/"mein" so "Tarun Sagar se, 985..."
    // is correctly treated as name+phone, not location.
    if (si + 1 < segments.length) {
      const nextDigits = segments[si + 1].replace(/\D/g, '');
      if (nextDigits.length >= 10 && /^[6-9]/.test(nextDigits)) continue;
    }
    let segTokens = seg.toLowerCase().replace(/[.,!?;:'"()]/g, ' ').split(/\s+/).filter(Boolean);
    while (segTokens.length && CORRECTION.has(segTokens[0])) segTokens = segTokens.slice(1);
    while (segTokens.length > 1 && PREP.has(segTokens[segTokens.length - 1])) segTokens = segTokens.slice(0, -1);
    if (segTokens.length < 1 || segTokens.length > 2) continue;
    const joined = segTokens.join(' ');
    if (segTokens.some((t) => /^\d/.test(t) || NOT_PLACE.has(t) || GLUE_WORDS.has(t) || BE.has(t) || PREP.has(t) || SWALLOWED.has(t) || HEAD.has(t))) continue;
    if (segTokens.some((t) => nameWords.has(t))) continue; // it's a name, not a place
    const tLower = joined.toLowerCase();
    if (PRODUCT_WORDS.has(tLower) || tLower.split(/\s+/).some(w => PRODUCT_WORDS.has(w)) || /(tomato|tamatar|potato|aloo|onion|pyaaz|wheat|gehun|rice|chawal|cauliflower|gobhi|cabbage|carrot|gajar|peas|matar|apple|seb|banana|kela|mango|aam)/.test(tLower)) continue; // it's a crop, not a place
    return segTokens.map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join(' ');
  }

  // Devanagari place transliteration map (transliteration, not city hardcoding
  // — each entry only maps one script to another for the same name).
  const devanagariMap: Record<string, string> = {
    'गाज़ियाबाद': 'Ghaziabad', 'गाजियाबाद': 'Ghaziabad',
    'दिल्ली': 'Delhi', 'नोएडा': 'Noida', 'मेरठ': 'Meerut',
    'हापुड़': 'Hapur', 'बुलंदशहर': 'Bulandshahr', 'सोनीपत': 'Sonipat',
    'पानीपत': 'Panipat', 'करनाल': 'Karnal', 'गुरुग्राम': 'Gurugram',
    'मुरादनगर': 'Muradnagar', 'दसना': 'Dasna', 'मोदीनगर': 'Modinagar',
  };
  for (const [dev, roman] of Object.entries(devanagariMap)) {
    if (text.includes(dev)) return roman;
  }

  return null;
};

const extractNameFromText = (text: string): string | null => {
  const lower = text.toLowerCase();
  const patterns = [
    /(?:mera naam|my name is)\s+([a-zA-Z\u0900-\u097F][a-zA-Z\u0900-\u097F\s]{0,30}?)(?:\s+(?:hai|hain|ho|se|mein|from|is|am)|[.,]|$)/,
    /(?:i am|i'm)\s+([a-zA-Z\u0900-\u097F][a-zA-Z\u0900-\u097F\s]{0,30}?)(?:\s+(?:from|hai|hain|ho|se|mein)|[.,]|$)/,
    /(?:main|main)\s+([a-zA-Z\u0900-\u097F][a-zA-Z\u0900-\u097F\s]{0,30}?)\s+(?:hun|hoon|hain|hai)/,
    /(?:naam|name)\s+(?:mera|hai|is|:)?\s*([a-zA-Z\u0900-\u097F][a-zA-Z\u0900-\u097F\s]{0,30}?)(?:\s+(?:hai|hain|ho|se|mein|from|is)|[.,]|$)/,
  ];
  for (const pattern of patterns) {
    const m = lower.match(pattern);
    if (m) {
      const name = m[1].trim();
      // Names must be clean word sequences. Rejects: "ghaziabad se" (a place
      // + postposition caught by "Main X hoon"), digits, glue-word fragments,
      // and stray letters — none of these are ever a person's name.
      if (name.length >= 2 && name.length <= 40 && looksLikeCleanValue(name, 3)) {
        return name
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }
    }
  }

  // Bare-name fallback for comma-separated lists: "Priya, 9876543210, Meerut"
  // A standalone 1-word segment followed by a phone number is a name, not a
  // location. This prevents names from being mistakenly extracted as locations
  // by detectLocation's comma-segment logic.
  const segments = text.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    const nextSeg = segments[i + 1];
    // Check if next segment is a phone number (10+ digits, starts with 6-9)
    const nextDigits = nextSeg.replace(/\D/g, '');
    const isNextPhone = nextDigits.length >= 10 && /^[6-9]/.test(nextDigits);
    if (!isNextPhone) continue;
    // Current segment must be a clean 1-2 word proper noun
    const cleaned = seg.replace(/[.,!?;:'"()]/g, '').trim();
    const cleanedLower = cleaned.toLowerCase();
    if (cleaned.length < 2 || cleaned.length > 20) continue;
    if (/\d/.test(cleaned)) continue;
    if (PRODUCT_FILLERS.has(cleanedLower) || GLUE_WORDS.has(cleanedLower)) continue;
    if (/^(kg|kilo|tonne|ton|quintal|litre|piece|bag|dozen|rupaye|rupee|rs|per|kimat|rate|daam|bhav)$/.test(cleanedLower)) continue;
    if (looksLikeCleanValue(cleaned, 2)) {
      return titleCase(cleaned);
    }
  }

  return null;
};

const WORD_TO_DIGIT: Record<string, string> = {
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

const normalizePhoneDigits = (digits: string): string | null => {
  let d = String(digits).replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 10 && /^[6-9]/.test(d)) return d;
  return null;
};

const extractPhoneFromWords = (text: string): string | null => {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();
  const tokens = lower.replace(/[^a-z0-9\u0900-\u097F]+/g, ' ').split(/\s+/).filter(Boolean);
  let currentSeq = '';
  let best: string | null = null;
  const flush = (): boolean => {
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

const extractPhoneFromText = (text: string): string | null => {
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

const extractStandaloneNumber = (text: string): number | null => {
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

export {
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
};
