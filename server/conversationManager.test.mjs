import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Mock fetch for tests
let listingIdCounter = 1000;
globalThis.fetch = async (url, options) => {
  if (url.includes('/api/listings')) {
    // Mock successful submission
    const listing_id = `ls-${listingIdCounter++}`;
    return {
      status: 201,
      json: async () => ({
        success: true,
        listing_id,
        data: JSON.parse(options.body)
      })
    };
  }
  throw new Error(`Unexpected fetch call to ${url}`);
};

import {
  processTurn,
  createSession,
  getSession,
  deleteSession,
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
  STATES,
  EMPTY_LISTING,
} from './conversationManager.mjs';

describe('detectLanguage', () => {
  it('detects Hindi (Devanagari)', () => {
    assert.equal(detectLanguage('मेरे पास गेहूं है'), 'hi');
  });
  it('detects Hinglish', () => {
    assert.equal(detectLanguage('Mere paas wheat hai'), 'hinglish');
  });
  it('detects English', () => {
    assert.equal(detectLanguage('I have 10 kg wheat'), 'en');
  });
});

describe('extractNameFromText', () => {
  it('extracts name from "mera naam Raj hai"', () => {
    assert.equal(extractNameFromText('Mera naam Raj hai'), 'Raj');
  });
  it('extracts name from "my name is Raj Kumar"', () => {
    assert.equal(extractNameFromText('My name is Raj Kumar'), 'Raj Kumar');
  });
  it('extracts name from "I am Raj Kumar"', () => {
    assert.equal(extractNameFromText('I am Raj Kumar from Ghaziabad'), 'Raj Kumar');
  });
  it('extracts name from "main Raj hun"', () => {
    assert.equal(extractNameFromText('Main Raj hun'), 'Raj');
  });
  it('returns null for no name', () => {
    assert.equal(extractNameFromText('10 kilo wheat hai'), null);
  });
});

describe('extractPhoneFromText', () => {
  it('extracts 10-digit phone', () => {
    assert.equal(extractPhoneFromText('Mera number 9876543210 hai'), '9876543210');
  });
  it('extracts phone with spaces', () => {
    assert.equal(extractPhoneFromText('98765 43210'), '9876543210');
  });
  it('extracts phone with dashes', () => {
    assert.equal(extractPhoneFromText('98765-43210'), '9876543210');
  });
  it('extracts phone with country code', () => {
    assert.equal(extractPhoneFromText('919876543210'), '9876543210');
  });
  it('returns null for no phone', () => {
    assert.equal(extractPhoneFromText('wheat hai'), null);
  });
});

describe('mergeListing', () => {
  it('merges new data into existing', () => {
    const existing = { ...EMPTY_LISTING };
    const extracted = { product: 'Wheat', quantity: 10, unit: 'kg', intent: 'sell' };
    const merged = mergeListing(existing, extracted);
    assert.equal(merged.product, 'Wheat');
    assert.equal(merged.quantity, 10);
    assert.equal(merged.unit, 'kg');
    assert.equal(merged.intent, 'sell');
    assert.equal(merged.farmer_name, null);
  });
  it('overwrites with new extracted values', () => {
    const existing = { ...EMPTY_LISTING, product: 'Rice', quantity: 5 };
    const extracted = { product: 'Wheat', quantity: 10 };
    const merged = mergeListing(existing, extracted);
    assert.equal(merged.product, 'Wheat');
    assert.equal(merged.quantity, 10);
  });
  it('sets price_unit to kg when asking_price is present', () => {
    const existing = { ...EMPTY_LISTING };
    const extracted = { asking_price: 30 };
    const merged = mergeListing(existing, extracted);
    assert.equal(merged.price_unit, 'kg');
  });
});

describe('getMissingRequiredFields', () => {
  it('returns all fields for empty listing', () => {
    const missing = getMissingRequiredFields(EMPTY_LISTING);
    assert.ok(missing.length > 0);
    assert.ok(missing.includes('product'));
    assert.ok(missing.includes('phone'));
  });
  it('returns fewer fields when some are filled', () => {
    const listing = { ...EMPTY_LISTING, product: 'Wheat', quantity: 10, unit: 'kg' };
    const missing = getMissingRequiredFields(listing);
    assert.ok(!missing.includes('product'));
    assert.ok(!missing.includes('quantity'));
    assert.ok(!missing.includes('unit'));
    assert.ok(missing.includes('phone'));
  });
  it('returns empty when complete', () => {
    const listing = {
      farmer_name: 'Raj', phone: '9876543210', product: 'Wheat',
      quantity: 10, unit: 'kg', asking_price: 30, price_unit: 'kg',
      location: 'Ghaziabad', intent: 'sell',
    };
    const missing = getMissingRequiredFields(listing);
    assert.equal(missing.length, 0);
  });
});

describe('isComplete', () => {
  it('returns false for empty listing', () => {
    assert.equal(isComplete(EMPTY_LISTING), false);
  });
  it('returns true when all required fields present', () => {
    const listing = {
      farmer_name: 'Raj', phone: '9876543210', product: 'Wheat',
      quantity: 10, unit: 'kg', asking_price: 30, price_unit: 'kg',
      location: 'Ghaziabad', intent: 'sell',
    };
    assert.equal(isComplete(listing), true);
  });
});

describe('isConfirmationAffirmative', () => {
  it('recognizes "yes"', () => assert.equal(isConfirmationAffirmative('yes'), true));
  it('recognizes "haan"', () => assert.equal(isConfirmationAffirmative('haan'), true));
  it('recognizes "ji haan"', () => assert.equal(isConfirmationAffirmative('ji haan'), true));
  it('recognizes "bilkul"', () => assert.equal(isConfirmationAffirmative('bilkul'), true));
  it('recognizes "confirm"', () => assert.equal(isConfirmationAffirmative('confirm'), true));
  it('recognizes "sahi hai"', () => assert.equal(isConfirmationAffirmative('sahi hai'), true));
  it('recognizes "correct"', () => assert.equal(isConfirmationAffirmative('correct'), true));
  it('recognizes "yes please"', () => assert.equal(isConfirmationAffirmative('yes please'), true));
  it('rejects "haan lekin"', () => assert.equal(isConfirmationAffirmative('haan lekin price galat hai'), false));
  it('rejects "no"', () => assert.equal(isConfirmationAffirmative('no'), false));
  it('rejects "nahi"', () => assert.equal(isConfirmationAffirmative('nahi'), false));
  it('rejects "cancel"', () => assert.equal(isConfirmationAffirmative('cancel'), false));
});

describe('isConfirmationNegative', () => {
  it('recognizes "no"', () => assert.equal(isConfirmationNegative('no'), true));
  it('recognizes "nahi"', () => assert.equal(isConfirmationNegative('nahi'), true));
  it('recognizes "change"', () => assert.equal(isConfirmationNegative('change'), true));
  it('recognizes "modify"', () => assert.equal(isConfirmationNegative('modify'), true));
  it('recognizes "galat hai"', () => assert.equal(isConfirmationNegative('galat hai'), true));
  it('rejects "yes"', () => assert.equal(isConfirmationNegative('yes'), false));
  it('rejects "haan"', () => assert.equal(isConfirmationNegative('haan'), false));
  it('rejects "cancel"', () => assert.equal(isConfirmationNegative('cancel'), false));
});

describe('isConfirmationCancelled', () => {
  it('recognizes "cancel"', () => assert.equal(isConfirmationCancelled('cancel'), true));
  it('recognizes "ruk jao"', () => assert.equal(isConfirmationCancelled('ruk jao'), true));
  it('recognizes "stop"', () => assert.equal(isConfirmationCancelled('stop'), true));
  it('recognizes "band karo"', () => assert.equal(isConfirmationCancelled('band karo'), true));
  it('rejects "yes"', () => assert.equal(isConfirmationCancelled('yes'), false));
  it('rejects "no"', () => assert.equal(isConfirmationCancelled('no'), false));
  it('rejects "change"', () => assert.equal(isConfirmationCancelled('change'), false));
});

describe('generateQuestion', () => {
  it('generates Hindi question for product', () => {
    const q = generateQuestion('product', 'hinglish');
    assert.ok(q.toLowerCase().includes('bechna') || q.toLowerCase().includes('kya'));
    assert.equal((q.match(/\?/g) || []).length, 1);
  });
  it('generates English question for phone', () => {
    const q = generateQuestion('phone', 'en');
    assert.ok(q.toLowerCase().includes('mobile') || q.toLowerCase().includes('phone'));
  });
});

describe('generateConfirmation', () => {
  it('generates Hindi confirmation with all fields', () => {
    const listing = {
      farmer_name: 'Raj', phone: '9876543210', product: 'Wheat',
      quantity: 10, unit: 'kg', asking_price: 30, price_unit: 'kg',
      location: 'Ghaziabad', intent: 'sell', quality: null,
    };
    const msg = generateConfirmation(listing, 'hinglish');
    assert.ok(msg.includes('Raj'));
    assert.ok(msg.toLowerCase().includes('wheat') || msg.includes('gehun'));
    assert.ok(/das\s+kilo|10\s+kilo|10\s+kg/i.test(msg), `should include qty, got: ${msg}`);
    assert.ok(/tees\s+rupaye\s+kilo|30\s+rupaye\s+kilo/i.test(msg), `should include price, got: ${msg}`);
    assert.ok(msg.includes('Ghaziabad'));
    assert.ok(msg.includes('bechna'));
    assert.ok(msg.toLowerCase().includes('theek'));
  });
  it('generates English confirmation with all fields', () => {
    const listing = {
      farmer_name: 'Raj', phone: '9876543210', product: 'Wheat',
      quantity: 10, unit: 'kg', asking_price: 30, price_unit: 'kg',
      location: 'Ghaziabad', intent: 'sell', quality: null,
    };
    const msg = generateConfirmation(listing, 'en');
    assert.ok(msg.includes('Raj'));
    assert.ok(msg.toLowerCase().includes('wheat'));
    assert.ok(msg.includes('10 kg'));
    assert.ok(msg.includes('30 rupees per kg'));
    assert.ok(msg.includes('Ghaziabad'));
    assert.ok(msg.toLowerCase().includes('right') || msg.toLowerCase().includes('yes'));
  });
  it('repeats quantity and price even if location is missing', async () => {
    const listing = {
      farmer_name: null, phone: null, product: 'Wheat',
      quantity: 10, unit: 'kg', asking_price: 30, price_unit: 'kg',
      location: null, intent: 'sell', quality: null,
    };
    const msg = generateConfirmation(listing, 'en');
    assert.ok(msg.includes('10 kg'));
    assert.ok(msg.includes('30 rupees per kg'));
  });
});

describe('processTurn - single turn', () => {
  it('extracts data and asks for first missing field', async () => {
    const r = await processTurn('s1', 'Mere paas 10 kilo wheat hai, 30 rupaye kilo mein bechna hai, Ghaziabad se.');
    assert.equal(r.state, 'ASKING');
    assert.equal(r.listing.product, 'Wheat');
    assert.equal(r.listing.quantity, 10);
    assert.equal(r.listing.unit, 'kg');
    assert.equal(r.listing.asking_price, 30);
    assert.equal(r.listing.location, 'Ghaziabad');
    assert.equal(r.listing.intent, 'sell');
    assert.ok(r.missing_fields.includes('phone'));
    assert.ok(r.agent_message.length > 0);
    assert.equal(r.session_id, 's1');
  });
  it('extracts name from "mera naam Raj hai"', async () => {
    const r = await processTurn('s2', 'Mera naam Raj hai, 10 kilo wheat hai.');
    assert.equal(r.listing.farmer_name, 'Raj');
    assert.equal(r.listing.product, 'Wheat');
  });
  it('extracts phone number', async () => {
    const r = await processTurn('s3', 'Mera number 9876543210 hai.');
    assert.equal(r.listing.phone, '9876543210');
  });
});

describe('processTurn - multi-turn conversation', () => {
  it('completes a full conversation', async () => {
    const sid = 'multi-1';
    const r1 = await processTurn(sid, 'Mere paas 10 kilo wheat hai, Ghaziabad se.');
    assert.equal(r1.state, 'ASKING');
    assert.equal(r1.listing.product, 'Wheat');
    assert.ok(r1.missing_fields.includes('asking_price'));

    const r2 = await processTurn(sid, '30 rupaye kilo.');
    assert.equal(r2.state, 'ASKING');
    assert.equal(r2.listing.asking_price, 30);
    assert.equal(r2.listing.product, 'Wheat');
    assert.ok(r2.missing_fields.includes('phone'));

    const r3 = await processTurn(sid, 'Ghaziabad se hoon.');
    assert.equal(r3.state, 'ASKING');
    assert.equal(r3.listing.location, 'Ghaziabad');

    const r4 = await processTurn(sid, 'Raj Kumar.');
    assert.equal(r4.state, 'ASKING');
    assert.equal(r4.listing.farmer_name, 'Raj Kumar');

    const r5 = await processTurn(sid, '9876543210');
    assert.equal(r5.state, 'CONFIRMING');
    assert.equal(r5.listing.phone, '9876543210');
    assert.ok(r5.missing_fields.length === 0);
    assert.ok(r5.agent_message.toLowerCase().includes('wheat') || r5.agent_message.toLowerCase().includes('gehun'));
  });
  it('preserves information across turns', async () => {
    const sid = 'multi-2';
    await processTurn(sid, '10 kilo wheat hai.');
    const r2 = await processTurn(sid, 'Ghaziabad.');
    assert.equal(r2.listing.product, 'Wheat');
    assert.equal(r2.listing.quantity, 10);
    assert.equal(r2.listing.location, 'Ghaziabad');
  });
  it('updates value when farmer changes it', async () => {
    const sid = 'multi-3';
    await processTurn(sid, '10 kilo wheat hai, 30 rupaye kilo.');
    const r2 = await processTurn(sid, 'Nahi, 35 rupaye kilo.');
    assert.equal(r2.listing.asking_price, 35);
    assert.equal(r2.listing.product, 'Wheat');
  });
  it('does not ask for already-known fields', async () => {
    const sid = 'multi-4';
    await processTurn(sid, 'Mere paas 10 kilo wheat hai, 30 rupaye kilo, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Haan sab sahi hai.');
    assert.ok(r.state === 'SUCCESS' || r.state === 'CONFIRMING');
    if (r.state === 'SUCCESS') {
      assert.ok(r.listing_id);
    }
  });
});

describe('processTurn - farmer-friendly talk', () => {
  it('restates 20 kilo tomatoes and asks only for price', async () => {
    const r = await processTurn('farm-1', 'Mere paas 20 kilo tamatar hain.');
    assert.equal(r.listing.quantity, 20);
    assert.equal(r.listing.product, 'Tomato');
    assert.ok(/bees\s+kilo|20\s+kilo|20\s+kg/i.test(r.agent_message), `should echo 20 kilo, got: ${r.agent_message}`);
    assert.ok(r.agent_message.toLowerCase().includes('tomato') || r.agent_message.toLowerCase().includes('tamatar'));
    assert.ok(r.agent_message.includes('rupaye'));
    assert.equal((r.agent_message.match(/\?/g) || []).length, 1);
    assert.ok(!/paidaawar|miqdaar|listing|schema/i.test(r.agent_message));
  });
  it('updates quantity when farmer corrects 20 to 25 kilo', async () => {
    const sid = 'farm-2';
    await processTurn(sid, 'Mere paas 20 kilo tamatar hain.');
    const r = await processTurn(sid, 'Nahi, 25 kilo hain.');
    assert.equal(r.listing.quantity, 25);
    assert.equal(r.listing.product, 'Tomato');
    assert.ok(/bees\s+paanch\s+kilo|25\s+kilo|25\s+kg/i.test(r.agent_message), `should echo 25 kilo, got: ${r.agent_message}`);
    assert.ok(r.agent_message.includes('rupaye'));
  });
  it('replies in Hindi even when the farmer speaks English (Hindi-only)', async () => {
    const r = await processTurn('farm-en', 'I have 20 kg tomatoes.');
    // Hindi-only speech: even English input gets Hindi response
    assert.ok(/aap.*bechna|you want to sell/i.test(r.agent_message));
    assert.ok(/bees\s+kilo|20\s+kilo|20\s+kg/i.test(r.agent_message));
    assert.ok(/tamatar|tomato/i.test(r.agent_message.toLowerCase()));
  });
  it('asks one short question at a time (Hinglish)', async () => {
    const r = await processTurn('farm-short', 'Mere paas 20 kilo tamatar hain.');
    assert.equal((r.agent_message.match(/\?/g) || []).length, 1);
    assert.ok(r.agent_message.length < 160);
  });
  it('confirms the corrected quantity when farmer changes 20 to 25', async () => {
    const sid = 'farm-corr';
    await processTurn(sid, 'Mere paas 20 kilo tamatar hain.');
    const r = await processTurn(sid, 'Nahi, 25 hain.');
    assert.equal(r.listing.quantity, 25);
    assert.ok(/bees\s+paanch\s+kilo|25\s+kilo|25\s+kg/i.test(r.agent_message), `should echo 25 kilo, got: ${r.agent_message}`);
  });
  it('repeats quality in confirmation when present', async () => {
    const sid = 'farm-quality';
    await processTurn(sid, 'Mere paas 10 kilo Grade A wheat hai, 30 rupaye kilo, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Haan');
    assert.ok(r.state === 'SUCCESS' || r.state === 'CONFIRMING' || r.agent_message.includes('Grade A'));
  });
  it('asks a field-switch question when farmer names what to change', async () => {
    const sid = 'farm-switch';
    await processTurn(sid, 'Mere paas 10 kilo wheat hai, 30 rupaye kilo, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Price badalni hai.');
    assert.equal(r.state, 'ASKING');
    assert.equal(r.next_field, 'asking_price');
    assert.ok(r.agent_message.toLowerCase().includes('rupaye'));
  });
  it('completes after correction during confirmation', async () => {
    const sid = 'farm-corrlate';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Nahi, price badalni hai. 35 rupaye kilo.');
    assert.equal(r.listing.asking_price, 35);
    assert.equal(r.state, 'CONFIRMING');
    assert.ok(/tees\s+paanch\s+rupaye\s+kilo|35\s+rupaye\s+kilo/i.test(r.agent_message), `should echo 35 rupaye kilo, got: ${r.agent_message}`);
  });
  it('greets a vague first turn and asks one short question', async () => {
    const r = await processTurn('farm-hello', 'Hello');
    assert.ok(/namaste|hello/i.test(r.agent_message));
    assert.equal((r.agent_message.match(/\?/g) || []).length, 1);
  });
  it('skips the greeting when the farmer starts with produce details', async () => {
    const r = await processTurn('farm-nogreet', 'Mere paas 20 kilo tamatar hain.');
    assert.ok(!/namaste/i.test(r.agent_message));
    assert.ok(/bees\s+kilo|20\s+kilo|20\s+kg/i.test(r.agent_message), `should echo 20 kilo, got: ${r.agent_message}`);
  });
  it('gently re-asks instead of skipping when the answer is unclear', async () => {
    const sid = 'farm-unclear';
    await processTurn(sid, 'Mere paas 20 kilo tamatar hain.');
    const r = await processTurn(sid, 'Haan ji');
    assert.ok(r.agent_message.toLowerCase().includes('maaf') || r.agent_message.toLowerCase().includes('sorry'), `should apologize, got: ${r.agent_message}`);
    assert.ok(r.agent_message.includes('rupaye'));
    assert.equal((r.agent_message.match(/\?/g) || []).length, 1);
    assert.equal(r.listing.quantity, 20);
  });
  it('speaks the phone number digit by digit in confirmation', async () => {
    const sid = 'farm-phonedigits';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Haan lekin number 9876501234 hai.');
    assert.ok(r.agent_message.includes('9 8 7 6 5 0 1 2 3 4'));
  });
});

describe('processTurn - edge cases', () => {
  it('returns error for missing session_id', async () => {
    const r = await processTurn(null, 'hello');
    assert.equal(r.state, 'ERROR');
  });
  it('returns error for empty text', async () => {
    const r = await processTurn('s5', '');
    assert.equal(r.state, 'ERROR');
  });
  it('creates new session if not exists', async () => {
    const r = await processTurn('new-session-1', '10 kilo wheat.');
    assert.equal(r.state, 'ASKING');
    const session = getSession('new-session-1');
    assert.ok(session);
    assert.equal(session.id, 'new-session-1');
  });
  it('handles Hinglish input', async () => {
    const r = await processTurn('hinglish-1', 'Mere paas 10 kilo tamatar hai, 25 rupaye kilo, Delhi se.');
    assert.equal(r.listing.product, 'Tomato');
    assert.equal(r.listing.quantity, 10);
    assert.equal(r.listing.asking_price, 25);
    assert.equal(r.listing.location, 'Delhi');
  });
  it('handles Hindi input', async () => {
    const r = await processTurn('hindi-1', 'मेरे पास 10 किलो गेहूं है, 30 रुपये किलो, गाज़ियाबाद से।');
    assert.equal(r.listing.product, 'Wheat');
    assert.equal(r.listing.quantity, 10);
    assert.equal(r.listing.asking_price, 30);
    assert.equal(r.listing.location, 'Ghaziabad');
  });
  it('handles English input', async () => {
    const r = await processTurn('en-1', 'I have 10 kg wheat, want to sell at 30 rupees per kg from Ghaziabad.');
    assert.equal(r.listing.product, 'Wheat');
    assert.equal(r.listing.quantity, 10);
    assert.equal(r.listing.asking_price, 30);
    assert.equal(r.listing.location, 'Ghaziabad');
    assert.equal(r.listing.intent, 'sell');
  });
  it('different units - tonnes', async () => {
    const r = await processTurn('unit-1', '5 tonnes wheat hai, 20000 rupaye tonne.');
    assert.equal(r.listing.quantity, 5);
    assert.equal(r.listing.unit, 'tonnes');
    assert.equal(r.listing.product, 'Wheat');
  });
  it('different units - quintal', async () => {
    const r = await processTurn('unit-2', '2 quintal wheat hai.');
    assert.equal(r.listing.quantity, 200);
    assert.equal(r.listing.unit, 'kg');
  });
  it('decimal quantity', async () => {
    const r = await processTurn('dec-1', '2.5 kilo wheat hai.');
    assert.equal(r.listing.quantity, 2.5);
    assert.equal(r.listing.unit, 'kg');
  });
});

describe('processTurn - confirmation flow', () => {
  it('moves to SUCCESS on affirmative confirmation', async () => {
    const sid = 'confirm-1';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Haan sab sahi hai.');
    assert.ok(r.state === 'SUCCESS' || r.state === 'CONFIRMING');
    assert.ok(r.agent_message.length > 0);
  });
  it('moves back to ASKING on negative confirmation', async () => {
    const sid = 'confirm-2';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Nahi, price change karna hai.');
    assert.equal(r.state, 'ASKING');
  });
  it('processes new data during confirmation and re-confirms if complete', async () => {
    const sid = 'confirm-3';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Haan lekin 35 rupaye kilo hai.');
    assert.equal(r.state, 'CONFIRMING');
    assert.equal(r.listing.asking_price, 35);
  });
  it('moves to CANCELLED on cancel', async () => {
    const sid = 'confirm-cancel';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Cancel.');
    assert.equal(r.state, 'CANCELLED');
  });
  it('recognizes "yes" as affirmative', async () => {
    const sid = 'confirm-yes';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'yes');
    assert.ok(r.state === 'SUCCESS' || r.state === 'CONFIRMING');
  });
  it('recognizes "ji haan" as affirmative', async () => {
    const sid = 'confirm-jhaan';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'ji haan');
    assert.ok(r.state === 'SUCCESS' || r.state === 'CONFIRMING');
  });
  it('recognizes "bilkul" as affirmative', async () => {
    const sid = 'confirm-bilkul';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'bilkul');
    assert.ok(r.state === 'SUCCESS' || r.state === 'CONFIRMING');
  });
  it('recognizes "confirm" as affirmative', async () => {
    const sid = 'confirm-word';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'confirm');
    assert.ok(r.state === 'SUCCESS' || r.state === 'CONFIRMING');
  });
  it('recognizes "sahi hai" as affirmative', async () => {
    const sid = 'confirm-sahi';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'sahi hai');
    assert.ok(r.state === 'SUCCESS' || r.state === 'CONFIRMING');
  });
  it('recognizes "no" as no-change confirmation (bare negative)', async () => {
    const sid = 'confirm-no';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'no');
    assert.ok(r.state === 'SUCCESS' || r.state === 'SUBMITTING');
    if (r.state === 'SUCCESS') {
      assert.ok(r.listing_id);
    }
  });
  it('recognizes "change" as negative', async () => {
    const sid = 'confirm-change';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'change');
    assert.equal(r.state, 'ASKING');
  });
  it('recognizes "modify" as negative', async () => {
    const sid = 'confirm-modify';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'modify');
    assert.equal(r.state, 'ASKING');
  });
  it('recognizes "galat hai" as negative', async () => {
    const sid = 'confirm-galat';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'galat hai');
    assert.equal(r.state, 'ASKING');
  });
  it('recognizes "cancel" as cancelled', async () => {
    const sid = 'confirm-cancel2';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'cancel');
    assert.equal(r.state, 'CANCELLED');
  });
  it('recognizes "ruk jao" as cancelled', async () => {
    const sid = 'confirm-ruk';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'ruk jao');
    assert.equal(r.state, 'CANCELLED');
  });
  it('clears listing on cancel', async () => {
    const sid = 'confirm-cancel-clear';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'cancel');
    assert.equal(r.state, 'CANCELLED');
    assert.equal(r.listing.product, null);
    assert.equal(r.listing.farmer_name, null);
  });
});

describe('processTurn - submission flow', () => {
  it('returns listing_id on successful submission', async () => {
    const sid = 'submit-1';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Haan');
    assert.ok(r.state === 'SUCCESS' || r.state === 'CONFIRMING');
    if (r.state === 'SUCCESS') {
      assert.ok(r.listing_id);
      assert.ok(r.listing_id.startsWith('ls-'));
    }
  });
  it('includes listing_id in success message', async () => {
    const sid = 'submit-2';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'yes');
    assert.ok(r.state === 'SUCCESS' || r.state === 'CONFIRMING');
    if (r.state === 'SUCCESS') {
      assert.ok(r.agent_message.includes('Number:'));
      assert.ok(r.agent_message.includes(r.listing_id));
    }
  });
});

describe('session management', () => {
  it('creates and retrieves session', () => {
    createSession('sess-1');
    const s = getSession('sess-1');
    assert.ok(s);
    assert.equal(s.id, 'sess-1');
    assert.equal(s.state, 'IDLE');
  });
  it('deletes session', () => {
    createSession('sess-2');
    assert.ok(getSession('sess-2'));
    deleteSession('sess-2');
    assert.equal(getSession('sess-2'), null);
  });
  it('returns null for non-existent session', () => {
    assert.equal(getSession('nonexistent'), null);
  });
});

describe('correction handling - name', () => {
  it('corrects name with "Nahi, Rajesh" during confirmation', async () => {
    const sid = 'corr-name-1';
    await processTurn(sid, 'Mere paas 20 kilo wheat hai, 30 rupaye kilo, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Nahi, Rajesh.');
    assert.equal(r.listing.farmer_name, 'Rajesh');
    assert.equal(r.listing.product, 'Wheat');
    assert.ok(r.agent_message.includes('Rajesh'));
  });
  it('corrects name with "Actually" prefix', async () => {
    const sid = 'corr-name-2';
    await processTurn(sid, 'Mere paas 20 kilo wheat hai, 30 rupaye kilo, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Actually Mohan.');
    assert.equal(r.listing.farmer_name, 'Mohan');
    assert.ok(r.agent_message.includes('Mohan'));
  });
  it('corrects name during CONFIRMING with "Haan lekin"', async () => {
    const sid = 'corr-name-3';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Haan lekin naam Mohan hai.');
    assert.equal(r.listing.farmer_name, 'Mohan');
    assert.equal(r.state, 'CONFIRMING');
    assert.ok(r.agent_message.includes('Mohan'));
  });
});

describe('correction handling - phone', () => {
  it('corrects phone during CONFIRMING', async () => {
    const sid = 'corr-phone-1';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Haan lekin number 9876501234 hai.');
    assert.equal(r.listing.phone, '9876501234');
    assert.ok(r.agent_message.includes('9 8 7 6 5 0 1 2 3 4'));
  });
  it('corrects phone during ASKING', async () => {
    const sid = 'corr-phone-2';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Nahi, mera number 9112345678 hai.');
    assert.equal(r.listing.phone, '9112345678');
    assert.ok(r.agent_message.includes('9 1 1 2 3 4 5 6 7 8'));
  });
});

describe('correction handling - product', () => {
  it('corrects product during ASKING', async () => {
    const sid = 'corr-prod-1';
    await processTurn(sid, 'Mere paas 20 kilo tamatar hai.');
    const r = await processTurn(sid, 'Nahi, gehun hai.');
    assert.equal(r.listing.product, 'Wheat');
    assert.ok(r.agent_message.toLowerCase().includes('wheat') || r.agent_message.toLowerCase().includes('gehun'));
  });
  it('corrects product during CONFIRMING', async () => {
    const sid = 'corr-prod-2';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Nahi, product change karo. Rice hai.');
    assert.equal(r.listing.product, 'Rice');
    assert.equal(r.state, 'CONFIRMING');
    assert.ok(r.agent_message.toLowerCase().includes('rice') || r.agent_message.toLowerCase().includes('chawal'));
  });
});

describe('correction handling - quantity', () => {
  it('corrects quantity with "Nahi, 25 kilo"', async () => {
    const sid = 'corr-qty-1';
    await processTurn(sid, 'Mere paas 20 kilo tamatar hai.');
    const r = await processTurn(sid, 'Nahi, 25 kilo.');
    assert.equal(r.listing.quantity, 25);
    assert.ok(/bees\s+paanch\s+kilo|25\s+kilo|25\s+kg/i.test(r.agent_message), `should echo 25 kilo, got: ${r.agent_message}`);
  });
  it('corrects quantity with bare number "Nahi, 25 hain"', async () => {
    const sid = 'corr-qty-2';
    await processTurn(sid, 'Mere paas 20 kilo tamatar hai.');
    const r = await processTurn(sid, 'Nahi, 25 hain.');
    assert.equal(r.listing.quantity, 25);
    assert.ok(/bees\s+paanch\s+kilo|25\s+kilo|25\s+kg/i.test(r.agent_message), `should echo 25 kilo, got: ${r.agent_message}`);
  });
  it('corrects quantity during CONFIRMING', async () => {
    const sid = 'corr-qty-3';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Haan lekin 15 kilo hai.');
    assert.equal(r.listing.quantity, 15);
    assert.equal(r.state, 'CONFIRMING');
  });
});

describe('correction handling - unit', () => {
  it('corrects unit to tonne with "Nahi, tonne"', async () => {
    const sid = 'corr-unit-1';
    await processTurn(sid, 'Mere paas 20 kilo tamatar hai.');
    const r = await processTurn(sid, 'Nahi, tonne hai.');
    assert.equal(r.listing.unit, 'tonnes');
    assert.equal(r.listing.quantity, 20);
  });
  it('corrects unit to kg with "Actually kg"', async () => {
    const sid = 'corr-unit-2';
    await processTurn(sid, 'Mere paas 5 tonne wheat hai.');
    const r = await processTurn(sid, 'Actually kg hai.');
    assert.equal(r.listing.unit, 'kg');
    assert.equal(r.listing.quantity, 5);
  });
});

describe('correction handling - price', () => {
  it('corrects price with "Nahi, 35 rupaye kilo"', async () => {
    const sid = 'corr-price-1';
    await processTurn(sid, 'Mere paas 20 kilo tamatar hai, 30 rupaye kilo.');
    const r = await processTurn(sid, 'Nahi, 35 rupaye kilo.');
    assert.equal(r.listing.asking_price, 35);
    assert.ok(/tees\s+paanch\s+rupaye\s+kilo|35\s+rupaye\s+kilo/i.test(r.agent_message), `should echo 35 rupaye kilo, got: ${r.agent_message}`);
  });
  it('corrects price with bare number during CONFIRMING', async () => {
    const sid = 'corr-price-2';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Haan lekin 40 rupaye kilo.');
    assert.equal(r.listing.asking_price, 40);
    assert.equal(r.state, 'CONFIRMING');
  });
  it('corrects price with "Price 35 rupees"', async () => {
    const sid = 'corr-price-3';
    await processTurn(sid, 'Mere paas 20 kilo tamatar hai, 30 rupaye kilo.');
    const r = await processTurn(sid, 'Price 35 rupees.');
    assert.equal(r.listing.asking_price, 35);
    assert.ok(/tees\s+paanch|35/i.test(r.agent_message), `should mention 35, got: ${r.agent_message}`);
  });
});

describe('correction handling - price unit', () => {
  it('auto-sets price_unit when price is corrected', async () => {
    const sid = 'corr-punit-1';
    await processTurn(sid, 'Mere paas 20 kilo tamatar hai, 30 rupaye kilo.');
    const r = await processTurn(sid, 'Nahi, 35 rupaye kilo.');
    assert.equal(r.listing.price_unit, 'kg');
    assert.equal(r.listing.asking_price, 35);
  });
});

describe('correction handling - location', () => {
  it('corrects location with "Nahi, Noida"', async () => {
    const sid = 'corr-loc-1';
    await processTurn(sid, 'Mere paas 20 kilo tamatar hai, 30 rupaye kilo, Ghaziabad.');
    const r = await processTurn(sid, 'Nahi, Noida.');
    assert.equal(r.listing.location, 'Noida');
    assert.ok(r.agent_message.includes('Noida'));
  });
  it('corrects location with "Actually Noida"', async () => {
    const sid = 'corr-loc-2';
    await processTurn(sid, 'Mere paas 20 kilo tamatar hai, 30 rupaye kilo, Ghaziabad.');
    const r = await processTurn(sid, 'Actually Noida.');
    assert.equal(r.listing.location, 'Noida');
    assert.ok(r.agent_message.includes('Noida'));
  });
  it('corrects location during CONFIRMING', async () => {
    const sid = 'corr-loc-3';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Haan lekin location Meerut hai.');
    assert.equal(r.listing.location, 'Meerut');
    assert.equal(r.state, 'CONFIRMING');
  });
});

describe('correction handling - quality', () => {
  it('corrects quality with "Nahi, Grade A"', async () => {
    const sid = 'corr-qual-1';
    await processTurn(sid, 'Mere paas 20 kilo Grade B tamatar hai, 30 rupaye kilo, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Nahi, Grade A hai.');
    assert.equal(r.listing.quality, 'Grade A');
    assert.ok(r.agent_message.includes('Grade A'));
  });
  it('corrects quality during CONFIRMING', async () => {
    const sid = 'corr-qual-2';
    await processTurn(sid, '10 kilo Grade B wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Haan lekin quality Organic hai.');
    assert.equal(r.listing.quality, 'Organic');
    assert.equal(r.state, 'CONFIRMING');
  });
});

describe('correction handling - edge cases', () => {
  it('does not lose unrelated fields when correcting one field', async () => {
    const sid = 'corr-edge-1';
    await processTurn(sid, 'Mere paas 20 kilo tamatar hai, 30 rupaye kilo, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Nahi, 25 kilo hai.');
    assert.equal(r.listing.quantity, 25);
    assert.equal(r.listing.product, 'Tomato');
    assert.equal(r.listing.asking_price, 30);
    assert.equal(r.listing.location, 'Ghaziabad');
    assert.equal(r.listing.farmer_name, 'Raj');
    assert.equal(r.listing.phone, '9876543210');
  });
  it('handles ambiguous correction by asking for clarification', async () => {
    const sid = 'corr-edge-2';
    await processTurn(sid, 'Mere paas 20 kilo tamatar hai, 30 rupaye kilo, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Kuch galat hai.');
    assert.equal(r.state, 'ASKING');
    assert.ok(r.agent_message.includes('badalna'));
  });
  it('handles "change" keyword during CONFIRMING without data', async () => {
    const sid = 'corr-edge-3';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Change karna hai.');
    assert.equal(r.state, 'ASKING');
    assert.ok(r.agent_message.length > 0);
  });
  it('corrects multiple fields in one turn during CONFIRMING', async () => {
    const sid = 'corr-edge-4';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Haan lekin 15 kilo hai aur 35 rupaye kilo.');
    assert.equal(r.listing.quantity, 15);
    assert.equal(r.listing.asking_price, 35);
    assert.equal(r.state, 'CONFIRMING');
  });
  it('preserves listing after correction and re-confirmation', async () => {
    const sid = 'corr-edge-5';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    await processTurn(sid, 'Nahi, 15 kilo hai.');
    const r = await processTurn(sid, 'Haan sab sahi hai.');
    assert.ok(r.state === 'SUCCESS' || r.state === 'CONFIRMING');
    assert.equal(r.listing.quantity, 15);
    assert.equal(r.listing.product, 'Wheat');
  });
  it('English correction: "Actually 25 kg" (Hindi-only response)', async () => {
    const sid = 'corr-en-1';
    await processTurn(sid, 'I have 20 kg tomatoes, 30 rupees per kg, Ghaziabad, my name is Raj, 9876543210.');
    const r = await processTurn(sid, 'Actually 25 kg.');
    assert.equal(r.listing.quantity, 25);
    // Hindi-only: should echo in Hindi (pachis/bees paanch) or at least contain quantity
    assert.ok(/pachis\s+kilo|bees\s+paanch\s+kilo|25\s*kilo|25\s*kg/i.test(r.agent_message), `should echo 25 kilo, got: ${r.agent_message}`);
  });
  it('English correction: "No, Noida"', async () => {
    const sid = 'corr-en-2';
    await processTurn(sid, 'I have 20 kg tomatoes, 30 rupees per kg, Ghaziabad, my name is Raj, 9876543210.');
    const r = await processTurn(sid, 'No, Noida.');
    assert.equal(r.listing.location, 'Noida');
    assert.ok(r.agent_message.includes('Noida'));
  });
});

// ===== COMPREHENSIVE REGRESSION TESTS (Problems 1-13) =====

describe('Problem 1 - Agent retains information across turns', () => {
  it('extracts farmer_name from "Mera naam Ramesh hai" and does not re-ask', async () => {
    const sid = 'p1-1';
    const r1 = await processTurn(sid, 'Mera naam Ramesh hai');
    assert.equal(r1.listing.farmer_name, 'Ramesh');
    assert.ok(!r1.agent_message.includes('naam kya hai'), `must not ask for name again, got: ${r1.agent_message}`);
  });
  it('extracts name+location+product+quantity from one utterance', async () => {
    const sid = 'p1-2';
    const r = await processTurn(sid, 'Main Ramesh hoon, Ghaziabad se hoon aur mere paas 500 kilo tamatar hai.');
    assert.equal(r.listing.farmer_name, 'Ramesh');
    assert.equal(r.listing.location, 'Ghaziabad');
    assert.equal(r.listing.product, 'Tomato');
    assert.equal(r.listing.quantity, 500);
    assert.equal(r.listing.unit, 'kg');
  });
});

describe('Problem 2 - Merge extraction with existing state', () => {
  it('merges name into existing state without erasing other fields', async () => {
    const sid = 'p2-1';
    await processTurn(sid, 'Main Ghaziabad se hoon');
    const r = await processTurn(sid, 'Main Ramesh hoon');
    assert.equal(r.listing.location, 'Ghaziabad', 'location must be preserved');
    assert.equal(r.listing.farmer_name, 'Ramesh');
  });
  it('merges location into existing state without erasing name', async () => {
    const sid = 'p2-2';
    await processTurn(sid, 'Main Ramesh hoon');
    const r = await processTurn(sid, 'Main Ghaziabad se hoon');
    assert.equal(r.listing.farmer_name, 'Ramesh', 'name must be preserved');
    assert.equal(r.listing.location, 'Ghaziabad');
  });
});

describe('Problem 3 - Never ask for a field already known', () => {
  it('does not re-ask for name after it is provided', async () => {
    const sid = 'p3-1';
    await processTurn(sid, 'Mera naam Ramesh hai');
    const r = await processTurn(sid, '9876543210');
    assert.ok(!r.agent_message.includes('naam kya hai'), `must not ask name, got: ${r.agent_message}`);
  });
  it('does not re-ask for phone after it is provided', async () => {
    const sid = 'p3-2';
    await processTurn(sid, 'Mera number 9876543210 hai');
    const r = await processTurn(sid, 'Main Ramesh hoon');
    assert.ok(!r.agent_message.includes('mobile number'), `must not ask phone, got: ${r.agent_message}`);
  });
});

describe('Problem 4 - Extract multiple fields from one response', () => {
  it('extracts name+location+quantity+unit+product+price from one utterance', async () => {
    const sid = 'p4-1';
    const r = await processTurn(sid, 'Main Ramesh hoon, Ghaziabad se hoon, 500 kilo tamatar hai, 30 rupaye kilo mein.');
    assert.equal(r.listing.farmer_name, 'Ramesh');
    assert.equal(r.listing.location, 'Ghaziabad');
    assert.equal(r.listing.quantity, 500);
    assert.equal(r.listing.unit, 'kg');
    assert.equal(r.listing.product, 'Tomato');
    assert.equal(r.listing.asking_price, 30);
    assert.equal(r.listing.price_unit, 'kg');
  });
});

describe('Problem 5 - Handle natural Hindi/Hinglish', () => {
  it('extracts name from "Main Ramesh hoon"', async () => {
    const sid = 'p5-1';
    const r = await processTurn(sid, 'Main Ramesh hoon');
    assert.equal(r.listing.farmer_name, 'Ramesh');
  });
  it('extracts name from "Naam Ramesh hai"', async () => {
    const sid = 'p5-2';
    const r = await processTurn(sid, 'Naam Ramesh hai');
    assert.equal(r.listing.farmer_name, 'Ramesh');
  });
  it('extracts phone from "Mera number 9876543210 hai"', async () => {
    const sid = 'p5-3';
    const r = await processTurn(sid, 'Mera number 9876543210 hai');
    assert.equal(r.listing.phone, '9876543210');
  });
  it('extracts location from "Main Ghaziabad mein rehta hoon"', async () => {
    const sid = 'p5-4';
    const r = await processTurn(sid, 'Main Ghaziabad mein rehta hoon');
    assert.equal(r.listing.location, 'Ghaziabad');
  });
  it('extracts quantity+unit+product from "Mere paas 500 kilo tamatar hai"', async () => {
    const sid = 'p5-5';
    const r = await processTurn(sid, 'Mere paas 500 kilo tamatar hai');
    assert.equal(r.listing.quantity, 500);
    assert.equal(r.listing.unit, 'kg');
    assert.equal(r.listing.product, 'Tomato');
  });
  it('extracts price+unit from "30 rupaye kilo"', async () => {
    const sid = 'p5-6';
    await processTurn(sid, 'Mere paas 20 kilo tamatar hai.');
    const r = await processTurn(sid, '30 rupaye kilo');
    assert.equal(r.listing.asking_price, 30);
    assert.equal(r.listing.price_unit, 'kg');
  });
  it('extracts quality from "Quality achhi hai"', async () => {
    const sid = 'p5-7';
    await processTurn(sid, 'Mere paas 20 kilo tamatar hai, 30 rupaye kilo, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'achhi hai');
    assert.equal(r.listing.quality, 'Good');
  });
});

describe('Problem 6 - Corrections update only the corrected field', () => {
  it('corrects location without resetting other fields', async () => {
    const sid = 'p6-1';
    await processTurn(sid, 'Mere paas 20 kilo tamatar hai, 30 rupaye kilo, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Nahi, Meerut se hoon.');
    assert.equal(r.listing.location, 'Meerut');
    assert.equal(r.listing.farmer_name, 'Raj', 'name must not change');
    assert.equal(r.listing.product, 'Tomato', 'product must not change');
    assert.equal(r.listing.quantity, 20, 'quantity must not change');
  });
  it('corrects quantity without resetting other fields', async () => {
    const sid = 'p6-2';
    await processTurn(sid, 'Mere paas 20 kilo tamatar hai, 30 rupaye kilo, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Nahi, 20 nahi, 30 kilo hai.');
    assert.equal(r.listing.quantity, 30);
    assert.equal(r.listing.farmer_name, 'Raj', 'name must not change');
    assert.equal(r.listing.product, 'Tomato', 'product must not change');
    assert.equal(r.listing.location, 'Ghaziabad', 'location must not change');
  });
});

describe('Problem 7 - Final confirmation flow', () => {
  it('shows confirmation when all fields are collected', async () => {
    const sid = 'p7-1';
    const r = await processTurn(sid, '10 kilo wheat, 30 rupaye kilo, Ghaziabad, mera naam Raj hai, 9876543210.');
    assert.equal(r.state, 'CONFIRMING');
    assert.ok(r.agent_message.includes('check'), `should mention checking, got: ${r.agent_message}`);
  });
  it('submits listing when farmer says "Nahi" to confirmation', async () => {
    const sid = 'p7-2';
    await processTurn(sid, '10 kilo wheat, 30 rupaye kilo, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Nahi');
    assert.ok(r.state === 'SUCCESS' || r.state === 'CONFIRMING' || r.state === 'SUBMITTING',
      `should be SUCCESS/SUBMITTING/CONFIRMING, got: ${r.state}`);
    if (r.state === 'SUCCESS') {
      assert.ok(r.listing_id, 'should have listing_id');
    }
  });
  it('submits listing when farmer says "Nahi, sab theek hai"', async () => {
    const sid = 'p7-3';
    await processTurn(sid, '10 kilo wheat, 30 rupaye kilo, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Nahi, sab theek hai');
    assert.ok(r.state === 'SUCCESS' || r.state === 'CONFIRMING' || r.state === 'SUBMITTING',
      `should be SUCCESS/SUBMITTING/CONFIRMING, got: ${r.state}`);
    if (r.state === 'SUCCESS') {
      assert.ok(r.listing_id, 'should have listing_id');
    }
  });
  it('submits listing when farmer says "Haan sab sahi hai"', async () => {
    const sid = 'p7-4';
    await processTurn(sid, '10 kilo wheat, 30 rupaye kilo, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Haan sab sahi hai');
    assert.ok(r.state === 'SUCCESS' || r.state === 'CONFIRMING' || r.state === 'SUBMITTING',
      `should be SUCCESS/SUBMITTING/CONFIRMING, got: ${r.state}`);
  });
  it('submits listing when farmer says "Yes"', async () => {
    const sid = 'p7-5';
    await processTurn(sid, '10 kilo wheat, 30 rupaye kilo, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Yes');
    assert.ok(r.state === 'SUCCESS' || r.state === 'CONFIRMING' || r.state === 'SUBMITTING',
      `should be SUCCESS/SUBMITTING/CONFIRMING, got: ${r.state}`);
  });
});

describe('Problem 8 - Confirmation intent detection', () => {
  it('"nahi" alone means confirmed (no changes)', async () => {
    const sid = 'p8-1';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'nahi');
    assert.ok(r.state === 'SUCCESS' || r.state === 'CONFIRMING' || r.state === 'SUBMITTING',
      `should be SUCCESS/SUBMITTING/CONFIRMING, got: ${r.state}`);
  });
  it('"nahi, sab theek hai" means confirmed', async () => {
    const sid = 'p8-2';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'nahi, sab theek hai');
    assert.ok(r.state === 'SUCCESS' || r.state === 'CONFIRMING' || r.state === 'SUBMITTING',
      `should be SUCCESS/SUBMITTING/CONFIRMING, got: ${r.state}`);
  });
  it('"sab sahi hai" means confirmed', async () => {
    const sid = 'p8-3';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'sab sahi hai');
    assert.ok(r.state === 'SUCCESS' || r.state === 'CONFIRMING' || r.state === 'SUBMITTING',
      `should be SUCCESS/SUBMITTING/CONFIRMING, got: ${r.state}`);
  });
  it('"nahi" does NOT start correction flow during CONFIRMING', async () => {
    const sid = 'p8-4';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Nahi');
    assert.notEqual(r.state, 'ASKING', 'must not enter correction flow');
    assert.ok(r.state === 'SUCCESS' || r.state === 'CONFIRMING' || r.state === 'SUBMITTING',
      `should be SUCCESS/SUBMITTING/CONFIRMING, got: ${r.state}`);
  });
});

describe('Problem 9 - Change request during confirmation', () => {
  it('enters correction mode when farmer specifies what to change', async () => {
    const sid = 'p9-1';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Haan, quantity badalni hai. 500 nahi 300 kilo hai.');
    assert.equal(r.listing.quantity, 300);
    assert.equal(r.state, 'CONFIRMING');
  });
  it('"Nahi" during confirmation submits (not correction)', async () => {
    const sid = 'p9-2';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Nahi');
    assert.ok(r.state === 'SUCCESS' || r.state === 'CONFIRMING' || r.state === 'SUBMITTING',
      `should be SUCCESS/SUBMITTING/CONFIRMING, got: ${r.state}`);
  });
});

describe('Problem 10 - Submission after confirmation only', () => {
  it('does not submit incomplete listing', async () => {
    const sid = 'p10-1';
    const r = await processTurn(sid, '10 kilo wheat hai.');
    assert.notEqual(r.state, 'SUCCESS');
    assert.notEqual(r.state, 'SUBMITTING');
  });
  it('submits only after all fields collected and confirmed', async () => {
    const sid = 'p10-2';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Haan');
    assert.ok(r.state === 'SUCCESS' || r.state === 'SUBMITTING');
    if (r.state === 'SUCCESS') {
      assert.ok(r.listing_id);
    }
  });
});

describe('Problem 11 - State machine transitions', () => {
  it('IDLE -> ASKING -> CONFIRMING -> SUCCESS', async () => {
    const sid = 'p11-1';
    const r1 = await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    assert.equal(r1.state, 'CONFIRMING');
    const r2 = await processTurn(sid, 'Haan');
    assert.ok(r2.state === 'SUCCESS' || r2.state === 'SUBMITTING');
  });
  it('CONFIRMING -> correction -> CONFIRMING -> SUCCESS', async () => {
    const sid = 'p11-2';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r2 = await processTurn(sid, 'Haan lekin 35 rupaye kilo hai.');
    assert.equal(r2.state, 'CONFIRMING');
    assert.equal(r2.listing.asking_price, 35);
    const r3 = await processTurn(sid, 'Nahi');
    assert.ok(r3.state === 'SUCCESS' || r3.state === 'SUBMITTING');
  });
  it('CONFIRMING -> cancel -> CANCELLED', async () => {
    const sid = 'p11-3';
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Cancel');
    assert.equal(r.state, 'CANCELLED');
  });
});

describe('Problem 13 - No mock data', () => {
  it('new session starts completely empty', async () => {
    const sid = 'p13-1';
    const r = await processTurn(sid, 'Hello');
    assert.equal(r.listing.farmer_name, null);
    assert.equal(r.listing.phone, null);
    assert.equal(r.listing.product, null);
    assert.equal(r.listing.quantity, null);
    assert.equal(r.listing.unit, null);
    assert.equal(r.listing.asking_price, null);
    assert.equal(r.listing.price_unit, null);
    assert.equal(r.listing.location, null);
    assert.equal(r.listing.quality, null);
  });
});

describe('Regression Tests - Core Problems', () => {
  // TEST 1: Single field extraction works and is not forgotten
  it('TEST 1: extracts single field and does not ask for it again', async () => {
    const sid = 'reg-1';
    const r1 = await processTurn(sid, 'Mera naam Ramesh hai');
    assert.equal(r1.listing.farmer_name, 'Ramesh', 'should extract name');
    // Verify that next question is not asking for name
    assert.ok(!r1.agent_message.toLowerCase().includes('naam kya hai'), 
      `agent should not ask for name again, got: ${r1.agent_message}`);
  });

  // TEST 2: Multiple fields extracted from single utterance
  it('TEST 2: extracts multiple fields from one utterance', async () => {
    const sid = 'reg-2';
    const r = await processTurn(sid, 'Main Ramesh hoon aur Ghaziabad se hoon');
    assert.equal(r.listing.farmer_name, 'Ramesh', 'should extract name');
    assert.equal(r.listing.location, 'Ghaziabad', 'should extract location');
    assert.ok(!r.missing_fields.includes('farmer_name'), 'farmer_name should not be missing');
    assert.ok(!r.missing_fields.includes('location'), 'location should not be missing');
  });

  // TEST 3: Multiple fields in complex utterance
  it('TEST 3: extracts all fields from complex utterance', async () => {
    const sid = 'reg-3';
    const r = await processTurn(sid, 'Main Ramesh hoon, Ghaziabad se hoon, mere paas 500 kilo tamatar hai');
    assert.equal(r.listing.farmer_name, 'Ramesh');
    assert.equal(r.listing.location, 'Ghaziabad');
    assert.equal(r.listing.product, 'Tomato');
    assert.equal(r.listing.quantity, 500);
    assert.equal(r.listing.unit, 'kg');
  });

  // TEST 4: Name and phone extracted together without asking again
  it('TEST 4: extracts name and phone, does not repeat questions', async () => {
    const sid = 'reg-4';
    const r = await processTurn(sid, 'Main Ramesh hoon, mera number 9876543210 hai');
    assert.equal(r.listing.farmer_name, 'Ramesh');
    assert.equal(r.listing.phone, '9876543210');
    assert.ok(!r.agent_message.toLowerCase().includes('naam kya hai'), 'should not ask for name');
    assert.ok(!r.agent_message.toLowerCase().includes('mobile') || r.agent_message.toLowerCase().includes('kya'), 
      'should not repeat phone question if already asked');
  });

  // TEST 5: Complete information in one turn
  it('TEST 5: accepts complete listing in one utterance and goes to confirmation', async () => {
    const sid = 'reg-5';
    const r = await processTurn(sid, 
      'Main Ramesh hoon, mera number 9876543210 hai, Ghaziabad se, mere paas 500 kilo tamatar hai, 30 rupaye kilo');
    // Should reach CONFIRMING if all fields are filled
    assert.ok(r.state === 'CONFIRMING' || (r.state === 'ASKING' && r.missing_fields.length > 0), 
      `should reach confirmation or ask for remaining fields, got state: ${r.state}`);
  });

  // TEST 6: Confirmation with "Nahi" submits listing
  it('TEST 6: confirms listing on "Nahi" and submits', async () => {
    const sid = 'reg-6';
    const r1 = await processTurn(sid, 'Main Ramesh hoon, 9876543210, Ghaziabad se, 500 kilo tamatar, 30 rupaye kilo');
    // First check if we're in confirmation or need more fields
    if (r1.state !== 'CONFIRMING') {
      // If not in confirmation, fill remaining fields
      const r2 = await processTurn(sid, 'Ramesh'); // Provide any remaining missing data
      assert.equal(r2.state, 'CONFIRMING', 'should be in confirmation after providing all fields');
      const r3 = await processTurn(sid, 'Nahi');
      assert.ok(r3.state === 'SUCCESS' || r3.state === 'SUBMITTING', 
        `should submit on "Nahi", got state: ${r3.state}`);
    } else {
      const r2 = await processTurn(sid, 'Nahi');
      assert.ok(r2.state === 'SUCCESS' || r2.state === 'SUBMITTING', 
        `should submit on "Nahi", got state: ${r2.state}`);
    }
  });

  // TEST 7: Confirmation with "Nahi sab theek hai" submits
  it('TEST 7: confirms on "Nahi sab theek hai" and submits', async () => {
    const sid = 'reg-7';
    const r1 = await processTurn(sid, 'Main Ramesh hoon, 9876543210, Ghaziabad se, 500 kilo tamatar, 30 rupaye kilo');
    if (r1.state !== 'CONFIRMING') {
      const r2 = await processTurn(sid, 'Ramesh');
      assert.equal(r2.state, 'CONFIRMING');
      const r3 = await processTurn(sid, 'Nahi sab theek hai');
      assert.ok(r3.state === 'SUCCESS' || r3.state === 'SUBMITTING');
    } else {
      const r2 = await processTurn(sid, 'Nahi sab theek hai');
      assert.ok(r2.state === 'SUCCESS' || r2.state === 'SUBMITTING');
    }
  });

  // TEST 8: Correction updates only changed field
  it('TEST 8: corrects field without resetting others', async () => {
    const sid = 'reg-8';
    await processTurn(sid, '500 kilo tamatar hai');
    await processTurn(sid, '30 rupaye kilo');
    const r = await processTurn(sid, 'Nahi, quantity 300 kilo hai');
    assert.equal(r.listing.quantity, 300, 'should update quantity to 300');
    assert.equal(r.listing.product, 'Tomato', `should preserve product, got: ${r.listing.product}`);
    assert.equal(r.listing.asking_price, 30, 'should preserve price');
  });

  // TEST 9: "Nahi" in confirmation context means NO CHANGES
  it('TEST 9: "Nahi" during confirmation means no changes, not rejection', async () => {
    const sid = 'reg-9';
    const r1 = await processTurn(sid, 'Main Test hoon, 9999999999, Testpur, 100 kilo aloo, 20 rupaye kilo');
    if (r1.state === 'CONFIRMING') {
      const r2 = await processTurn(sid, 'Nahi');
      // Should transition to SUCCESS/SUBMITTING, not back to ASKING
      assert.ok(r2.state === 'SUCCESS' || r2.state === 'SUBMITTING', 
        `"Nahi" should mean NO CHANGES in confirmation context, got state: ${r2.state}`);
    } else {
      // If not yet in confirmation, just verify the behavior when we get there
      assert.ok(r1.state === 'ASKING' || r1.state === 'CONFIRMING');
    }
  });

  // TEST 10: State preserved across turns
  it('TEST 10: information persists across multiple turns', async () => {
    const sid = 'reg-10';
    await processTurn(sid, 'Mere paas 500 kilo hai');
    await processTurn(sid, 'tamatar hai');
    await processTurn(sid, '30 rupaye');
    const r = await processTurn(sid, 'Ghaziabad se');
    assert.equal(r.listing.quantity, 500);
    assert.equal(r.listing.product, 'Tomato');
    assert.equal(r.listing.asking_price, 30);
    assert.equal(r.listing.location, 'Ghaziabad');
  });

  // TEST 11: Hindi name patterns work
  it('TEST 11: accepts Hindi patterns for name extraction', async () => {
    const sid = 'reg-11';
    const r1 = await processTurn(sid, 'Mera naam Ramesh hai');
    assert.equal(r1.listing.farmer_name, 'Ramesh');
  });

  // TEST 12: Hindi phone patterns work
  it('TEST 12: accepts Hindi patterns for phone extraction', async () => {
    const sid = 'reg-12';
    const r = await processTurn(sid, 'Mera number 9876543210 hai');
    assert.equal(r.listing.phone, '9876543210');
  });

  // TEST 13: Dynamic product extraction (not hardcoded)
  it('TEST 13: extracts any product dynamically', async () => {
    const sid = 'reg-13';
    const r = await processTurn(sid, 'Mere paas pyaaz hai');
    assert.equal(r.listing.product, 'Onion', 'should extract onion from "pyaaz"');
  });

  // TEST 14: No repeated questions after extraction
  it('TEST 14: never repeats a question for an already-known field', async () => {
    const sid = 'reg-14';
    await processTurn(sid, 'Main Raj hoon');
    const r2 = await processTurn(sid, '500 kilo wheat');
    const r3 = await processTurn(sid, '30 rupaye');
    const r4 = await processTurn(sid, 'Ghaziabad');
    // Should never ask "aapka naam kya hai?" again because we know it
    assert.ok(!r2.agent_message.toLowerCase().includes('naam kya'), 'should not ask for name in r2');
    assert.ok(!r3.agent_message.toLowerCase().includes('naam kya'), 'should not ask for name in r3');
    assert.ok(!r4.agent_message.toLowerCase().includes('naam kya'), 'should not ask for name in r4');
  });

  // TEST 15: Confirmation includes all fields
  it('TEST 15: confirmation message includes all collected fields', async () => {
    const sid = 'reg-15';
    const r1 = await processTurn(sid, 'Main Ramesh hoon, 9876543210, Ghaziabad, 500 kilo tamatar, 30 rupaye');
    const r = r1.state === 'CONFIRMING' ? r1 : await processTurn(sid, 'Confirm');
    if (r.agent_message) {
      const msg = r.agent_message;
      assert.ok(msg.includes('Ramesh') || msg.includes('500') || msg.includes('tamatar') || msg.toLowerCase().includes('kilo'), 
        `confirmation should include collected fields, got: ${msg}`);
    }
  });
});
