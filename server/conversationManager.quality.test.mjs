// Regression tests for the quality/grade answer parsing bug.
//
// Symptom: the agent asked "Aapke maal ki quality kya hai ji? Grade A, B ya C?"
// forever. Answers such as "A grade", "quality A", "grade, a", "grade-a" were
// dropped (the old regex only accepted `grade <letter>` in that exact order),
// quality stayed null and the engine re-asked the same question on every turn.
//
// Run: node --test server/conversationManager.quality.test.mjs

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

let listingIdCounter = 5000;
globalThis.fetch = async (url, options) => {
  if (url.includes('/api/listings')) {
    const listing_id = `ls-${listingIdCounter++}`;
    return {
      status: 201,
      json: async () => ({ success: true, listing_id, data: JSON.parse(options.body) }),
    };
  }
  throw new Error(`Unexpected fetch call to ${url}`);
};

import {
  processTurn,
  createSession,
  deleteSession,
  normalizeGradeSpeech,
  parseGradeAnswer,
  isPureGradeAnswer,
} from './conversationManager.mjs';

// Speech-to-text shapes the old parser rejected. `letter` is what the engine
// must store for every one of them.
const GRADE_UTTERANCES = [
  ['Grade A', 'Grade A'],
  ['grade a', 'Grade A'],
  ['A grade', 'Grade A'],
  ['quality A', 'Grade A'],
  ['A', 'Grade A'],
  ['Grade A.', 'Grade A'],
  ['grade, a', 'Grade A'],
  ['grade-a', 'Grade A'],
  ['grade ay', 'Grade A'],
  ['B grade', 'Grade B'],
  ['quality B', 'Grade B'],
  ['quality C', 'Grade C'],
  ['Grade C', 'Grade C'],
  // "ग्रेड ए" (Devanagari for "grade A")
  ['ग्रेड ए', 'Grade A'],
];

// Every answer must resolve to a grade value.
describe('parseGradeAnswer', () => {
  for (const [utterance, expected] of GRADE_UTTERANCES) {
    it(`accepts "${utterance}" while the quality question is pending`, () => {
      assert.equal(parseGradeAnswer(utterance, true), expected);
    });
  }

  it('accepts reordered/punctuated forms even without the question pending', () => {
    for (const utterance of ['Grade A', 'A grade', 'quality B', 'grade, a', 'grade-a']) {
      assert.notEqual(parseGradeAnswer(utterance, false), null, `"${utterance}" must parse`);
    }
  });

  it('never accepts a bare letter when quality was NOT asked', () => {
    for (const letter of ['A', 'B', 'C', 'a', 'b', 'c']) {
      assert.equal(parseGradeAnswer(letter, false), null, `"${letter}" must not parse unasked`);
    }
    assert.equal(parseGradeAnswer('A', true), 'Grade A');
  });

  it('rejects non-grade speech (descriptors, greetings, numbers, names)', () => {
    const negatives = [
      'Quality achhi hai',
      'premium quality hai',
      'fresh and excellent',
      'Bdia quality hai',
      'quality best hai',
      'quality average hai',
      'Hello',
      'Mera naam Raj hai',
      '5 kilo',
      '30 rupaye',
      'Ghaziabad se hoon',
      'किसी को भेजना है',
      'बीमार हूँ',
    ];
    for (const text of negatives) {
      assert.equal(parseGradeAnswer(text, true), null, `"${text}" must not parse as a grade`);
      assert.equal(isPureGradeAnswer(text, true), false, `"${text}" must not be a pure grade turn`);
    }
  });
});

describe('normalizeGradeSpeech', () => {
  it('strips punctuation, ordering and casing', () => {
    assert.equal(normalizeGradeSpeech('Grade A.'), 'grade a');
    assert.equal(normalizeGradeSpeech('grade, a'), 'grade a');
    assert.equal(normalizeGradeSpeech('  GRADE-A  '), 'grade a');
    assert.equal(normalizeGradeSpeech('quality  A'), 'quality a');
  });
  it('maps Devanagari grade words/letters but not ordinary Hindi words', () => {
    assert.equal(normalizeGradeSpeech('ग्रेड ए'), 'grade a');
    assert.equal(normalizeGradeSpeech('ग्रेड बी'), 'grade b');
    assert.equal(normalizeGradeSpeech('बी'), 'b');
    assert.equal(normalizeGradeSpeech('किसी को भेजना है'), '');
    assert.equal(normalizeGradeSpeech('बीमार हूँ'), '');
  });
});

describe('isPureGradeAnswer', () => {
  it('is true only for grade-only utterances', () => {
    for (const [utterance] of GRADE_UTTERANCES) {
      assert.equal(isPureGradeAnswer(utterance, true), true, `"${utterance}" is grade-only`);
    }
    assert.equal(isPureGradeAnswer('Grade A', false), true, 'explicit grade phrase is always pure');
    assert.equal(isPureGradeAnswer('A', false), false, 'bare letter is only pure when asked');
    assert.equal(isPureGradeAnswer('10 kilo tamatar', true), false);
    assert.equal(isPureGradeAnswer('Ghaziabad se hoon', true), false);
  });
});

// Full conversation: the engine must accept the grade answer, store it, and
// move on to the next question instead of re-asking quality forever.
describe('quality answer ends the quality question', () => {
  let seq = 0;
  const drive = async (utterance) => {
    const sid = `q-ans-${seq++}`;
    deleteSession(sid);
    createSession(sid);
    const t1 = await processTurn(sid, 'Tamatar bechna hai');
    const t2 = await processTurn(sid, 'Mera naam Raj hai');
    const t3 = await processTurn(sid, 'Ghaziabad se hoon');
    const t4 = await processTurn(sid, '10 kilo');
    assert.equal(t4.next_field, 'quality', `setup: quality must be pending, got ${t4.next_field}`);
    const r = await processTurn(sid, utterance);
    return { before: t4.listing, r };
  };

  for (const [utterance, expected] of GRADE_UTTERANCES) {
    it(`"${utterance}" fills quality with ${expected} and asks the price next`, async () => {
      const { before, r } = await drive(utterance);

      assert.equal(r.listing.quality, expected, 'quality must be stored');
      assert.equal(r.missing_fields.includes('quality'), false, 'quality must not stay missing');

      // No more quality question — never the same prompt again.
      assert.equal(
        /(quality kya hai|quality kaisi hai|Grade A, B ya C|maal ki quality)/i.test(r.agent_message),
        false,
        `must not re-ask quality, got: ${r.agent_message}`
      );
      assert.equal(r.next_field, 'asking_price', `must advance to price, got ${r.next_field}`);
      assert.match(r.agent_message, /rupaye|price/i, `must ask the price, got: ${r.agent_message}`);

      // One question at a time.
      assert.ok((r.agent_message.match(/\?/g) || []).length <= 1, `only one question, got: ${r.agent_message}`);

      // Nothing else may change on a grade-only turn.
      assert.equal(r.listing.product, before.product, 'product preserved');
      assert.equal(r.listing.location, before.location, 'location preserved');
      assert.equal(r.listing.farmer_name, before.farmer_name, 'farmer name preserved');
      assert.equal(r.listing.quantity, before.quantity, 'quantity preserved');
    });
  }

  it('a grade answer never becomes the location or the farmer name', async () => {
    for (const utterance of ['B grade', 'quality C', 'grade ay', 'C']) {
      const { r } = await drive(utterance);
      assert.notEqual(r.listing.location, 'B Grade', `"${utterance}" must not set location`);
      assert.notEqual(r.listing.location, 'Grade C', `"${utterance}" must not set location`);
      assert.notEqual(r.listing.location, 'C', `"${utterance}" must not set location`);
      assert.equal(r.listing.farmer_name, 'Raj', 'farmer name must stay Raj');
      assert.equal(r.listing.location, 'Ghaziabad', 'location must stay Ghaziabad');
    }
  });

  it('a bare letter is ignored while a different question is pending', async () => {
    const sid = 'q-bare-not-asked';
    deleteSession(sid);
    createSession(sid);
    await processTurn(sid, 'Tamatar bechna hai');
    const r = await processTurn(sid, 'A'); // name question is pending, not quality
    assert.equal(r.listing.quality, null, 'quality must stay unset');
    assert.equal(r.next_field, 'farmer_name', 'the pending name question stays pending');
  });

  it('repeated quality answers still work during a correction', async () => {
    const sid = 'q-correction';
    deleteSession(sid);
    createSession(sid);
    await processTurn(sid, 'Tamatar bechna hai, mera naam Raj hai, Ghaziabad se hoon, 10 kilo, Grade B, 30 rupaye kilo, 9876543210.');
    const r = await processTurn(sid, 'Nahi, A grade hai.');
    assert.equal(r.listing.quality, 'Grade A', 'corrected grade must be stored');
    assert.equal(r.listing.product, 'Tomato');
    assert.equal(r.listing.location, 'Ghaziabad');
  });
});
