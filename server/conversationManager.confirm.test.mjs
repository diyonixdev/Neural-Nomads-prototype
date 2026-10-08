// ============================================================
// Confirmation + "<old> nahi <new>" correction-pair tests
// ============================================================
// No phone call, no network: listing submission is replaced by setSubmitListingImpl.
// Twilio behaviour is exercised by feeding handleSpeechResult() a fake
// request/response pair (same approach as test-confirmation-fixes.mjs).
//
// Covered here:
//   1  no listing is created while collecting / before an affirmative answer
//   2  "Haan, sab theek hai." / "Haan" create exactly one listing
//   3  repeated affirmations (Twilio retries) never create a second listing
//   4  non-affirmative turns never submit
//   5  correction pairs rewrite ONLY the corrected field
//      quantity / product / location / quality / price / phone
//   6  confirmation is re-shown (never auto-submitted) after a correction
//   7  listing submitted after a correction carries the corrected value
//   8  Grade A / B / C parsing, greeting, one-question-at-a-time
//   9  Twilio turn: continuing Gather (+ speechTimeout="3"), terminal Say+Hangup,
//      exactly one submission for the whole call
// ============================================================
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import {
  processTurn,
  createSession,
  getSession,
  setSubmitListingImpl,
  STATES,
  SUCCESS_MESSAGE,
  parseGradeAnswer,
} from './conversationManager.mjs';
import { handleSpeechResult } from './twilioVoice.mjs';

let submits = [];
setSubmitListingImpl(async (listing) => {
  submits.push({ ...listing });
  return { success: true, listing_id: `lst-confirm-${submits.length}`, status: 'active' };
});

const COLLECT = [
  'Namaste',
  'tamatar',
  'Ramesh',
  'Ghaziabad',
  '100 kilo',
  'Grade A',
  '30 rupaye kilo',
  '9876543210',
];

let seq = 0;
const setupConfirmed = async (label) => {
  submits = [];
  const sid = `cf-${label}-${++seq}`;
  createSession(sid);
  for (const turn of COLLECT) {
    await processTurn(sid, turn);
  }
  const session = getSession(sid);
  assert.equal(session.state, STATES.CONFIRMING, `setup "${label}" must reach CONFIRMING (got ${session.state})`);
  assert.equal(submits.length, 0, 'collection must never create a listing');
  return sid;
};

const listingOf = (sid) => ({ ...getSession(sid).listing });

describe('confirmation gate — a listing is created only after an explicit yes', () => {
  it('collecting every field creates no listing', async () => {
    const sid = await setupConfirmed('gate');
    assert.equal(submits.length, 0);
    assert.equal(listingOf(sid).quantity, 100);
    assert.equal(listingOf(sid).product, 'Tomato');
    assert.equal(listingOf(sid).farmer_name, 'Ramesh');
    assert.equal(listingOf(sid).location, 'Ghaziabad');
    assert.equal(listingOf(sid).quality, 'Grade A');
    assert.equal(listingOf(sid).asking_price, 30);
    assert.equal(listingOf(sid).phone, '9876543210');
  });

  it('"Haan, sab theek hai." creates exactly one listing', async () => {
    const sid = await setupConfirmed('yes-full');
    const result = await processTurn(sid, 'Haan, sab theek hai.');
    assert.equal(submits.length, 1);
    assert.equal(result.state, STATES.SUCCESS);
    assert.equal(result.agent_message, SUCCESS_MESSAGE);
    assert.equal(submits[0].quantity, 100);
    assert.equal(submits[0].product, 'Tomato');
  });

  it('bare "Haan" creates exactly one listing', async () => {
    const sid = await setupConfirmed('yes-bare');
    const result = await processTurn(sid, 'Haan');
    assert.equal(submits.length, 1);
    assert.equal(result.state, STATES.SUCCESS);
  });

  it('repeated affirmations (Twilio retries) never create a second listing', async () => {
    const sid = await setupConfirmed('yes-repeat');
    await processTurn(sid, 'Haan');
    assert.equal(submits.length, 1);
    const again = await processTurn(sid, 'Haan, sab theek hai.');
    assert.equal(again.state, STATES.SUCCESS);
    const third = await processTurn(sid, 'Yes');
    assert.equal(third.state, STATES.SUCCESS);
    assert.equal(submits.length, 1, 'only one listing for repeated yes answers');
  });

  it('non-affirmative turns never submit', async () => {
    const sid = await setupConfirmed('no-auto');
    const withData = await processTurn(sid, 'Mera naam Ramesh hai');
    assert.equal(withData.state, STATES.CONFIRMING);
    assert.equal(submits.length, 0, 'a data turn must not submit');
    const withoutData = await processTurn(sid, 'Mujhe samajh nahi aaya');
    assert.equal(withoutData.state, STATES.CONFIRMING);
    assert.equal(submits.length, 0, 'an unusable turn must not submit');
    const fieldWord = await processTurn(sid, 'price');
    assert.equal(submits.length, 0, 'a field word must not submit');
  });
});

describe('correction pairs "<old> nahi <new>" rewrite only the corrected field', () => {
  it('quantity: "2 kg nahi 5 kg aalu bechna hai" stores 5, keeps every other field, submits nothing yet', async () => {
    const sid = await setupConfirmed('qty-pair');
    const result = await processTurn(sid, '2 kg nahi 5 kg aalu bechna hai');
    const listing = listingOf(sid);

    assert.equal(listing.quantity, 5, `quantity must become 5 (got ${listing.quantity})`);
    assert.equal(listing.unit, 'kg');
    assert.equal(listing.product, 'Tomato');
    assert.equal(listing.farmer_name, 'Ramesh');
    assert.equal(listing.location, 'Ghaziabad');
    assert.equal(listing.quality, 'Grade A');
    assert.equal(listing.asking_price, 30);
    assert.equal(listing.phone, '9876543210');

    assert.equal(submits.length, 0, 'a correction alone never submits');
    assert.equal(result.state, STATES.CONFIRMING, 'confirmation must be shown again');
    assert.match(result.agent_message, /paanch kilo/, 'confirmation must echo the corrected quantity');
    assert.ok(!/\bnahi\b/i.test(result.agent_message), 'confirmation must not contain the old value');
  });

  it('confirming after the quantity correction submits one listing with quantity 5', async () => {
    const sid = await setupConfirmed('qty-then-yes');
    await processTurn(sid, '2 kg nahi 5 kg aalu bechna hai');
    const result = await processTurn(sid, 'Haan');
    assert.equal(result.state, STATES.SUCCESS);
    assert.equal(submits.length, 1);
    assert.equal(submits[0].quantity, 5, 'submitted listing must carry the corrected quantity');
    assert.equal(submits[0].unit, 'kg');
  });

  it('product: "Nahi, tamatar nahi pyaaz hai" stores Onion and leaves all other fields alone', async () => {
    const sid = await setupConfirmed('product-pair');
    const result = await processTurn(sid, 'Nahi, tamatar nahi pyaaz hai');
    const listing = listingOf(sid);

    assert.equal(listing.product, 'Onion', `product must become Onion (got ${listing.product})`);
    assert.equal(listing.farmer_name, 'Ramesh', 'name must not be touched');
    assert.equal(listing.location, 'Ghaziabad');
    assert.equal(listing.quantity, 100);
    assert.equal(listing.quality, 'Grade A');
    assert.equal(listing.asking_price, 30);
    assert.equal(listing.phone, '9876543210');
    assert.equal(result.state, STATES.CONFIRMING);
    assert.equal(submits.length, 0);
  });

  it('location: "Nahi, Ghaziabad nahi Noida" stores Noida without corrupting the farmer name', async () => {
    const sid = await setupConfirmed('location-pair');
    const result = await processTurn(sid, 'Nahi, Ghaziabad nahi Noida');
    const listing = listingOf(sid);

    assert.equal(listing.location, 'Noida', `location must become Noida (got ${listing.location})`);
    assert.equal(listing.farmer_name, 'Ramesh', `farmer name must stay Ramesh (got ${listing.farmer_name})`);
    assert.equal(listing.product, 'Tomato');
    assert.equal(listing.quantity, 100);
    assert.equal(listing.quality, 'Grade A');
    assert.equal(listing.asking_price, 30);
    assert.equal(listing.phone, '9876543210');
    assert.equal(result.state, STATES.CONFIRMING);
    assert.equal(submits.length, 0);
  });

  it('quality: "Nahi, Grade A nahi Grade B hai" stores Grade B and keeps the other fields', async () => {
    const sid = await setupConfirmed('quality-pair');
    const result = await processTurn(sid, 'Nahi, Grade A nahi Grade B hai');
    const listing = listingOf(sid);

    assert.equal(listing.quality, 'Grade B', `quality must become Grade B (got ${listing.quality})`);
    assert.equal(listing.product, 'Tomato');
    assert.equal(listing.location, 'Ghaziabad');
    assert.equal(listing.farmer_name, 'Ramesh');
    assert.equal(listing.quantity, 100);
    assert.equal(listing.asking_price, 30);
    assert.equal(result.state, STATES.CONFIRMING);
    assert.equal(submits.length, 0);
  });

  it('price: "Nahi, 30 nahi 35 rupaye kilo" stores 35 and keeps the other fields', async () => {
    const sid = await setupConfirmed('price-pair');
    const result = await processTurn(sid, 'Nahi, 30 nahi 35 rupaye kilo');
    const listing = listingOf(sid);

    assert.equal(listing.asking_price, 35, `price must become 35 (got ${listing.asking_price})`);
    assert.equal(listing.price_unit, 'kg');
    assert.equal(listing.quantity, 100, 'quantity must not be rewritten from the old number');
    assert.equal(listing.product, 'Tomato');
    assert.equal(listing.location, 'Ghaziabad');
    assert.equal(listing.quality, 'Grade A');
    assert.equal(result.state, STATES.CONFIRMING);
    assert.equal(submits.length, 0);
  });

  it('phone: "Nahi, 9876543210 nahi 9123456780" stores the new number only', async () => {
    const sid = await setupConfirmed('phone-pair');
    const result = await processTurn(sid, 'Nahi, 9876543210 nahi 9123456780');
    const listing = listingOf(sid);

    assert.equal(listing.phone, '9123456780', `phone must become 9123456780 (got ${listing.phone})`);
    assert.equal(listing.quantity, 100, 'a phone pair must not touch quantity');
    assert.equal(listing.asking_price, 30, 'a phone pair must not touch price');
    assert.equal(listing.location, 'Ghaziabad');
    assert.equal(listing.farmer_name, 'Ramesh');
    assert.equal(result.state, STATES.CONFIRMING);
    assert.equal(submits.length, 0);
  });
});

describe('existing behaviour stays intact', () => {
  it('Grade A / B / C are parsed in both word orders', () => {
    assert.equal(parseGradeAnswer('Grade A', true), 'Grade A');
    assert.equal(parseGradeAnswer('B grade', true), 'Grade B');
    assert.equal(parseGradeAnswer('quality C', true), 'Grade C');
    assert.equal(parseGradeAnswer('Grade C', true), 'Grade C');
    assert.equal(parseGradeAnswer('namaste', true), null);
  });

  it('a greeting starts the conversation without inventing data', async () => {
    submits = [];
    const sid = 'cf-greeting-1';
    createSession(sid);
    const result = await processTurn(sid, 'Namaste');
    assert.equal(result.state, STATES.LISTENING);
    assert.match(result.agent_message, /Namaste/);
    assert.equal(submits.length, 0);
  });

  it('asks exactly one question at a time and never the confirmation summary', async () => {
    submits = [];
    const sid = 'cf-one-question-1';
    createSession(sid);
    const result = await processTurn(sid, 'tamatar');
    assert.equal(result.state, STATES.ASKING);
    const questions = (String(result.agent_message).match(/\?/g) || []).length;
    assert.ok(questions <= 1, `expected at most one question, got ${questions}: ${result.agent_message}`);
    assert.ok(!/ek baar dekh lo|just to confirm/i.test(result.agent_message), 'must not jump to confirmation');
    assert.equal(submits.length, 0);
  });
});

describe('Twilio turn', () => {
  const fakeResponse = () => {
    const res = {
      statusCode: null,
      headers: null,
      body: '',
      writableEnded: false,
      writeHead(status, headers) {
        this.statusCode = status;
        this.headers = headers;
      },
      end(chunk) {
        this.body = String(chunk ?? '');
        this.writableEnded = true;
      },
    };
    return res;
  };

  const twilioTurn = async (callSid, speech) => {
    const request = new EventEmitter();
    const response = fakeResponse();
    const body = new URLSearchParams({ CallSid: callSid, SpeechResult: speech }).toString();
    const handled = handleSpeechResult(request, response);
    request.emit('data', Buffer.from(body));
    request.emit('end');
    await handled;
    assert.equal(response.statusCode, 200, 'every webhook must be answered');
    return response.body;
  };

  it('drives the whole call: continuing Gather with speechTimeout="3", one listing, then hangup', async () => {
    submits = [];
    const callSid = 'CF-CALL-TWILIO-1';

    const first = await twilioTurn(callSid, 'Namaste');
    assert.match(first, /<Gather /, 'continuing turns must ask with a Gather');
    assert.match(first, /speechTimeout="3"/, 'speechTimeout must be 3 seconds (was 5 — dominant dead-air term)');
    assert.match(first, /speechModel="phone_call"/);
    assert.match(first, /<\/Gather>\s*<Redirect/, 'Gather must never be the last verb');

    for (const turn of COLLECT.slice(1)) {
      const twiml = await twilioTurn(callSid, turn);
      assert.match(twiml, /<Gather /, `turn "${turn}" must keep the call alive with a Gather`);
      assert.ok(!twiml.includes('<Hangup'), `turn "${turn}" must not hang up`);
      assert.equal(submits.length, 0, `turn "${turn}" must not create a listing`);
    }

    const confirmTwiml = await twilioTurn(callSid, 'Haan, sab theek hai.');
    assert.ok(!confirmTwiml.includes('<Gather'), 'the confirmed turn is terminal');
    assert.match(confirmTwiml, /<Hangup\/>/, 'the confirmed turn must end the call');
    assert.equal(submits.length, 1, 'exactly one listing for the whole call');
    assert.equal(submits[0].product, 'Tomato');
    assert.equal(submits[0].quantity, 100);

    const retried = await twilioTurn(callSid, 'Haan');
    assert.ok(retried.includes('<?xml'), 'the retried webhook must still be answered');
    assert.equal(submits.length, 1, 'a retried webhook must never create a second listing');
  });
});
