import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractListingFallback, normalizeProduct, parseQuantity, parsePrice, parseGrade, parseIntent } from './extractListingParser.mjs';

describe('normalizeProduct', () => {
  it('normalizes English product names', () => {
    assert.equal(normalizeProduct('I have tomatoes'), 'Tomato');
    assert.equal(normalizeProduct('wheat harvest'), 'Wheat');
    assert.equal(normalizeProduct('fresh potatoes'), 'Potato');
    assert.equal(normalizeProduct('red onions'), 'Onion');
    assert.equal(normalizeProduct('basmati rice'), 'Rice');
  });

  it('normalizes Hindi product names', () => {
    assert.equal(normalizeProduct('मेरे पास टमाटर हैं'), 'Tomato');
    assert.equal(normalizeProduct('गेहूं की फसल'), 'Wheat');
    assert.equal(normalizeProduct('आलू हैं मेरे पास'), 'Potato');
    assert.equal(normalizeProduct('प्याज बेचना है'), 'Onion');
    assert.equal(normalizeProduct('चावल बेचना है'), 'Rice');
  });

  it('normalizes Hinglish product names', () => {
    assert.equal(normalizeProduct('mere paas tamatar hain'), 'Tomato');
    assert.equal(normalizeProduct('gehu bechna hai'), 'Wheat');
    assert.equal(normalizeProduct('aloo hai'), 'Potato');
  });

  it('returns null for unrecognizable text', () => {
    assert.equal(normalizeProduct('ok'), null);
    assert.equal(normalizeProduct('haan'), null);
  });

  it('accepts unknown products dynamically', () => {
    assert.equal(normalizeProduct('I have maize to sell'), 'Maize');
    assert.equal(normalizeProduct('mere paas cotton hai'), 'Cotton');
    assert.equal(normalizeProduct('5 kilo sugarcane hai'), 'Sugarcane');
  });
});

describe('parseQuantity', () => {
  it('parses kg', () => {
    const r = parseQuantity('10 kg wheat');
    assert.equal(r.quantity, 10);
    assert.equal(r.unit, 'kg');
  });

  it('parses kilo', () => {
    const r = parseQuantity('10 kilo tamatar');
    assert.equal(r.quantity, 10);
    assert.equal(r.unit, 'kg');
  });

  it('parses Hindi किलो', () => {
    const r = parseQuantity('मेरे पास 10 किलो गेहूं है');
    assert.equal(r.quantity, 10);
    assert.equal(r.unit, 'kg');
  });

  it('parses tonnes', () => {
    const r = parseQuantity('2 tonnes potatoes');
    assert.equal(r.quantity, 2);
    assert.equal(r.unit, 'tonnes');
  });

  it('parses quintal and converts to kg', () => {
    const r = parseQuantity('5 quintal wheat');
    assert.equal(r.quantity, 500);
    assert.equal(r.unit, 'kg');
  });

  it('returns null when no quantity found', () => {
    const r = parseQuantity('I have wheat');
    assert.equal(r.quantity, null);
    assert.equal(r.unit, null);
  });
});

describe('parsePrice', () => {
  it('parses ₹ symbol', () => {
    assert.equal(parsePrice('₹30 per kg'), 30);
    assert.equal(parsePrice('₹ 25/kg'), 25);
  });

  it('parses rupaye', () => {
    assert.equal(parsePrice('30 rupaye kilo'), 30);
    assert.equal(parsePrice('25 rupaiya per kg'), 25);
  });

  it('parses Hindi रुपये', () => {
    assert.equal(parsePrice('30 रुपये किलो'), 30);
  });

  it('parses "per kg" pattern', () => {
    assert.equal(parsePrice('30 per kg'), 30);
  });

  it('returns null when no price found', () => {
    assert.equal(parsePrice('I have wheat'), null);
  });
});

describe('parseGrade', () => {
  it('parses Grade A', () => {
    assert.equal(parseGrade('Grade A wheat'), 'Grade A');
    assert.equal(parseGrade('ग्रेड ए टमाटर'), 'Grade A');
  });

  it('parses Grade B', () => {
    assert.equal(parseGrade('Grade B potatoes'), 'Grade B');
  });

  it('parses Organic', () => {
    assert.equal(parseGrade('organic wheat'), 'Organic');
  });

  it('returns null when no grade', () => {
    assert.equal(parseGrade('I have wheat'), null);
  });
});

describe('parseIntent', () => {
  it('detects sell intent', () => {
    assert.equal(parseIntent('I have wheat to sell'), 'sell');
    assert.equal(parseIntent('mere paas wheat hai'), 'sell');
    assert.equal(parseIntent('मेरे पास गेहूं है'), 'sell');
    assert.equal(parseIntent('bechna hai mujhe'), 'sell');
  });

  it('detects buy intent', () => {
    assert.equal(parseIntent('I need wheat'), 'buy');
    assert.equal(parseIntent('mujhe wheat chahiye'), 'buy');
    assert.equal(parseIntent('मुझे गेहूं चाहिए'), 'buy');
  });
});

describe('extractListingFallback - complete scenarios', () => {
  it('1. Complete English sentence', () => {
    const r = extractListingFallback('I have 10 kilos of wheat to sell at 30 rupees per kg in Ghaziabad');
    assert.equal(r.farmer_name, null);
    assert.equal(r.phone, null);
    assert.equal(r.product, 'Wheat');
    assert.equal(r.quantity, 10);
    assert.equal(r.unit, 'kg');
    assert.equal(r.asking_price, 30);
    assert.equal(r.price_unit, 'kg');
    assert.equal(r.location, 'Ghaziabad');
    assert.equal(r.quality, null);
    assert.equal(r.intent, 'sell');
  });

  it('2. Missing price', () => {
    const r = extractListingFallback('I have 10 kg wheat in Ghaziabad');
    assert.equal(r.product, 'Wheat');
    assert.equal(r.quantity, 10);
    assert.equal(r.unit, 'kg');
    assert.equal(r.asking_price, null);
    assert.equal(r.price_unit, null);
    assert.equal(r.location, 'Ghaziabad');
  });

  it('3. Missing location', () => {
    const r = extractListingFallback('I have 10 kg wheat at 30 per kg');
    assert.equal(r.product, 'Wheat');
    assert.equal(r.quantity, 10);
    assert.equal(r.asking_price, 30);
    assert.equal(r.location, null);
  });

  it('4. Hindi', () => {
    const r = extractListingFallback('मेरे पास 10 किलो गेहूं है, 30 रुपये किलो में बेचना है, गाज़ियाबाद से।');
    assert.equal(r.product, 'Wheat');
    assert.equal(r.quantity, 10);
    assert.equal(r.unit, 'kg');
    assert.equal(r.asking_price, 30);
    assert.equal(r.location, 'Ghaziabad');
    assert.equal(r.intent, 'sell');
  });

  it('5. Hinglish', () => {
    const r = extractListingFallback('Mere paas 10 kilo wheat hai, 30 rupaye kilo mein bechna hai, Ghaziabad se.');
    assert.equal(r.product, 'Wheat');
    assert.equal(r.quantity, 10);
    assert.equal(r.unit, 'kg');
    assert.equal(r.asking_price, 30);
    assert.equal(r.location, 'Ghaziabad');
    assert.equal(r.intent, 'sell');
  });

  it('6. English with Grade A', () => {
    const r = extractListingFallback('I have 500 kg Grade A tomatoes to sell at 25 per kg');
    assert.equal(r.product, 'Tomato');
    assert.equal(r.quantity, 500);
    assert.equal(r.unit, 'kg');
    assert.equal(r.quality, 'Grade A');
    assert.equal(r.asking_price, 25);
    assert.equal(r.intent, 'sell');
  });

  it('7. Different units - tonnes', () => {
    const r = extractListingFallback('I have 2 tonnes of potatoes to sell at 20 per kg in Delhi');
    assert.equal(r.product, 'Potato');
    assert.equal(r.quantity, 2);
    assert.equal(r.unit, 'tonnes');
    assert.equal(r.asking_price, 20);
    assert.equal(r.location, 'Delhi');
    assert.equal(r.intent, 'sell');
  });
});

describe('extractListingFallback - edge cases', () => {
  it('does not invent missing information', () => {
    const r = extractListingFallback('wheat');
    assert.equal(r.farmer_name, null);
    assert.equal(r.phone, null);
    assert.equal(r.quantity, null);
    assert.equal(r.unit, null);
    assert.equal(r.asking_price, null);
    assert.equal(r.price_unit, null);
    assert.equal(r.location, null);
    assert.equal(r.quality, null);
    assert.equal(r.product, 'Wheat');
  });

  it('handles decimal quantities', () => {
    const r = extractListingFallback('I have 2.5 kg wheat');
    assert.equal(r.quantity, 2.5);
    assert.equal(r.unit, 'kg');
  });

  it('handles quintal conversion', () => {
    const r = extractListingFallback('I have 3 quintal potatoes');
    assert.equal(r.quantity, 300);
    assert.equal(r.unit, 'kg');
  });

  it('always sets price_unit to kg when price present', () => {
    const r = extractListingFallback('wheat at 30 per kg');
    assert.equal(r.price_unit, 'kg');
  });
});

describe('extractListingFallback - dynamic products', () => {
  it('extracts maize', () => {
    const r = extractListingFallback('I have 500 kg maize to sell');
    assert.equal(r.product, 'Maize');
    assert.equal(r.quantity, 500);
  });
  it('extracts cotton', () => {
    const r = extractListingFallback('Mere paas 2 tonne cotton hai');
    assert.equal(r.product, 'Cotton');
    assert.equal(r.quantity, 2);
    assert.equal(r.unit, 'tonnes');
  });
  it('extracts sugarcane', () => {
    const r = extractListingFallback('5 kilo sugarcane hai, 10 rupaye kilo');
    assert.equal(r.product, 'Sugarcane');
    assert.equal(r.quantity, 5);
    assert.equal(r.asking_price, 10);
  });
  it('extracts soybean', () => {
    const r = extractListingFallback('10 quintal soybean hai 25000 rupaye tonne');
    assert.equal(r.product, 'Soybean');
    assert.equal(r.quantity, 1000);
    assert.equal(r.unit, 'kg');
  });
});

describe('extractListingFallback - dynamic units', () => {
  it('parses litre', () => {
    const r = extractListingFallback('20 litre doodh hai');
    assert.equal(r.quantity, 20);
    assert.equal(r.unit, 'litre');
  });
  it('parses piece', () => {
    const r = extractListingFallback('50 piece apple hai');
    assert.equal(r.quantity, 50);
    assert.equal(r.unit, 'piece');
  });
  it('parses bag', () => {
    const r = extractListingFallback('10 bag rice hai');
    assert.equal(r.quantity, 10);
    assert.equal(r.unit, 'bag');
  });
  it('parses dozen', () => {
    const r = extractListingFallback('5 dozen banana hai');
    assert.equal(r.quantity, 5);
    assert.equal(r.unit, 'dozen');
  });
});

describe('extractListingFallback - dynamic locations', () => {
  it('detects location from "X se hoon"', () => {
    const r = extractListingFallback('Main Meerut se hoon, wheat hai');
    assert.equal(r.location, 'Meerut');
    assert.equal(r.product, 'Wheat');
  });
  it('detects location from "from X"', () => {
    const r = extractListingFallback('I have potatoes from Delhi');
    assert.equal(r.location, 'Delhi');
    assert.equal(r.product, 'Potato');
  });
  it('detects location from "X mein"', () => {
    const r = extractListingFallback('Noida mein hun, tamatar hai');
    assert.equal(r.location, 'Noida');
    assert.equal(r.product, 'Tomato');
  });
});
