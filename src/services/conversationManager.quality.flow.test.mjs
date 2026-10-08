// Regression tests for the quality/grade answer bug in the LIVE /farmer/voice
// engine (the frontend copy — src/services/conversationManager.ts, the same
// module VoiceAssistant.tsx uses).
//
// Symptom: after "Aapke maal ki quality kya hai ji? Grade A, B ya C?" the
// engine never accepted "A grade", "quality A", "grade, a", "grade-a" — the
// old patterns only matched `grade <letter>` in that exact order — so quality
// stayed null and the same question was repeated forever. A grade-only turn
// could also be stored as the location/farmer name ("B Grade").
//
// Run: node --test src/services/conversationManager.quality.flow.test.mjs

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const {
  sendConversationTurn,
  resetConversation,
  normalizeGradeSpeech,
  parseGradeAnswer,
  isPureGradeAnswer,
} = await import('./conversationManager.ts');

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

describe('parseGradeAnswer (frontend engine)', () => {
  for (const [utterance, expected] of GRADE_UTTERANCES) {
    it(`accepts "${utterance}" while the quality question is pending`, () => {
      assert.equal(parseGradeAnswer(utterance, true), expected);
    });
  }

  it('never accepts a bare letter when quality was NOT asked', () => {
    for (const letter of ['A', 'B', 'C']) {
      assert.equal(parseGradeAnswer(letter, false), null, `"${letter}" must not parse unasked`);
    }
    assert.equal(parseGradeAnswer('A', true), 'Grade A');
  });

  it('rejects non-grade speech', () => {
    const negatives = [
      'Quality achhi hai',
      'premium quality hai',
      'fresh and excellent',
      'Bdia quality hai',
      'quality best hai',
      'Hello',
      'Mera naam Raj hai',
      '5 kilo',
      'किसी को भेजना है',
      'बीमार हूँ',
    ];
    for (const text of negatives) {
      assert.equal(parseGradeAnswer(text, true), null, `"${text}" must not parse as a grade`);
      assert.equal(isPureGradeAnswer(text, true), false, `"${text}" must not be a grade-only turn`);
    }
  });
});

describe('normalizeGradeSpeech (frontend engine)', () => {
  it('strips punctuation, ordering and casing', () => {
    assert.equal(normalizeGradeSpeech('Grade A.'), 'grade a');
    assert.equal(normalizeGradeSpeech('grade, a'), 'grade a');
    assert.equal(normalizeGradeSpeech('  GRADE-A  '), 'grade a');
  });
  it('maps Devanagari grade answers but not ordinary Hindi words', () => {
    assert.equal(normalizeGradeSpeech('ग्रेड ए'), 'grade a');
    assert.equal(normalizeGradeSpeech('बी'), 'b');
    assert.equal(normalizeGradeSpeech('किसी को भेजना है'), '');
    assert.equal(normalizeGradeSpeech('बीमार हूँ'), '');
  });
});

// The engine must accept the grade answer, store it and move on to the price
// question instead of repeating the quality question forever.
describe('quality answer ends the quality question (frontend engine)', () => {
  let seq = 0;
  const drive = async (utterance) => {
    const sid = `web-q-${seq++}`;
    resetConversation(sid);
    // One turn fills everything except quality: name/location need a
    // preposition ("se") to survive together, exactly like a real utterance.
    const setup = await sendConversationTurn(sid, 'Main Raj hoon, Ghaziabad se hoon, 10 kilo tamatar');
    assert.equal(setup.next_field, 'quality', `setup: quality must be pending, got ${setup.next_field}`);
    const r = await sendConversationTurn(sid, utterance);
    return { before: setup.listing, r };
  };

  for (const [utterance, expected] of GRADE_UTTERANCES) {
    it(`"${utterance}" fills quality with ${expected} and asks the price next`, async () => {
      const { before, r } = await drive(utterance);

      assert.equal(r.listing.quality, expected, 'quality must be stored');
      assert.equal(r.missing_fields.includes('quality'), false, 'quality must not stay missing');

      assert.equal(
        /(quality kya hai|quality kaisi hai|Grade A, B ya C|maal ki quality)/i.test(r.agent_message),
        false,
        `must not re-ask quality, got: ${r.agent_message}`
      );
      assert.equal(r.next_field, 'asking_price', `must advance to price, got ${r.next_field}`);

      assert.ok((r.agent_message.match(/\?/g) || []).length <= 1, `only one question, got: ${r.agent_message}`);

      assert.equal(r.listing.product, before.product, 'product preserved');
      assert.equal(r.listing.location, before.location, 'location preserved');
      assert.equal(r.listing.farmer_name, before.farmer_name, 'farmer name preserved');
      assert.equal(r.listing.quantity, before.quantity, 'quantity preserved');
    });
  }

  it('a grade-only answer never becomes the location or the farmer name', async () => {
    for (const utterance of ['B grade', 'quality C', 'grade ay', 'C']) {
      const { r } = await drive(utterance);
      assert.equal(r.listing.location, 'Ghaziabad', `"${utterance}" must not overwrite the location`);
      assert.equal(r.listing.farmer_name, 'Raj', `"${utterance}" must not overwrite the farmer name`);
      assert.notEqual(r.listing.location, 'B Grade', 'grade text must never be stored as a place');
      assert.notEqual(r.listing.location, 'C', 'grade letter must never be stored as a place');
    }
  });

  it('a bare letter is ignored while a different question is pending', async () => {
    const sid = 'web-q-bare';
    resetConversation(sid);
    const setup = await sendConversationTurn(sid, 'Tamatar bechna hai');
    assert.equal(setup.next_field, 'farmer_name', `name question must be pending, got ${setup.next_field}`);
    const r = await sendConversationTurn(sid, 'A');
    assert.equal(r.listing.quality, null, 'quality must stay unset');
    assert.equal(r.next_field, 'farmer_name', 'the pending name question stays pending');
  });
});
