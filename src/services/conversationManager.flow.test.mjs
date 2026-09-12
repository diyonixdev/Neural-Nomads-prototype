// Runtime regression test for the LIVE /farmer/voice flow.
//
// This imports the SAME frontend conversation engine that VoiceAssistant.tsx
// uses in the browser (src/services/conversationManager.ts) — not the server
// copy (server/conversationManager.mjs) — so the test reflects what actually
// runs on the /farmer/voice page.
//
// Run: node --test src/services/conversationManager.flow.test.mjs
// (requires Node >= 22.6 with --experimental-strip-types semantics; Node 24
//  strips TS types natively)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { sendConversationTurn, resetConversation } = await import('./conversationManager.ts');

// Same call the live page makes: VoiceAssistant -> voiceAgentCore.processTurn
// -> sendConversationTurn(sessionId, text).
const processTurn = (sid, text) => sendConversationTurn(sid, text);

const s = (v) => (v === null || v === undefined ? null : v);

describe('LIVE /farmer/voice flow (frontend engine)', () => {
  it('fills ONLY what the farmer said — no fabrication, ever', async () => {
    const sid = 'flow-1';
    resetConversation(sid);

    // Turn 1: location only
    const r1 = await processTurn(sid, 'Main Ghaziabad se hoon');
    assert.equal(r1.listing.location, 'Ghaziabad');
    assert.equal(s(r1.listing.product), null, 'product must stay null');
    assert.equal(s(r1.listing.quantity), null);
    assert.equal(s(r1.listing.unit), null);
    assert.equal(s(r1.listing.asking_price), null);
    assert.equal(s(r1.listing.farmer_name), null);
    assert.equal(s(r1.listing.phone), null);
    assert.equal(s(r1.listing.quality), null);
    assert.equal(r1.agent_message.includes('Ghaziabad'), true, 'should echo the location');
    assert.equal(
      /kya bechna chahte hain/i.test(r1.agent_message),
      true,
      `should ask "Aap kya bechna chahte hain?", got: ${r1.agent_message}`
    );

    // Turn 2: product + quantity
    const r2 = await processTurn(sid, 'Mere paas 500 kilo tamatar hai');
    assert.equal(r2.listing.location, 'Ghaziabad', 'previous value must remain');
    assert.equal(r2.listing.product, 'Tomato');
    assert.equal(r2.listing.quantity, 500);
    assert.equal(r2.listing.unit, 'kg');
    assert.equal(s(r2.listing.asking_price), null, 'price must stay null');
    assert.equal(s(r2.listing.farmer_name), null);
    assert.equal(s(r2.listing.phone), null);

    // Turn 3: price
    const r3 = await processTurn(sid, '30 rupaye kilo');
    assert.equal(r3.listing.location, 'Ghaziabad');
    assert.equal(r3.listing.product, 'Tomato');
    assert.equal(r3.listing.quantity, 500);
    assert.equal(r3.listing.asking_price, 30);
    assert.equal(r3.listing.price_unit, 'kg');
    assert.equal(s(r3.listing.farmer_name), null);
    assert.equal(s(r3.listing.phone), null);

    // Structured data stays numeric even though speech uses Hindi words
    assert.equal(typeof r3.listing.asking_price, 'number');
  });

  it('other cities and other products work generically (no hardcoding)', async () => {
    const sid = 'flow-2';
    resetConversation(sid);
    const r1 = await processTurn(sid, 'Main Meerut se hoon');
    assert.equal(r1.listing.location, 'Meerut');
    assert.equal(s(r1.listing.product), null);
    const r2 = await processTurn(sid, 'Mere paas 500 kilo tamatar hai');
    assert.equal(r2.listing.location, 'Meerut');
    assert.equal(r2.listing.product, 'Tomato');
    assert.equal(r2.listing.quantity, 500);

    const sid2 = 'flow-3';
    resetConversation(sid2);
    const p1 = await processTurn(sid2, 'Main Pune se hoon');
    assert.equal(p1.listing.location, 'Pune');
    assert.equal(s(p1.listing.product), null, 'Pune must not become a product');
    const p2 = await processTurn(sid2, 'Gehun');
    assert.equal(p2.listing.product, 'Wheat');
    assert.equal(p2.listing.location, 'Pune', 'location unchanged');
    assert.equal(/kitna bechna hai/i.test(p2.agent_message), true, `should ask "Kitna bechna hai?", got: ${p2.agent_message}`);
  });

  it('NEVER fabricates from the assistant echo or noise ("Ji. Aap do kilo Isi bechna chahte hain, Isi ko dar rakho se...")', async () => {
    const sid = 'flow-4';
    resetConversation(sid);
    // Simulate speech recognition capturing the assistant's own sentence.
    const r = await processTurn(sid, 'Ji. Aap do kilo Isi bechna chahte hain, Isi ko dar rakho se');
    assert.notEqual(r.listing.location, 'N Isi Ko Dar Rakho');
    assert.notEqual(r.listing.location, 'Isi Ko Dar Rakho');
    assert.equal(r.listing.quantity, null, 'assistant echo must not create quantity');
    assert.equal(r.listing.asking_price, null, 'assistant echo must not create price');
    assert.equal(r.listing.farmer_name, null);
    assert.equal(r.listing.phone, null);
  });

  it('phone/name only appear when the farmer actually says them', async () => {
    const sid = 'flow-5';
    resetConversation(sid);
    const r1 = await processTurn(sid, 'Mera naam Ramesh Kumar hai');
    assert.equal(r1.listing.farmer_name, 'Ramesh Kumar');
    assert.equal(r1.listing.phone, null, 'phone must stay null until spoken');
    const r2 = await processTurn(sid, 'Mera number 9876543210 hai');
    assert.equal(r2.listing.phone, '9876543210');
    assert.equal(r2.listing.farmer_name, 'Ramesh Kumar', 'name unchanged');
  });

  it('Case 4: combined single-turn utterance ("Main Ghaziabad se hoon, mere paas 500 kilo tamatar hai")', async () => {
    const sid = 'flow-7';
    resetConversation(sid);
    const r = await processTurn(sid, 'Main Ghaziabad se hoon, mere paas 500 kilo tamatar hai');
    assert.equal(r.listing.location, 'Ghaziabad');
    assert.equal(r.listing.product, 'Tomato');
    assert.equal(r.listing.quantity, 500);
    assert.equal(r.listing.unit, 'kg');
  });

  it('Case 5 & 6: "10 kilo" extracts qty=10 unit=kg and echoes Hindi number words with "Kitna bechna hai?" prompt', async () => {
    const sid = 'flow-8';
    resetConversation(sid);
    const r1 = await processTurn(sid, 'Tamatar');
    assert.equal(r1.listing.product, 'Tomato');
    assert.equal(/kitna bechna hai/i.test(r1.agent_message), true, `should ask "Kitna bechna hai?", got: ${r1.agent_message}`);
    assert.equal(/kitna hai\?/i.test(r1.agent_message), false, 'should NOT ask "Kitna hai?"');

    const r2 = await processTurn(sid, '10 kilo');
    assert.equal(r2.listing.quantity, 10);
    assert.equal(r2.listing.unit, 'kg');
    assert.equal(/das kilo|10 kilo|10 kg/i.test(r2.agent_message), true, `should echo 10 kilo in response, got: ${r2.agent_message}`);
  });

  // ===== REGRESSION: bare "nahi" during confirmation = no changes =====
  it('"nahi" during CONFIRMING means no changes and submits', async () => {
    const sid = 'bare-nahi-1';
    resetConversation(sid);
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'Nahi');
    assert.equal(r.state, 'SUCCESS', `should be SUCCESS, got: ${r.state}`);
  });
  it('"nahi, sab theek hai" during CONFIRMING means no changes and submits', async () => {
    const sid = 'bare-nahi-2';
    resetConversation(sid);
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'nahi, sab theek hai');
    assert.equal(r.state, 'SUCCESS', `should be SUCCESS, got: ${r.state}`);
  });
  it('"no" during CONFIRMING means no changes and submits', async () => {
    const sid = 'bare-nahi-3';
    resetConversation(sid);
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'no');
    assert.equal(r.state, 'SUCCESS', `should be SUCCESS, got: ${r.state}`);
  });
  it('"sab theek hai" during CONFIRMING means no changes and submits', async () => {
    const sid = 'bare-nahi-4';
    resetConversation(sid);
    await processTurn(sid, '10 kilo wheat, 30 rupaye, Ghaziabad, mera naam Raj hai, 9876543210.');
    const r = await processTurn(sid, 'sab theek hai');
    assert.equal(r.state, 'SUCCESS', `should be SUCCESS, got: ${r.state}`);
  });

  // ===== REGRESSION: multi-field extraction from one utterance =====
  it('extracts name+location+product+quantity+price from one utterance', async () => {
    const sid = 'multi-extract-1';
    resetConversation(sid);
    const r = await processTurn(sid, 'Main Ramesh hoon, Ghaziabad se hoon, 500 kilo tamatar hai, 30 rupaye kilo mein.');
    assert.equal(r.listing.farmer_name, 'Ramesh');
    assert.equal(r.listing.location, 'Ghaziabad');
    assert.equal(r.listing.product, 'Tomato');
    assert.equal(r.listing.quantity, 500);
    assert.equal(r.listing.unit, 'kg');
    assert.equal(r.listing.asking_price, 30);
    assert.equal(r.listing.price_unit, 'kg');
  });

  // ===== REGRESSION: state preservation across turns =====
  it('preserves all fields across corrections', async () => {
    const sid = 'preserve-1';
    resetConversation(sid);
    await processTurn(sid, 'Main Ramesh hoon, Ghaziabad se hoon, 500 kilo tamatar hai, 30 rupaye kilo hai, 9876543210 hai.');
    const r = await processTurn(sid, 'Nahi, 300 kilo hai.');
    assert.equal(r.listing.quantity, 300, 'quantity corrected');
    assert.equal(r.listing.farmer_name, 'Ramesh', 'name preserved');
    assert.equal(r.listing.location, 'Ghaziabad', 'location preserved');
    assert.equal(r.listing.product, 'Tomato', 'product preserved');
    assert.equal(r.listing.asking_price, 30, 'price preserved');
    assert.equal(r.listing.phone, '9876543210', 'phone preserved');
  });

  // ===== REGRESSION: product must never be replaced by price =====
  it('₹10 in price turn must not overwrite product (wheat)', async () => {
    const sid = 'price-product-wheat';
    resetConversation(sid);
    const r1 = await processTurn(sid, '10 kilo wheat hai');
    assert.equal(r1.listing.product, 'Wheat');
    assert.equal(r1.listing.quantity, 10);
    assert.equal(s(r1.listing.asking_price), null, 'price not yet set');

    const r2 = await processTurn(sid, '₹10 mein bechna hai');
    assert.equal(r2.listing.product, 'Wheat', 'product must stay Wheat, not become ₹10');
    assert.equal(r2.listing.asking_price, 10, 'price correctly extracted');
    assert.equal(/gehun|wheat/i.test(r2.agent_message), true, `response must mention product, got: ${r2.agent_message}`);
    assert.equal(/₹.*ki quality/i.test(r2.agent_message), false, `response must not have ₹ in product position, got: ${r2.agent_message}`);
  });

  it('₹20 in price turn must not overwrite product (tomatoes)', async () => {
    const sid = 'price-product-tomato';
    resetConversation(sid);
    const r1 = await processTurn(sid, '5 kilo tamatar hai');
    assert.equal(r1.listing.product, 'Tomato');
    assert.equal(r1.listing.quantity, 5);

    const r2 = await processTurn(sid, '₹20 mein dena hai');
    assert.equal(r2.listing.product, 'Tomato', 'product must stay Tomato, not become ₹20');
    assert.equal(r2.listing.asking_price, 20, 'price correctly extracted');
    assert.equal(/tamatar/i.test(r2.agent_message), true, `response must mention product, got: ${r2.agent_message}`);
  });

  // ===== REGRESSION: context-aware field suppression (quality question) =====
  it('TEST 1: "Bdia quality hai" when last_asked=quality must not overwrite product', async () => {
    const sid = 'ctx-1';
    resetConversation(sid);
    await processTurn(sid, 'Namaste');
    await processTurn(sid, 'Mera naam Bdia hai');
    await processTurn(sid, 'Meerut se hoon');
    await processTurn(sid, 'Tomato bechna hai');
    await processTurn(sid, '2 kilo');
    await processTurn(sid, '₹10 rupaye kilo');
    // Now system asks for quality
    const r = await processTurn(sid, 'Bdia quality hai');
    assert.equal(r.listing.product, 'Tomato', 'product must remain Tomato');
    assert.notEqual(r.listing.quality, null, 'quality must be extracted');
    assert.equal(r.listing.farmer_name, 'Bdia');
  });

  it('TEST 2: "Grade A quality hai" when last_asked=quality must not overwrite product', async () => {
    const sid = 'ctx-2';
    resetConversation(sid);
    await processTurn(sid, 'Namaste');
    await processTurn(sid, 'Mera naam Raj hai');
    await processTurn(sid, 'Wheat bechna hai');
    await processTurn(sid, '5 kilo');
    await processTurn(sid, '₹15 rupaye kilo');
    const r = await processTurn(sid, 'Grade A quality hai');
    assert.equal(r.listing.product, 'Wheat', 'product must remain Wheat');
    assert.equal(r.listing.quality, 'Grade A');
  });

  it('TEST 3: "premium quality hai" when last_asked=quality must not overwrite product', async () => {
    const sid = 'ctx-3';
    resetConversation(sid);
    await processTurn(sid, 'Namaste');
    await processTurn(sid, 'Potato bechna hai');
    await processTurn(sid, '3 kilo');
    await processTurn(sid, '₹8 rupaye kilo');
    const r = await processTurn(sid, 'premium quality hai');
    assert.equal(r.listing.product, 'Potato', 'product must remain Potato');
    assert.notEqual(r.listing.quality, null, 'quality must be extracted');
  });

  it('TEST 4: "fresh and excellent" when last_asked=quality must not overwrite product', async () => {
    const sid = 'ctx-4';
    resetConversation(sid);
    await processTurn(sid, 'Namaste');
    await processTurn(sid, 'Onion bechna hai');
    await processTurn(sid, '4 kilo');
    await processTurn(sid, '₹12 rupaye kilo');
    const r = await processTurn(sid, 'fresh and excellent');
    assert.equal(r.listing.product, 'Onion', 'product must remain Onion');
    assert.notEqual(r.listing.quality, null, 'quality must be extracted');
  });

  it('TEST 5: "Meerut se" when last_asked=location must not overwrite product', async () => {
    const sid = 'ctx-5';
    resetConversation(sid);
    await processTurn(sid, 'Namaste');
    await processTurn(sid, 'Carrot bechna hai');
    await processTurn(sid, '6 kilo');
    await processTurn(sid, '₹25 rupaye kilo');
    const r = await processTurn(sid, 'Meerut se');
    assert.equal(r.listing.product, 'Carrot', 'product must remain Carrot');
    assert.equal(r.listing.location, 'Meerut');
  });

  it('TEST 6: "10 kilo" when last_asked=quantity must not overwrite product', async () => {
    const sid = 'ctx-6';
    resetConversation(sid);
    await processTurn(sid, 'Namaste');
    await processTurn(sid, 'Peas bechna hai');
    await processTurn(sid, '₹18 rupaye kilo');
    const r = await processTurn(sid, '10 kilo');
    assert.equal(r.listing.product, 'Peas', 'product must remain Peas');
    assert.equal(r.listing.quantity, 10);
    assert.equal(r.listing.unit, 'kg');
  });

  it('TEST 7: "Main tomato bechna chahta hoon" extracts product', async () => {
    const sid = 'ctx-7';
    resetConversation(sid);
    await processTurn(sid, 'Namaste');
    const r = await processTurn(sid, 'Main tomato bechna chahta hoon');
    assert.equal(r.listing.product, 'Tomato');
  });

  it('TEST 8: "10 kilo tomato ₹20 mein bechna hai" extracts all fields', async () => {
    const sid = 'ctx-8';
    resetConversation(sid);
    await processTurn(sid, 'Namaste');
    const r = await processTurn(sid, '10 kilo tomato ₹20 mein bechna hai');
    assert.equal(r.listing.product, 'Tomato');
    assert.equal(r.listing.quantity, 10);
    assert.equal(r.listing.unit, 'kg');
    assert.equal(r.listing.asking_price, 20);
    assert.equal(r.listing.price_unit, 'kg');
  });

  it('TEST 9: full conversation then quality answer must preserve product', async () => {
    const sid = 'ctx-9';
    resetConversation(sid);
    await processTurn(sid, 'Namaste');
    await processTurn(sid, 'Mera naam Ramesh hai');
    await processTurn(sid, 'Ghaziabad se hoon');
    await processTurn(sid, 'Tomato bechna hai');
    await processTurn(sid, '10 kilo');
    await processTurn(sid, '₹20 rupaye kilo');
    await processTurn(sid, '9876543210');
    // Now in CONFIRMING state — user says arbitrary quality text
    const r = await processTurn(sid, 'Bdia quality hai');
    assert.equal(r.listing.product, 'Tomato', 'product must remain Tomato');
    assert.equal(r.listing.farmer_name, 'Ramesh');
    assert.equal(r.listing.location, 'Ghaziabad');
    assert.equal(r.listing.quantity, 10);
    assert.equal(r.listing.asking_price, 20);
    assert.equal(r.listing.phone, '9876543210');
    // In CONFIRMING state, "quality" keyword triggers a change question
    // — the product must NOT be overwritten by the quality text
    assert.equal(r.state, 'CONFIRMING');
  });

  it('TEST 10: multiple unseen quality descriptions all work generically', async () => {
    const qualityInputs = [
      'Bdia quality hai',
      'premium quality hai',
      'fresh and excellent',
      'bahut achhi quality hai',
      'average quality hai',
      'Grade B quality hai',
      'normal hai',
      'shandar quality hai',
    ];
    for (const input of qualityInputs) {
      const sid = 'ctx-10-' + qualityInputs.indexOf(input);
      resetConversation(sid);
      await processTurn(sid, 'Namaste');
      await processTurn(sid, 'Wheat bechna hai');
      await processTurn(sid, '5 kilo');
      await processTurn(sid, '₹15 rupaye kilo');
      const r = await processTurn(sid, input);
      assert.equal(r.listing.product, 'Wheat', `product must remain Wheat for input "${input}"`);
      assert.notEqual(r.listing.quality, null, `quality must be extracted for input "${input}"`);
    }
  });

  // ===== REGRESSION: full flow end-to-end =====
  it('complete flow: collect all -> confirm -> "Nahi" -> SUCCESS', async () => {
    const sid = 'e2e-1';
    resetConversation(sid);
    const r1 = await processTurn(sid, 'Main Ramesh hoon, Ghaziabad se hoon, 500 kilo tamatar hai, 30 rupaye kilo hai, 9876543210 hai.');
    assert.equal(r1.state, 'CONFIRMING');
    const r2 = await processTurn(sid, 'Nahi');
    assert.equal(r2.state, 'SUCCESS');
  });
});

