// Twilio voice adapter for FarmDirect
// Reuses the existing conversation manager (processTurn, etc.) without modifying it.

import { processTurn, createSession, getSession, STATES, SUCCESS_MESSAGE, isConfirmationAffirmative } from './conversationManager.mjs';
import { normalizeProduct } from './extractListingParser.mjs';
// NOTE: createListing() is intentionally NOT imported. The listing is created
// only by the conversation manager itself (submitListing inside processTurn);
// the adapter never writes a listing to Firestore.

const HANDLE_PATH = '/api/twilio/handle';

// Absolute callback URL for every continuing <Gather>. The public host changes
// with every tunnel and deployment, so it is never hardcoded. Resolved per call
// (never cached) so Vercel environment variables and the local .env loader
// behave identically, the same way delhiveryService.getConfig() does:
//   1. PUBLIC_BASE_URL, when set, wins - the escape hatch for a proxy whose
//      forwarded headers do not reflect the host Twilio actually dialled.
//   2. Otherwise derive it from the host Twilio itself used to reach us, which
//      needs no configuration at all for ngrok/cloudflared/Vercel.
//   3. Last resort, a relative path: Twilio resolves it against the request URL.
const resolveHandleAction = (request) => {
  const base = (process.env.PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');
  if (base) return `${base}${HANDLE_PATH}`;
  const headers = request?.headers ?? {};
  const forwardedHost = headers['x-forwarded-host'];
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || headers.host;
  if (host) {
    const hostname = String(host).split(',')[0].trim();
    const forwardedProto = headers['x-forwarded-proto'];
    // Default to https: a tunnel or Vercel always terminates TLS for us. Only a
    // local request is plain http, so that it stays curl-able by hand.
    const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto)
      || (/^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(hostname) ? 'http' : 'https');
    return `${proto}://${hostname}${HANDLE_PATH}`;
  }
  return HANDLE_PATH;
};

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
//   - absolute /api/twilio/handle action URL (see resolveHandleAction)
//   - actionOnEmptyResult="true" so a Gather timeout still POSTs an empty
//     SpeechResult to /api/twilio/handle, where the adapter re-prompts instead
//     of the call silently ending
//   - a <Redirect> AFTER </Gather> so a continuing Gather is NEVER the last
//     verb in <Response>
const buildSayGather = (message, request, method = 'POST') => {
  const action = resolveHandleAction(request);
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${action}" method="${method}" timeout="8" speechTimeout="3" speechModel="phone_call" language="hi-IN" enhanced="true" finishOnKey="#" actionOnEmptyResult="true">
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

// The manager's itemised confirmation summary ("Ek baar dekh lo... Sab sahi
// hai?") must never be replayed on a timeout/echo/duplicate: repeating it is
// what made the farmer think another confirmation was still pending.
const isConfirmationSummary = (text) => /ek baar dekh lo|just to confirm/i.test(String(text || ''));

const buildReprompt = (sessionId, request) => {
  const sessionObj = getSession(sessionId);
  const last = lastAgentQuestion(sessionObj);
  if (last && !isConfirmationSummary(last)) return buildSayGather(last, request);
  if (sessionObj?.state === STATES.CONFIRMING || isConfirmationSummary(last)) {
    return buildSayGather('Ji, agar sab sahi hai toh haan bol dijiye.', request);
  }
  const prompt = sessionObj?.listing?.product
    ? 'Achha ji. Aapka naam kya hai ji?'
    : 'Namaste ji, FarmDirect se bol raha hoon. Aap kya bechna chahte hain ji?';
  return buildSayGather(prompt, request);
};

// --- Adapter role ---------------------------------------------------------------
// Thin transport only: TwiML build/parse, per-call guards (fragment / overlap /
// duplicate), and one processTurn() call per user utterance. All conversation
// state — field order, questions, corrections, confirmation and listing
// creation — lives in conversationManager.mjs (processTurn is the single
// source of truth; this file runs it exactly once per turn).

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
    const twiml = buildSayGather('Namaste ji, FarmDirect se bol raha hoon. Aap kya bechna chahte hain ji?', request);

    response.writeHead(200, { 'Content-Type': 'text/xml; charset=utf-8' });
    response.end(twiml);
  } catch (err) {
    console.error('[TWILIO] Error in incoming call:', err);
    // Never silently drop the call: apologise, then keep a continuing Gather.
    const twiml = buildSayGather('Kshama kijiye, kuch samasya aa gayi. Dhanyavaad.', request);
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
      response.end(buildReprompt(sessionId, request));
      return;
    }

    // Adapter-only guard: ignore overlapping / echo callbacks.
    // Duplicate protection stays (processTurn is NOT called), but the request
    // must still receive TwiML — an unanswered request makes Twilio drop the call.
    if (callSidProcessing.get(callSid)) {
      console.log('[TWILIO] Overlapping Gather result ignored for', callSid);
      response.writeHead(200, { 'Content-Type': 'text/xml; charset=utf-8' });
      response.end(buildReprompt(sessionId, request));
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
        // Canonical product duplicate: a raw echo such as "Aalu" must match the
        // stored canonical product ("Potato") — normalizeProduct() is the
        // parser's existing vocabulary. Only single-word utterances are
        // canonicalized, so a genuine multi-field turn (e.g. a correction that
        // also mentions the product) is never swallowed.
        const words = norm.split(/\s+/).filter(Boolean);
        const canonSpeechProduct = words.length === 1
          ? String(normalizeProduct(norm) || '').toLowerCase()
          : '';
        const fields = { product: sessionObj.listing.product, farmer_name: sessionObj.listing.farmer_name, location: sessionObj.listing.location, quality: sessionObj.listing.quality, asking_price: String(sessionObj.listing.asking_price ?? ''), phone: sessionObj.listing.phone };
        for (const [k, v] of Object.entries(fields)) {
          const normValue = String(v).toLowerCase().replace(/[.,!?;:()]/g, '');
          if (v && (norm === normValue || (k === 'product' && canonSpeechProduct && canonSpeechProduct === normValue))) {
            duplicateSkip = true;
            break;
          }
        }
      }
    } catch (e) { /* ignore session read errors */ }
    console.log('[TWILIO] duplicateSkip:', duplicateSkip, { callSid, sessionId, speechResult });
    if (duplicateSkip) {
      response.writeHead(200, { 'Content-Type': 'text/xml; charset=utf-8' });
      response.end(buildReprompt(sessionId, request));
      return;
    }

    // Adapter-only: canonicalise a natural affirmative to "haan" before it
    // reaches the manager. Gated on the manager's own matcher so a turn that
    // also carries field data ("theek hai, quantity 15 kilo") is NEVER rewritten
    // into a bare yes — it must reach processTurn() as the correction it is.
    let processedSpeech = speechResult;
    try {
      const sessionObj = getSession(sessionId);
      if (sessionObj?.state === STATES.CONFIRMING && isConfirmationAffirmative(speechResult)) {
        processedSpeech = 'haan';
      }
    } catch (e) { /* ignore */ }

    // Process the utterance through the conversation manager — exactly one
    // processTurn() call per user turn (no wrapper, no second state machine).
    console.log('[TWILIO] Calling processTurn with:', {
      sessionId,
      speechResult: processedSpeech,
    });
    const turnResult = await processTurn(sessionId, processedSpeech);
    console.log('[TWILIO] processTurn result:', { callSid, state: turnResult?.state, agent_message: turnResult?.agent_message, sessionId });

    let twiml;
    switch (turnResult.state) {
      case STATES.ASKING:
        // Ask the next question
        twiml = buildSayGather(turnResult.agent_message || 'Aap kya kehna chahte hain?', request);
        break;
      case STATES.CONFIRMING:
        // Ask for confirmation
        twiml = buildSayGather(turnResult.agent_message || 'Aap kya kehna chahte hain?', request);
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
        twiml = buildSayAndHangup(turnResult.agent_message || SUCCESS_MESSAGE);
        callSidToSessionId.delete(callSid);
        // Manager session is left in place on purpose (it already holds the
        // submitted listing); deleteSession(sessionId) is intentionally not called.
        break;
      case STATES.ERROR:
        // Error state: apologize, then keep the call alive with a retry Gather
        // (never silently drop the call). Session is kept so the caller can retry.
        twiml = buildSayGather(
          'Kshama kijiye, kuch samasya aa gayi. Kripya dobara koshish karein.',
          request
        );
        break;
      default:
        // Any other state (e.g. transition) — keep asking using existing manager message
        twiml = buildSayGather(turnResult.agent_message || 'Aap kya kehna chahte hain?', request);
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
        const retryTwiml = buildSayGather('Kshama kijiye, kuch samasya aa gayi. Kripya dobara koshish karein.', request);
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