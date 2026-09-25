// Twilio voice adapter for FarmDirect
// Reuses the existing conversation manager (processTurn, etc.) without modifying it.

import { processTurn, createSession, getSession, deleteSession, STATES, EMPTY_LISTING } from './conversationManager.mjs';
// NOTE: createListing() is intentionally NOT imported. The listing is created
// only by the conversation manager itself (submitListing inside processTurn);
// the adapter never writes a listing to Firestore.

const HANDLE_ACTION = 'https://disown-retying-absentee.ngrok-free.dev/api/twilio/handle';

const callSidToSessionId = new Map();
const callSidProcessing = new Map(); // adapter-only turn guard

const readBody = (request) => {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
};

const parseFormBody = async (body) => {
  const params = new URLSearchParams(body);
  const obj = {};
  for (const [key, value] of params) {
    obj[key] = value;
  }
  return obj;
};

const escapeXml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

// --- Centralised TwiML builders -------------------------------------------------
// Every continuing Gather goes through buildSayGather():
//   - input="speech", language="hi-IN", explicit speechTimeout, timeout="8"
//   - absolute /api/twilio/handle action URL
//   - actionOnEmptyResult="true" so a Gather timeout still POSTs an empty
//     SpeechResult to /api/twilio/handle, where the adapter re-prompts instead
//     of the call silently ending
//   - a <Redirect> AFTER </Gather> so a continuing Gather is NEVER the last
//     verb in <Response>
const buildSayGather = (message, action = HANDLE_ACTION, method = 'POST') => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${action}" method="${method}" timeout="8" speechTimeout="5" speechModel="phone_call" language="hi-IN" enhanced="true" finishOnKey="#" actionOnEmptyResult="true">
    <Say language="hi-IN">${escapeXml(message)}</Say>
  </Gather>
  <Redirect method="${method}">${action}</Redirect>
</Response>`;
};

const buildSayAndHangup = (message) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="hi-IN">${escapeXml(message)}</Say>
  <Hangup/>
</Response>`;
};

// Re-prompt: repeat the conversation manager's last agent question so a
// timeout/echo/duplicate never loses the turn. Falls back to the original
// product/greeting prompts for a brand-new session.
const lastAgentQuestion = (sessionObj) => {
  const turns = sessionObj?.turns;
  if (Array.isArray(turns)) {
    for (let i = turns.length - 1; i >= 0; i--) {
      if (turns[i]?.role === 'agent' && turns[i]?.text) return turns[i].text;
    }
  }
  return null;
};

const buildReprompt = (sessionId) => {
  const sessionObj = getSession(sessionId);
  const prompt = lastAgentQuestion(sessionObj)
    || (sessionObj?.listing?.product
      ? 'Achha ji. Aapka naam kya hai ji?'
      : 'Namaste ji, FarmDirect se bol raha hoon. Aap kya bechna chahte hain ji?');
  return buildSayGather(prompt);
};

// --- Adapter-only listing preserve/restore ------------------------------------
// The manager's extraction can clear a field the caller was NOT answering (e.g.
// answering "Diya" for the name question makes the bare-word product heuristic
// fill product, which the manager then clears). The manager stays the single
// source of truth: we only put a field back when ALL of these hold:
//   (a) it held a valid value BEFORE this turn,
//   (b) it is empty AFTER this turn,
//   (c) it is not the field the caller was answering (prev last_asked), and
//   (d) the utterance is not an explicit correction that produced no parsed
//       value anywhere (then we step aside and let the manager re-ask).
// A value the manager just set/changed is never overwritten, so intentional
// corrections always win. No comparison against agent_message is made.
const RESTORE_FIELDS = ['product', 'farmer_name', 'quantity', 'unit', 'location', 'quality', 'asking_price', 'price_unit', 'phone', 'intent'];

const isEmptyFieldValue = (value) => value === null || value === undefined || (typeof value === 'string' && value.trim() === '');

// Mirrors the manager's own isCorrectionText() so an interruption/correction
// utterance ("Aalu nahi, Pyaaj", "Nahi, 25") is recognised the same way here.
const CORRECTION_MARKERS = /^(nahi|nahin|no|nope|galat|wrong|wait|actually|arre|arey|oops|sorry)\b|\b(galat|wrong|change|badal|nahi\s*,|actually\s*,|arre\s*,|arey\s*,|not\s+\d|sorry)\b/i;
const isCorrectionUtterance = (text) => CORRECTION_MARKERS.test(String(text ?? '').trim());

const snapshotTurnState = (sessionId) => {
  const sessionObj = getSession(sessionId);
  if (!sessionObj) return null;
  return { listing: { ...(sessionObj.listing || {}) }, last_asked: sessionObj.last_asked ?? null };
};

const restoreWipedFields = (snapshot, sessionId, utterance) => {
  if (!snapshot) return [];
  const sessionObj = getSession(sessionId);
  if (!sessionObj || !sessionObj.listing) return [];
  // Distinguish a correction/interruption from a normal next-field answer.
  // If the correction produced no parsed value anywhere, it is ambiguous — do
  // not resurrect old values, let the manager re-ask the field instead. If it
  // did produce a value, that value already wins via the "empty after" check
  // below and unrelated wiped fields are restored as usual.
  if (isCorrectionUtterance(utterance)) {
    const producedValue = RESTORE_FIELDS.some(
      (field) => !isEmptyFieldValue(sessionObj.listing[field]) && sessionObj.listing[field] !== snapshot.listing[field],
    );
    if (!producedValue) return [];
  }
  const restored = [];
  for (const field of RESTORE_FIELDS) {
    if (isEmptyFieldValue(snapshot.listing[field])) continue;    // was not valid before this turn
    if (!isEmptyFieldValue(sessionObj.listing[field])) continue; // manager set/kept a value — new value wins
    if (snapshot.last_asked === field) continue;                 // caller was answering this field
    sessionObj.listing[field] = snapshot.listing[field];
    restored.push(field);
  }
  return restored;
};

// Snapshot → processTurn → restore only unexpectedly-cleared fields. If the
// manager is now re-asking for a field we just put back, the restored value is
// handed straight back to processTurn so the manager itself derives the correct
// next question (never a second state machine / no duplicated conversation
// logic, no direct Firestore access).
const isTerminalTurnState = (state) => state === STATES.SUCCESS || state === STATES.SUBMITTING || state === STATES.CANCELLED;

export const processTurnPreservingFields = async (sessionId, utterance) => {
  const snapshot = snapshotTurnState(sessionId);
  let turnResult = await processTurn(sessionId, utterance);
  const restored = restoreWipedFields(snapshot, sessionId, utterance);
  if (restored.length) {
    console.log('[TWILIO] Restored unexpectedly cleared field(s):', restored, { sessionId });
    const sessionObj = getSession(sessionId);
    const askField = sessionObj && restored.includes(sessionObj.last_asked) ? sessionObj.last_asked : null;
    if (askField && !isTerminalTurnState(turnResult?.state)) {
      console.log('[TWILIO] Re-establishing turn through processTurn for restored field:', { askField, sessionId });
      const reAskSnapshot = snapshotTurnState(sessionId);
      turnResult = await processTurn(sessionId, String(snapshot.listing[askField]));
      restoreWipedFields(reAskSnapshot, sessionId, null);
    }
    const liveSession = getSession(sessionId);
    if (liveSession?.listing) turnResult = { ...turnResult, listing: { ...liveSession.listing } };
  }
  return turnResult;
};

export const handleIncomingCall = async (request, response) => {
  try {
    console.log('[TWILIO] Incoming call webhook received');
    const body = await readBody(request);
    const form = await parseFormBody(body);
    const callSid = form.CallSid;

    // Create a new session for this call if we don't have one
    let sessionId = callSidToSessionId.get(callSid);
    if (!sessionId) {
      const session = createSession(callSid); // This also stores the session in the conversation manager's map
      sessionId = session.id;
      callSidToSessionId.set(callSid, sessionId);
    }

    // Play the greeting and then gather speech
    const twiml = buildSayGather('Namaste ji, FarmDirect se bol raha hoon. Aap kya bechna chahte hain ji?');

    response.writeHead(200, { 'Content-Type': 'text/xml; charset=utf-8' });
    response.end(twiml);
  } catch (err) {
    console.error('[TWILIO] Error in incoming call:', err);
    // Never silently drop the call: apologise, then keep a continuing Gather.
    const twiml = buildSayGather('Kshama kijiye, kuch samasya aa gayi. Dhanyavaad.');
    if (!response.writableEnded) {
      response.writeHead(200, { 'Content-Type': 'text/xml; charset=utf-8' });
      response.end(twiml);
    }
  }
};

export const handleSpeechResult = async (request, response) => {
  let callSid;
  let sessionId;
  let guardAcquired = false;
  try {
    console.log('[TWILIO] Speech result webhook received');
    const body = await readBody(request);
    const form = await parseFormBody(body);
    callSid = form.CallSid;
    const speechResult = form.SpeechResult || '';

    // Resolve (or create) the per-call session first, so every branch below can
    // answer this CallSid with a valid continuing Gather.
    sessionId = callSidToSessionId.get(callSid);
    // If for some reason we don't have a session, create one (should not happen in normal flow)
    if (!sessionId) {
      const session = createSession(callSid); // This also stores the session in the conversation manager's map
      sessionId = session.id;
      callSidToSessionId.set(callSid, sessionId);
    }

    console.log('[TWILIO] Callback state:', {
      callSid,
      sessionId,
      speechResult,
      callSidProcessing: callSidProcessing.get(callSid) === true,
      sessionState: getSession(sessionId)?.state ?? null,
    });

    // Adapter-only guard: ignore very short fragment artifacts (echo from prompt playback).
    // NOTE: "Dear." is NOT a fragment — live Hindi STT returns it for real caller
    // speech (e.g. a name), so it must reach processTurn().
    if (!speechResult || /^(Al|Be|K|The|Desk|I|See|Skill)\.?$/i.test(speechResult.trim())) {
      console.log('[TWILIO] Fragment/empty result re-prompt for', callSid);
      response.writeHead(200, { 'Content-Type': 'text/xml; charset=utf-8' });
      response.end(buildReprompt(sessionId));
      return;
    }

    // Adapter-only guard: ignore overlapping / echo callbacks.
    // Duplicate protection stays (processTurn is NOT called), but the request
    // must still receive TwiML — an unanswered request makes Twilio drop the call.
    if (callSidProcessing.get(callSid)) {
      console.log('[TWILIO] Overlapping Gather result ignored for', callSid);
      response.writeHead(200, { 'Content-Type': 'text/xml; charset=utf-8' });
      response.end(buildReprompt(sessionId));
      return;
    }
    callSidProcessing.set(callSid, true);
    guardAcquired = true;

    // Adapter-only duplicate-turn guard: skip processTurn if caller repeats an already-set field
    // (echo/duplicate Gather result from old Gather), not interruption.
    let duplicateSkip = false;
    try {
      const sessionObj = getSession(sessionId);
      if (sessionObj && sessionObj.listing) {
        const norm = speechResult.trim().toLowerCase().replace(/[.,!?;:()]/g, '');
        const fields = { product: sessionObj.listing.product, farmer_name: sessionObj.listing.farmer_name, location: sessionObj.listing.location, quality: sessionObj.listing.quality, asking_price: String(sessionObj.listing.asking_price ?? ''), phone: sessionObj.listing.phone };
        for (const [k, v] of Object.entries(fields)) {
          if (v && norm === String(v).toLowerCase().replace(/[.,!?;:()]/g, '')) {
            duplicateSkip = true;
            break;
          }
        }
      }
    } catch (e) { /* ignore session read errors */ }
    console.log('[TWILIO] duplicateSkip:', duplicateSkip, { callSid, sessionId, speechResult });
    if (duplicateSkip) {
      response.writeHead(200, { 'Content-Type': 'text/xml; charset=utf-8' });
      response.end(buildReprompt(sessionId));
      return;
    }

    // Adapter-only: normalize natural affirmative confirmation phrases for phone
    // Only during confirmation stage, and only when text is clearly affirmative.
    let processedSpeech = speechResult;
    try {
      const sessionObj = getSession(sessionId);
      if (sessionObj && (sessionObj.confirmation_stage === 'confirmation' || sessionObj.confirmation_stage === 'changes' || sessionObj.confirmation_stage === null && sessionObj.state === 'CONFIRMING' || sessionObj.listing?.quality && sessionObj.listing?.asking_price && sessionObj.listing?.phone)) {
        const lower = speechResult.trim().toLowerCase();
        if (/\b(haan|ji\s*haan|bilkul|theek|sahi|ok)\b/i.test(lower) && !/\b(nahi|nahin|no|galat|badal)\b/i.test(lower)) {
          // Normalize common natural confirmations to canonical form manager expects
          if (/\bsab\s+theek\b/i.test(lower) || /\bhaan\s+sab\b/i.test(lower)) processedSpeech = 'haan sab theek hai';
          else if (/\bji\s+haan\b/i.test(lower)) processedSpeech = 'ji haan';
          else if (/\bbilkul\s+theek\b/i.test(lower)) processedSpeech = 'bilkul theek hai';
          else if (/\btheek\s+hai\b/i.test(lower)) processedSpeech = 'theek hai';
          else if (/\bhaan\b/i.test(lower)) processedSpeech = 'haan';
        }
      }
    } catch (e) { /* ignore */ }

    // Process the utterance through the existing conversation manager, wrapped
    // with adapter-only preserve/restore (see processTurnPreservingFields).
    console.log('[TWILIO] Calling processTurn with:', {
      sessionId,
      speechResult: processedSpeech,
    });
    const turnResult = await processTurnPreservingFields(sessionId, processedSpeech);
    console.log('[TWILIO] processTurn result:', { callSid, state: turnResult?.state, agent_message: turnResult?.agent_message, sessionId });

    let twiml;
    switch (turnResult.state) {
      case STATES.ASKING:
        // Ask the next question
        twiml = buildSayGather(turnResult.agent_message || 'Aap kya kehna chahte hain?');
        break;
      case STATES.CONFIRMING:
        // Ask for confirmation
        twiml = buildSayGather(turnResult.agent_message || 'Aap kya kehna chahte hain?');
        break;
      case STATES.SUCCESS:
        // Terminal state. The manager itself created/submitted the listing —
        // processTurn() awaits submitListing() before returning SUCCESS — so the
        // adapter must NOT create it again (no createListing(), no Firestore
        // write). Use the manager result as the source of truth: only speak the
        // final success message and end the call.
        console.log('[TWILIO] SUCCESS terminal:', {
          callSid,
          listing_id: turnResult.listing_id ?? null,
          sessionId,
        });
        twiml = buildSayAndHangup('Dhanyawaad ji! Aapki listing successfully create ho gayi hai. Dhanyawaad!');
        callSidToSessionId.delete(callSid);
        // Manager session is left in place on purpose (it already holds the
        // submitted listing); deleteSession(sessionId) is intentionally not called.
        break;
      case STATES.ERROR:
        // Error state: apologize, then keep the call alive with a retry Gather
        // (never silently drop the call). Session is kept so the caller can retry.
        twiml = buildSayGather(
          'Kshama kijiye, kuch samasya aa gayi. Kripya dobara koshish karein.'
        );
        break;
      default:
        // Any other state (e.g. transition) — keep asking using existing manager message
        twiml = buildSayGather(turnResult.agent_message || 'Aap kya kehna chahte hain?');
        break;
    }

    response.writeHead(200, { 'Content-Type': 'text/xml; charset=utf-8' });
    response.end(twiml);
    console.log('[TWILIO] TwiML branch:', turnResult.state, {
      callSid,
      hasGather: twiml.includes('<Gather'),
      hasHangup: twiml.includes('<Hangup'),
      gatherIsLastVerb: /<\/Gather>\s*<\/Response>\s*$/.test(twiml),
    });
  } catch (err) {
    console.error('[TWILIO] Error in speech result:', err);
    console.error('[TWILIO] Error stack:', err?.stack);
    // Adapter-only retry: always answer with valid TwiML, never hang up on a
    // transient error. Do NOT delete the session; allow retry.
    try {
      if (!response.writableEnded) {
        const retryTwiml = buildSayGather('Kshama kijiye, kuch samasya aa gayi. Kripya dobara koshish karein.');
        response.writeHead(200, { 'Content-Type': 'text/xml; charset=utf-8' });
        response.end(retryTwiml);
      }
    } catch (e) {
      console.error('[TWILIO] Failed to send retry TwiML:', e);
    }
  } finally {
    // Always release the per-call turn guard when this request acquired it,
    // so the next Gather callback is never blocked or left unanswered.
    if (guardAcquired && callSid) callSidProcessing.delete(callSid);
  }
};