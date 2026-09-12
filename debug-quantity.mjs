import { parseQuantity, extractListingFallback } from './server/extractListingParser.mjs';

const text = '500 nahi 300 kilo hai';
const qty = parseQuantity(text);
console.log('parseQuantity result:', qty);

const full = extractListingFallback(text);
console.log('extractListingFallback result:', full);
