// Grammar glue words (closed-class function words in Hindi/Hinglish/English).
// Linguistic, not domain, knowledge: no product or place name consists of
// these, so they are excluded from dynamic extraction to prevent speech noise
// (or the assistant's own echo) from becoming data.
const GLUE_WORDS = new Set([
  'ko', 'se', 'mein', 'me', 'ka', 'ki', 'ke', 'par', 'tak', 'bhi', 'hi', 'to', 'na', 'ne', 'liye',
  'wala', 'wali', 'wale', 'rakho', 'rakhi', 'rakhna', 'rakhta', 'rakhte', 'rakhu',
  'de', 'dena', 'dene', 'do', 'dijiye', 'kara',
  'karo', 'kar', 'karna', 'karni', 'kiye', 'liya', 'hua', 'hoti', 'hota', 'honge', 'hogi',
  'aur', 'the', 'a', 'an', 'of', 'for', 'and',
  'ji', 'aap', 'aapko', 'aapka', 'aapki', 'aapne', 'mujhe', 'main', 'mera', 'meri', 'mere',
  'hum', 'tum', 'yeh', 'ye', 'woh', 'wo', 'kya',
  'nahi', 'nahin', 'haan', 'theek', 'thik', 'bilkul', 'sahi', 'galat', 'sab', 'kuch',
  'kitna', 'kitne', 'ek', 'baar', 'teen', 'chaar', 'paanch',
  'achhi', 'acchi', 'accha', 'achha', 'badhiya', 'badiya', 'shandar', 'uttam',
  'kharab', 'bekar',
  // Common verbs and time adverbs (closed-class grammar words)
  'bechna', 'chahiye', 'chahte', 'chahenge', 'khareed', 'kal', 'aaj', 'parso',
  'subah', 'shaam', 'raat', 'din', 'tak',
  // Additional common Hindi function words
  'hai', 'hain', 'ho', 'hun', 'hoon', 'tha', 'thi', 'the', 'hoga', 'hogi', 'honge',
  'wahan', 'yahan', 'vahan', 'ahan', 'kahan', 'kahin', 'jahan',
  'abhi', 'ab', 'phir', 'fir', 'uske', 'iske', 'unke', 'inke',
  'koi', 'kuch', 'sab', 'kam', 'zyada', 'bahut', 'thoda', 'zyaada',
  'dijiye', 'bataiye', 'bolo', 'batao', 'suno', 'dekho',
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
  if (has('potato|potatoes|aloo|aalu|आलू')) return 'Potato';
  if (has('onion|onions|pyaaz|pyaz|piyaz|प्याज')) return 'Onion';
  if (has('wheat|gehun|gehu|गेहूं')) return 'Wheat';
  if (has('rice|chawal|चावल')) return 'Rice';
  if (has('cauliflower|gobhi|phool gobhi|फूल गोभी')) return 'Cauliflower';
  if (has('cabbage|patta\\s*gobhi|patta\\s*gobi')) return 'Cabbage';
  if (has('carrot|carrots|gajar|गाजर')) return 'Carrot';
  if (has('peas|matar|मटर')) return 'Peas';
  if (has('apple|apples|seb|सेब')) return 'Apple';
  if (has('banana|bananas|kela|kele|केला')) return 'Banana';
  if (has('mango|mangoes|aam|aami|आम')) return 'Mango';
  if (has('maize|corn|makka|makai|makka|मक्का|भुट्टा')) return 'Maize';
  if (has('cotton|kapas|कपास')) return 'Cotton';
  if (has('sugarcane|ganna|gur|गन्ना')) return 'Sugarcane';
  if (has('soybean|soya\\s*bean|soyabean|सोयाबीन')) return 'Soybean';
  if (has('bajra|bajri|बाजरा')) return 'Bajra';
  if (has('jowar|jowari|ज्वार')) return 'Jowar';
  if (has('barley|jau|जौ')) return 'Barley';
  if (has('mustard|sarson|सरसों')) return 'Mustard';
  if (has('groundnut|moongphali|peanut|मूंगफली')) return 'Groundnut';
  if (has('moong|moong\\s*dal|मूंग')) return 'Moong';
  if (has('chana|chickpea|gram|chana\\s*dal|छोले|चना')) return 'Chana';
  if (has('masoor|masoor\\s*dal|red\\s*lentil|मसूर')) return 'Masoor';
  if (has('urad|urad\\s*dal|उड़द')) return 'Urad';
  if (has('arhar|arhar\\s*dal|toor|tur|अरहर')) return 'Arhar';
  if (has('mirch|chilli|chili|mirchi|मिर्च')) return 'Mirch';
  if (has('dhaniya|coriander|धनिया')) return 'Dhaniya';
  if (has('jeera|cumin|जीरा')) return 'Jeera';
  if (has('haldi|turmeric|हल्दी')) return 'Haldi';
  if (has('garlic|lahsun|लहसुन')) return 'Garlic';
  if (has('ginger|adrak|अदरक')) return 'Ginger';
  if (has('brinjal|eggplant|baingan|aubergine|बैंगन')) return 'Brinjal';
  if (has('lauki|bottle\\s*gourd|दोदा')) return 'Bottle Gourd';
  if (has('torai|ridge\\s*gourd|तोरई')) return 'Ridge Gourd';
  if (has('parwal|pointed\\s*gourd|परवल')) return 'Parwal';
  if (has('karela|bitter\\s*gourd|करेला')) return 'Bitter Gourd';
  if (has('pumpkin|kaddu|कद्दू')) return 'Pumpkin';
  if (has('spinach|palak|पालक')) return 'Spinach';
  if (has('methi|fenugreek|मेथी')) return 'Methi';
  // Accept any unknown product: look for a word that isn't a filler word or location/name.
  return extractAnyProduct(text);
};

// Fallback: extract an arbitrary product name from text.
// Looks for a word that is not a number, unit, price word, or common filler.
const PRODUCT_FILLERS = new Set([
  'i','my','me','we','you','he','she','it','they','the','a','an',
  'mere','mera','meri','paas','hai','hain','ho','hun','hoon','se','mein','me','ka','ki','ke',
  'kya','kitna','kitne','kitni','yeh','woh','aur','ya','bhi','to','phir','ab','kal','aaj','wo','ye',
  // Greetings
  'hello','hi','hey','hii','helloo','helo','namaste','namaskar','namaskaram',
  'bechna','sell','buy','chahiye','khareed','chahte','chahenge','chahti',
  'rupaye','rupee','price','rate','kimat','daam','bhav',
  'kilo','kg','tonne','ton','quintal','litre','liter','piece','bag','dozen',
  'location','address','gaon','village','shehar','city','jagah',
  'phone','number','mobile','name','naam',  // Quality words — must never be extracted as product names
  'quality','grade','achhi','acchi','accha','achha','badhiya','badiya','shandar','uttam',
  'theek','thik','average','normal','medium','ok',
  'kharab','bekar','poor','bad',
  'nahi','nahin','no','yes','haan','theek','ok','okay','ji','hun','hoon',
  'actually','wait','sorry','please','sir','madam','bhaiya','didi','uncle','aunty',
  'change','modify','edit','update','correct','fix','badal','badalna','badalni','karo','karna','kar',
  'galat','kuch','sab','fasal','saman','item','product','crop',
  'quantity','qty','amount','badlao',
  'want','wants','need','needs','have','has','had','give','giving','getting','is','are','was','were','am','be','been','being','do','does','did','will','would','can','could','should','may','might','must','shall',
  // Additional common Hindi function words / fillers
  'hai','hain','ho','hun','hoon','tha','thi','the','hoga','hogi','honge',
  'wahan','yahan','kahan','kahin','jahan',
  'abhi','ab','phir','uske','iske','unke','inke',
  'koi','kam','zyada','bahut','thoda','zyaada',
  'dijiye','bataiye','bolo','batao','suno','dekho',
  'wala','wali','wale','rakho','de','dena','dene','do',
  'ji','aap','aapko','aapka','aapki','aapne','mujhe','main','mera','meri','mere',
  'hum','tum','yeh','ye','woh','wo',
  'nahi','nahin','haan','bilkul','sahi','galat','sab','kuch',
  'kitna','kitne','ek','baar','teen','chaar','paanch',
  // NOTE: Do NOT hardcode person names here — product extraction uses dynamic
  // nameWords exclusion (detected via extractNameFromText) to avoid treating a
  // farmer's name as a crop. Hardcoded lists break for ANY unseen name.
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
  // If text clearly indicates a price (not quantity), do not extract quantity.
  if (/(?:₹|rs\.?|inr|रु\.?|rupaye|rupaiya|per\s*kg|per\s*kilo)/i.test(text.toLowerCase())) {
    return { quantity: null, unit: null };
  }
  const norm = text.toLowerCase().replace(/\s+/g, ' ');
  // Unit delimiter is optional (\b) so "500 kilo tamatar hai" matches
  // alongside the original "500 kilo hai" and "500kg, "
  const UB = '(?:[\\s,.;:!?)\\]]|$)';  // unit-boundary: whitespace, punctuation, or end
  let m = norm.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(kg|kilo|kilos|kilogram|kilograms|किलो|किलोग्राम)${UB}`))
    || norm.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(ton|tons|tonne|tonnes|टन)${UB}`))
    || norm.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(quintal|qtl|क्विंटल)${UB}`))
    || norm.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(litre|liter|litres|liters|लीटर)${UB}`))
    || norm.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(piece|pieces|पीस)${UB}`))
    || norm.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(bag|bags|bori|boriyon|बोरी|बोरियां)${UB}`))
    || norm.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(dozen|darjan|दर्जन)${UB}`));
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

  // Bare-name fallback for comma-separated lists: "Priya, 9876543210, Meerut"
  // A standalone 1-word segment followed by a phone number is a name, not a
  // location. This prevents names from being mistakenly extracted as locations
  // by detectAnyLocation's comma-segment logic.
  const segments = text.split(/[,;]/).map(s => s.trim()).filter(Boolean);
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    const nextSeg = segments[i + 1];
    const nextDigits = nextSeg.replace(/\D/g, '');
    const isNextPhone = nextDigits.length >= 10 && /^[6-9]/.test(nextDigits);
    if (!isNextPhone) continue;
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
  // Handle Devanagari digits directly (e.g., ९८७६५४३२१०)
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
  // Spoken number words (Hindi, Hinglish, English)
  const fromWords = extractPhoneFromWords(text);
  if (fromWords) return fromWords;
  return null;
};

const detectAnyLocation = (text) => {
  if (!text || typeof text !== 'string') return null;
  
  // Devanagari place transliteration map (script mapping, not city hardcoding).
  const devanagariMap = {
    'गाज़ियाबाद': 'Ghaziabad', 'गाजियाबाद': 'Ghaziabad',
    'दिल्ली': 'Delhi', 'नोएडा': 'Noida', 'मेरठ': 'Meerut',
    'हापुड़': 'Hapur', 'बुलंदशहर': 'Bulandshahr', 'सोनीपत': 'Sonipat',
    'पानीपत': 'Panipat', 'करनाल': 'Karnal', 'गुरुग्राम': 'Gurugram',
    'मुरादनगर': 'Muradnagar', 'दसना': 'Dasna', 'मोदीनगर': 'Modinagar',
    'आगरा': 'Agra', 'लखनऊ': 'Lucknow', 'कानपुर': 'Kanpur',
    'प्रयागराज': 'Prayagraj', 'वाराणसी': 'Varanasi', 'पटना': 'Patna',
    'रांची': 'Ranchi', 'भोपाल': 'Bhopal', 'इंदौर': 'Indore',
    'जयपुर': 'Jaipur', 'जोधपुर': 'Jodhpur', 'बैंगलोर': 'Bangalore',
    'हैदराबाद': 'Hyderabad', 'चेन्नई': 'Chennai', 'मुंबई': 'Mumbai',
    'पुणे': 'Pune', 'अहमदाबाद': 'Ahmedabad', 'सूरत': 'Surat',
    'कोलकाता': 'Kolkata', 'चंडीगढ़': 'Chandigarh', 'लुधियाना': 'Ludhiana',
    'अमृतसर': 'Amritsar', 'जालंधर': 'Jalandhar', 'देहरादून': 'Dehradun',
    'शिमला': 'Shimla', 'नागपुर': 'Nagpur', 'विशाखापत्तनम': 'Visakhapatnam',
  };
  // Check Devanagari map first
  const devMatch = Object.entries(devanagariMap).find(([dev]) => text.includes(dev));
  if (devMatch) return devMatch[1];
  
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
  const PRODUCT_WORDS = new Set([
    'tomato','tomatoes','tamatar','potato','potatoes','aloo','aalu','onion','onions','pyaaz','pyaz','piyaz',
    'wheat','gehun','gehu','rice','chawal','cauliflower','gobhi','phool','cabbage','patta','carrot','gajar',
    'peas','matar','apple','seb','banana','kela','mango','aam','maize','makka','corn','bhutta','cotton','kapas',
    'sugarcane','ganna','gur','soybean','soya','soyabean','bajra','bajri','jowar','jowari','barley','jau',
    'mustard','sarson','groundnut','moongphali','peanut','moong','chana','chickpea','gram','masoor','urad',
    'arhar','toor','tur','mirch','mirchi','chilli','chili','dhaniya','coriander','jeera','cumin','haldi','turmeric',
    'garlic','lahsun','ginger','adrak','brinjal','eggplant','baingan','aubergine',
    'lauki','bottle','torai','ridge','parwal','pointed','karela','bitter','pumpkin','kaddu',
    'spinach','palak','methi','fenugreek',
    // Quality descriptors — never place names
    'achhi','acchi','accha','achha','badhiya','badiya','shandar','uttam','kharab','bekar',
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
      if (PRODUCT_WORDS.has(w)) return null;
      words.push(w);
    }
    if (words.length === 0 || words.length > 3) return null;
    const cand = words.join(' ');
    if (cand.split(/\s+/).some(ww => PRODUCT_WORDS.has(ww.toLowerCase()))) return null;
    return looksLikeCleanValue(cand, 3) ? titleCase(cand) : null;
  };

  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i];
    // Pattern: <PLACE> <PREP> — "ghaziabad se", "meerut se", "pune mein" (location + postposition, even mid-sentence)
    if (!PREP.has(w) && !HEAD.has(w) && !SWALLOWED.has(w) && !BE.has(w) && !NOT_PLACE.has(w) &&
        i + 1 < tokens.length && PREP.has(tokens[i + 1])) {
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
  // Names must also be excluded: "Priya" in "Priya, 9876543210, Meerut"
  // must not become a location.
  // Only run when text actually contains commas — bare two-word text like
  // "Diya Raghav" must not be treated as a location without grammar context.
  const CORRECTION = new Set(['no', 'nope', 'nahi', 'nahin', 'actually', 'wait', 'change', 'modify', 'edit', 'update', 'correct', 'wrong', 'galat', 'cancel', 'stop']);
  const detectedName = extractNameFromText(text);
  const nameWords = detectedName ? new Set(detectedName.toLowerCase().split(/\s+/)) : new Set();
  const hasComma = /[,;]/.test(text);
  const segments = hasComma ? text.split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];
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
    // Handle trailing preposition: "Delhi se" -> "Delhi" (location + se)
    while (segTokens.length > 1 && PREP.has(segTokens[segTokens.length - 1])) segTokens = segTokens.slice(0, -1);
    if (segTokens.length < 1 || segTokens.length > 2) continue;
    const joined = segTokens.join(' ');
    if (segTokens.some(t => /^\d/.test(t) || NOT_PLACE.has(t) || GLUE_WORDS.has(t) || BE.has(t) || PREP.has(t) || SWALLOWED.has(t) || HEAD.has(t))) continue;
    if (segTokens.some(t => nameWords.has(t))) continue; // it's a name, not a place
    if (!looksLikeCleanValue(joined, 2)) continue;
    // Don't mistake a crop for a place (including dynamic products like cotton, maize)
    const tLower = joined.toLowerCase();
    if (PRODUCT_WORDS.has(tLower) || tLower.split(/\s+/).some(w => PRODUCT_WORDS.has(w)) || /(tomato|tamatar|potato|aloo|onion|pyaaz|wheat|gehun|rice|chawal|cauliflower|gobhi|cabbage|carrot|gajar|peas|matar|apple|seb|banana|kela|mango|aam)/.test(tLower)) continue;
    return titleCase(joined);
  }

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
