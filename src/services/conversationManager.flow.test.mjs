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

