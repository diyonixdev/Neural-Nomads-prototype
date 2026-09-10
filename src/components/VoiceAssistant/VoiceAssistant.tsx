import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Loader2,
  Sparkles,
  Square,
  AlertCircle,
  Volume2,
  Search,
  Brain,
  Store,
  CheckCircle2,
  Keyboard,
  XCircle,
  ClipboardList,
} from 'lucide-react';
import { useDemo } from '../../context/DemoContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { createVoiceAgent, buildFinalListing } from '../../services/voiceAgentCore';
import type { ProcessTurnResult, SubmitListingResult, FinalListing } from '../../services/voiceAgentCore';
import type { ListingData } from '../../services/conversationManager';
import { parseVoiceIntent } from '../../services/aiService';
import type { ParsedVoiceIntent } from '../../services/aiService';

// Transport-agnostic core — no browser APIs, no UI logic.
const voiceAgent = createVoiceAgent();

interface VoiceAssistantProps {
  mode: 'consumer' | 'farmer';
  onParsedResult?: (data: ParsedVoiceIntent, originalText: string) => void;
  onProceed?: () => void;
}

type AssistantPhase = 'idle' | 'listening' | 'understanding' | 'searching' | 'responding' | 'speaking' | 'error';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const hasSpeechRecognition = () =>
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

const hasSpeechSynthesis = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

const detectResponseLanguage = (text: string): 'hi' | 'en' => {
  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  if (hasDevanagari) return 'hi';
  const lower = text.toLowerCase();
  if (/(ji\b|aap\b|haan|nahi|theek|rupaye|chahte|chahenge|kitne|kitna|naam|bataiye|kahan|kilo hai|bechna|ho gaya|ek baar)/.test(lower)) {
    return 'hi';
  }
  return 'en';
};

const getPreferredVoice = (lang: 'hi' | 'en'): SpeechSynthesisVoice | null => {
  if (!hasSpeechSynthesis()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const langCodes = lang === 'hi' ? ['hi-IN', 'hi'] : ['en-IN', 'en-US', 'en-GB', 'en'];
  for (const code of langCodes) {
    const v = voices.find((voice) => voice.lang.toLowerCase().startsWith(code.toLowerCase()));
    if (v) return v;
  }
  const googleHi = voices.find((v) => /hindi|google.*hi/i.test(`${v.name} ${v.lang}`));
  if (lang === 'hi' && googleHi) return googleHi;
  const googleEn = voices.find((v) => /google.*english|google.*india/i.test(`${v.name} ${v.lang}`));
  if (googleEn) return googleEn;
  return voices[0] ?? null;
};

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ mode, onParsedResult, onProceed }) => {
  const { language, setParsedIntent, setAssistantResponse, setLastSpokenText } = useDemo();
  void onProceed;

  const [phase, setPhase] = useState<AssistantPhase>('idle');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [typedInput, setTypedInput] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [resultSummary, setResultSummary] = useState<string | null>(null);

  const [convResult, setConvResult] = useState<ProcessTurnResult | null>(null);
  const [convState, setConvState] = useState<ProcessTurnResult['state']>('IDLE');
  const [finalListing, setFinalListing] = useState<FinalListing | null>(null);
  const [listingId, setListingId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>(() => voiceAgent.createSession());
  const [submitting, setSubmitting] = useState(false);

  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>('');
  const interimRef = useRef<string>('');
  const silenceTimeoutRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);
  const sessionIdRef = useRef<string>(sessionId);
  // Mirrors of isSpeaking/phase so recognition callbacks (created once per
  // listening session) can check the CURRENT values synchronously.
  const isSpeakingRef = useRef(false);
  const phaseRef = useRef<AssistantPhase>('idle');
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const getEffectiveSTTLang = useCallback((): string => {
    return language === 'hi' ? 'hi-IN' : 'en-IN';
  }, [language]);

  const clearSilenceTimeout = useCallback(() => {
    if (silenceTimeoutRef.current !== null) {
      window.clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (hasSpeechSynthesis()) {
      window.speechSynthesis.cancel();
      isSpeakingRef.current = false; // sync mirror immediately for mic guards
      setIsSpeaking(false);
    }
  }, []);

  // Hard-stop the microphone while the assistant talks. Speech recognition
  // must capture ONLY the farmer; the assistant's own TTS output must never be
  // transcribed and fed back into the parser.
  const suppressRecognition = useCallback(() => {
    clearSilenceTimeout();
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.onresult = null;
        rec.onend = null;
        rec.onerror = null;
        rec.abort();
      } catch {}
      recognitionRef.current = null;
    }
    setInterim('');
    interimRef.current = '';
  }, [clearSilenceTimeout]);

  const speak = useCallback(
    (text: string) => {
      if (!hasSpeechSynthesis() || !text) return;
      try {
        suppressRecognition();
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        const langHint = detectResponseLanguage(text);
        utter.lang = langHint === 'hi' ? 'hi-IN' : 'en-IN';
        utter.rate = 0.95;
        utter.pitch = 1;
        utter.volume = 1;
        const voice = getPreferredVoice(langHint);
        if (voice) utter.voice = voice;
        utter.onstart = () => {
          setIsSpeaking(true);
          setPhase('speaking');
        };
        utter.onend = () => {
          setIsSpeaking(false);
          setPhase('idle');
        };
        utter.onerror = () => {
          setIsSpeaking(false);
          setPhase('idle');
        };
        if (window.speechSynthesis.getVoices().length === 0) {
          window.speechSynthesis.onvoiceschanged = () => {
            try {
              window.speechSynthesis.speak(utter);
            } catch {}
          };
          setTimeout(() => {
            try {
              window.speechSynthesis.speak(utter);
            } catch {}
          }, 250);
        } else {
          window.speechSynthesis.speak(utter);
        }
      } catch (e) {
        console.warn('TTS failed', e);
        setIsSpeaking(false);
        setPhase('idle');
      }
    },
    [suppressRecognition]
  );

  const resetForNext = useCallback(() => {
    clearSilenceTimeout();
    if (hasSpeechSynthesis()) window.speechSynthesis.cancel();
    setTranscript('');
    setInterim('');
    finalTranscriptRef.current = '';
    interimRef.current = '';
    setConvResult(null);
    setConvState('IDLE');
    setFinalListing(null);
    setListingId(null);
    setResponse(null);
    setError(null);
    setErrorCode(null);
    setResultSummary(null);
    setSubmitting(false);
    setPhase('idle');
    setIsSpeaking(false);
    isProcessingRef.current = false;
  }, [clearSilenceTimeout]);

  const handleResetSession = useCallback(() => {
    voiceAgent.resetSession(sessionIdRef.current);
    const newSid = voiceAgent.createSession();
    setSessionId(newSid);
    sessionIdRef.current = newSid;
    resetForNext();
  }, [resetForNext]);

  const handleError = useCallback((code: string, message: string, detail?: string) => {
    if (detail) console.error(`[VoiceAssistant] ${code}:`, detail);
    else console.error(`[VoiceAssistant] ${code}:`, message);
    setError(message);
    setErrorCode(code);
    setPhase('error');
    setConvState('ERROR');
    isProcessingRef.current = false;
    setSubmitting(false);
  }, []);

  // ---- CONVERSATION MANAGER (new backend /api/conversation/turn) ----
  const handleConfirm = useCallback(async (confirm: boolean) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setSubmitting(true);
    setError(null);
    setErrorCode(null);
    setPhase('understanding');
    console.log('[FRONTEND] confirmation:', confirm, 'session', sessionIdRef.current);
    try {
      const result = await voiceAgent.confirmListing(sessionIdRef.current, confirm);
      console.log('[FRONTEND] confirmation result:', result);
      setConvResult(result);
      setConvState(result.state);
      setSessionId(result.session_id);
      sessionIdRef.current = result.session_id;
      setLastSpokenText(confirm ? 'Haan' : 'Nahi');

      if (result.state === 'ERROR' || result.error) {
        const friendly = result.error || (language === 'hi' ? 'कनेक्शन में समस्या आ गई।' : 'Connection mein problem aa gayi.');
        handleError('confirm-failed', friendly, result.error);
        return;
      }

      setResponse(result.agent_message);
      setAssistantResponse(result.agent_message);

      if (result.state === 'SUCCESS') {
        // Server already submitted the listing to POST /api/listings.
        // Display the result directly — no redundant API call.
        const final = buildFinalListing(result.listing);
        setFinalListing(final);
        setConvState('SUCCESS');
        if (result.listing_id) {
          setListingId(result.listing_id);
        }
        console.log('[FRONTEND] Listing submitted by server. ID:', result.listing_id);
        setResultSummary(
          result.listing_id
            ? (language === 'hi'
                ? `लिस्टिंग ID: ${result.listing_id} — सफलता!`
                : `Listing ID: ${result.listing_id} — Success!`)
            : null
        );
        setPhase('speaking');
        speak(result.agent_message);
        return;
      } else if (result.state === 'CANCELLED') {
        setFinalListing(null);
        setListingId(null);
        setResultSummary(null);
        setPhase('speaking');
        speak(result.agent_message);
      } else {
        setPhase('speaking');
        speak(result.agent_message);
      }
    } catch (e: any) {
      console.error('[FRONTEND] confirm error', e);
      const friendly = e?.message?.includes('Failed to fetch') || e?.name === 'TypeError'
        ? (language === 'hi' ? 'कनेक्शन में समस्या आ गई। कृपया दोबारा प्रयास करें।' : 'Connection mein problem aa gayi. Ek baar phir try karein.')
        : (language === 'hi' ? 'प्रोसेसिंग में त्रुटि।' : 'Processing error. Please try again.');
      handleError('network', friendly, String(e).slice(0, 500));
    } finally {
      isProcessingRef.current = false;
      setSubmitting(false);
    }
  }, [language, setAssistantResponse, setLastSpokenText, speak, handleError]);

  const processTranscript = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      // Dev logging: shows EXACTLY what transcript enters the conversation.
      // Anything printed here is what the parser sees — nothing else.
      console.log('[FRONTEND] USER TRANSCRIPT:', JSON.stringify(trimmed));
      if (!trimmed) {
        handleError(
          'no-speech',
          language === 'hi'
            ? 'मैंने कुछ नहीं सुना। कृपया फिर से बोलें या टाइप करें।'
            : "I didn't catch that. Please speak again or type."
        );
        return;
      }

      if (isProcessingRef.current) {
        console.log('[FRONTEND] request already in progress, ignoring duplicate:', trimmed);
        return;
      }
      isProcessingRef.current = true;
      console.log('[FRONTEND] request started with text:', trimmed, 'session', sessionIdRef.current);
      setError(null);
      setErrorCode(null);
      setConvResult(null);
      setConvState('PROCESSING');
      setResponse(null);
      setResultSummary(null);
      setSubmitting(false);
      if (hasSpeechSynthesis()) window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setTranscript(trimmed);
      setInterim('');

      try {
        setPhase('understanding');

        if (mode === 'consumer') {
          const result = await parseVoiceIntent(trimmed);
          console.log('[FRONTEND] parsed consumer intent:', result);
          setLastSpokenText(trimmed);
          if (onParsedResult) {
            onParsedResult(result, trimmed);
          }
          if (onProceed) {
            onProceed();
          }
          setPhase('idle');
          return;
        }

        const result = await voiceAgent.processTurn(sessionIdRef.current, trimmed);
        console.log('[FRONTEND] conversation result:', result);

        if (result.session_id) {
          setSessionId(result.session_id);
          sessionIdRef.current = result.session_id;
        }
        setConvResult(result);
        setConvState(result.state);

        if (result.state === 'ERROR' || result.error) {
          const friendly = result.error || (language === 'hi' ? 'कनेक्शन में समस्या आ गई।' : 'Connection mein problem aa gayi.');
          handleError('backend', friendly, result.error);
          return;
        }

        setResponse(result.agent_message);
        setAssistantResponse(result.agent_message);
        setLastSpokenText(trimmed);
        setPhase('speaking');
        speak(result.agent_message);

      } catch (e: any) {
        console.error('[VoiceAssistant] process error:', e);
        const detail = String(e?.message || e).slice(0, 600);
        console.error('[VoiceAssistant] detail:', detail);
        let friendly = '';
        if (e?.name === 'AbortError' || detail.includes('timeout')) {
          friendly = language === 'hi' ? 'AI ने समय पर जवाब नहीं दिया। कृपया फिर से कोशिश करें।' : 'AI ne samay par jawaab nahi diya. Kripya phir koshish karein.';
          handleError('timeout', friendly, detail);
        } else if (detail.includes('Failed to fetch') || detail.includes('NetworkError') || detail.includes('ECONNREFUSED') || e?.name === 'TypeError') {
          friendly = language === 'hi' ? 'कनेक्शन में समस्या आ गई। कृपया दोबारा प्रयास करें।' : 'Connection mein problem aa gayi. Ek baar phir try karein.';
          handleError('network', friendly, detail);
        } else {
          friendly = language === 'hi' ? 'प्रोसेसिंग में त्रुटि। कृपया फिर से कोशिश करें।' : 'Processing mein samasya. Phir try karein.';
          handleError('backend', friendly, detail);
        }
      } finally {
        isProcessingRef.current = false;
      }
    },
    [language, onParsedResult, setAssistantResponse, setLastSpokenText, setParsedIntent, speak, handleError]
  );

  const stopListening = useCallback(() => {
    clearSilenceTimeout();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setPhase((prev) => (prev === 'listening' ? 'idle' : prev));
    setInterim('');
  }, [clearSilenceTimeout]);

  const startListening = useCallback(() => {
    if (!hasSpeechRecognition()) {
      handleError(
        'no-voice',
        language === 'hi'
          ? 'आपके ब्राउज़र में वॉयस सपोर्ट नहीं है। Chrome/Edge उपयोग करें या टाइप करें।'
          : 'Voice not supported in this browser. Please use Chrome/Edge or type.'
      );
      return;
    }

    if (isProcessingRef.current) return;

    stopSpeaking();
    clearSilenceTimeout();
    setError(null);
    setErrorCode(null);
    setInterim('');
    finalTranscriptRef.current = '';
    interimRef.current = '';
    setTranscript('');
    setResponse(null);
    setResultSummary(null);
    setIsSpeaking(false);
    setPhase('listening');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    // Anything the assistant is about to say (or has just said) must never be
    // captured: while TTS is active, results are dropped and recognition is
    // aborted. Recognition only processes results while phase === 'listening'.
    let micAllowed = true;
    recognition.onaudiostart = () => {
      if (isSpeakingRef.current) {
        micAllowed = false;
        try {
          recognition.stop();
        } catch {}
      }
    };

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = getEffectiveSTTLang();

    recognition.onstart = () => {
      setPhase('listening');
      setInterim(language === 'hi' ? 'सुन रहा हूँ...' : 'Listening...');
    };

    recognition.onresult = (event: any) => {
      // Assistant TTS is active — anything captured is the assistant's own
      // voice (or its echo), never the farmer. Drop it unconditionally.
      if (isSpeakingRef.current || phaseRef.current !== 'listening') return;
      let newInterim = '';
      let newFinal = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const t = result[0].transcript;
        if (result.isFinal) newFinal += t + ' ';
        else newInterim += t;
      }

      if (newInterim) {
        newInterim = newInterim.trim();
        setInterim(newInterim);
        interimRef.current = newInterim;
        clearSilenceTimeout();
        silenceTimeoutRef.current = window.setTimeout(() => {
          const candidate = finalTranscriptRef.current || interimRef.current;
          const filtered = candidate && candidate !== 'सुन रहा हूँ...' && candidate !== 'Listening...' ? candidate.trim() : '';
          if (filtered) {
            if (isProcessingRef.current) return;
            try {
              recognitionRef.current?.stop();
            } catch {}
            setTranscript(filtered);
            setInterim('');
            clearSilenceTimeout();
            console.log('[FRONTEND] interim silence timeout, processing:', filtered);
            processTranscript(filtered);
          } else {
            setPhase('idle');
            clearSilenceTimeout();
            try {
              recognitionRef.current?.stop();
            } catch {}
            handleError('no-speech', language === 'hi' ? 'मैंने कुछ नहीं सुना। फिर से बोलें।' : "I didn't catch that. Please speak again.");
          }
        }, 1200);
      }

      if (newFinal) {
        newFinal = newFinal.trim();
        const accumulated = finalTranscriptRef.current ? `${finalTranscriptRef.current} ${newFinal}`.trim() : newFinal;
        finalTranscriptRef.current = accumulated;
        setTranscript(accumulated);
        setInterim('');
        interimRef.current = '';
        clearSilenceTimeout();
        silenceTimeoutRef.current = window.setTimeout(() => {
          if (isProcessingRef.current) return;
          try {
            recognitionRef.current?.stop();
          } catch {}
          console.log('[FRONTEND] final result silence timeout, processing:', accumulated);
          processTranscript(accumulated);
        }, 900);
      }
    };

    recognition.onerror = (event: any) => {
      clearSilenceTimeout();
      if (isProcessingRef.current) return;
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        handleError(
          'permission-denied',
          language === 'hi'
            ? 'माइक्रोफ़ोन की अनुमति नहीं दी गई। ब्राउज़र सेटिंग्स में अनुमति दें।'
            : 'Microphone permission denied. Please allow access in browser settings.'
        );
      } else if (event.error === 'no-speech') {
        handleError('no-speech', language === 'hi' ? 'मैंने कुछ नहीं सुना। फिर से बोलें।' : "I didn't catch that. Please speak again.");
      } else if (event.error === 'audio-capture') {
        handleError('no-mic', language === 'hi' ? 'माइक्रोफ़ोन नहीं मिला।' : 'No microphone found. Check your mic.');
      } else if (event.error === 'network') {
        handleError('network', language === 'hi' ? 'नेटवर्क त्रुटि।' : 'Network error. Check connection.');
      } else if (event.error !== 'aborted') {
        handleError('voice-error', language === 'hi' ? `वॉयस त्रुटि: ${event.error}` : `Voice error: ${event.error}`);
      }
      setPhase('error');
    };

    recognition.onend = () => {
      clearSilenceTimeout();
      const candidate = finalTranscriptRef.current || interimRef.current;
      const filtered = candidate && candidate !== 'सुन रहा हूँ...' && candidate !== 'Listening...' ? candidate.trim() : '';
      // If the mic captured only assistant audio (TTS active or mic never
      // allowed after TTS started), discard it — no echo may become "farmer".
      if (filtered && (isSpeakingRef.current || !micAllowed)) {
        finalTranscriptRef.current = '';
        interimRef.current = '';
        setTranscript('');
        setInterim('');
        setPhase((p) => (p === 'listening' ? 'idle' : p));
        return;
      }
      if (!filtered) {
        if (!isProcessingRef.current && !convResult && !response) {
          // Only show no-speech if we haven't already processed
          if (phase === 'listening') {
            handleError('no-speech', language === 'hi' ? 'मैंने कुछ नहीं सुना। फिर से बोलें।' : "I didn't hear anything. Please try again.");
          }
        }
        setPhase((p) => (p === 'listening' ? 'idle' : p));
        return;
      }
      if (isProcessingRef.current) return;
      setTranscript(filtered);
      interimRef.current = '';
      console.log('[FRONTEND] recognition onend processing:', filtered);
      processTranscript(filtered);
    };

    try {
      recognition.start();
    } catch (e) {
      console.error(e);
      handleError('mic-start', language === 'hi' ? 'माइक शुरू नहीं हो पाया।' : 'Could not start microphone.');
    }
  }, [clearSilenceTimeout, getEffectiveSTTLang, language, processTranscript, response, stopSpeaking, handleError]);

  const handleTypedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = typedInput.trim();
    if (!val) {
      handleError('empty', language === 'hi' ? 'कृपया टाइप करें।' : 'Please type a message.');
      return;
    }
    if (isProcessingRef.current) {
      console.log('[FRONTEND] handleTypedSubmit blocked, already processing');
      return;
    }
    clearSilenceTimeout();
    // Let processTranscript handle isProcessingRef and phase — do NOT set here to avoid deadlock
    console.log('[FRONTEND] typed submit:', val);
    setTranscript(val);
    finalTranscriptRef.current = val;
    interimRef.current = '';
    setError(null);
    setErrorCode(null);
    setInterim('');
    processTranscript(val);
  };

  useEffect(() => {
    if (hasSpeechSynthesis()) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
    return () => {
      clearSilenceTimeout();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (hasSpeechSynthesis()) window.speechSynthesis.cancel();
    };
  }, [clearSilenceTimeout]);

  const isIdle = phase === 'idle' && !transcript && !convResult && !response && !error;
  const showListening = phase === 'listening';
  const showUnderstanding = phase === 'understanding';
  const showSearching = phase === 'searching';
  const showResponding = phase === 'responding';
  const showSpeaking = phase === 'speaking';
  const isProcessing = phase === 'understanding' || phase === 'searching' || phase === 'responding';

  const formatValue = (val: string | number | null | undefined) => {
    if (val === null || val === undefined || val === '') return language === 'hi' ? 'निर्दिष्ट नहीं' : 'Not specified';
    return String(val);
  };
  const formatQuantity = (listing: ListingData | null) => {
    if (!listing || listing.quantity === null) return language === 'hi' ? 'निर्दिष्ट नहीं' : 'Not specified';
    const unitLabel = listing.unit ? ` ${listing.unit}` : '';
    return `${listing.quantity}${unitLabel}`;
  };

  const phaseLabel = (() => {
    switch (phase) {
      case 'listening':
        return language === 'hi' ? 'सुन रहा हूँ...' : 'Listening...';
      case 'understanding':
        return language === 'hi' ? 'समझ रहा हूँ...' : 'Understanding...';
      case 'searching':
        return language === 'hi' ? 'FarmDirect में खोज रहा हूँ...' : 'Searching FarmDirect...';
      case 'responding':
        return language === 'hi' ? 'जवाब तैयार कर रहा हूँ...' : 'Generating response...';
      case 'speaking':
        return language === 'hi' ? 'बोल रहा हूँ...' : 'Speaking...';
      default:
        return language === 'hi' ? '🎙️ बोलने के लिए टैप करें' : '🎙️ Tap to Speak';
    }
  })();

  const phaseSubLabel = (() => {
    switch (phase) {
      case 'listening':
        return language === 'hi' ? 'स्वाभाविक रूप से बोलें...' : 'Speak naturally...';
      case 'understanding':
        return language === 'hi' ? 'आपकी बात को पार्स कर रहा हूँ...' : 'Parsing your request via AI...';
      case 'searching':
        return language === 'hi' ? 'बाज़ार डेटा में खोज...' : 'Querying marketplace database...';
      case 'responding':
        return language === 'hi' ? 'AI जवाब बना रहा है...' : 'AI is crafting response...';
      case 'speaking':
        return language === 'hi' ? 'सहायक बोल रहा है...' : 'Assistant is speaking...';
      default:
        return language === 'hi' ? 'माइक दबाएँ और बोलें' : 'Tap mic and speak';
    }
  })();

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-semibold mb-4">
          <Sparkles size={14} />
          <span>{language === 'hi' ? 'वॉयस अनुरोध' : 'Voice Request'}</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-900 max-w-md uppercase tracking-tight">
          {mode === 'consumer'
            ? language === 'hi'
              ? 'आज आपको क्या चाहिए?'
              : 'What do you need today?'
            : language === 'hi'
              ? 'आप क्या बेचना चाहते हैं?'
              : 'What do you want to sell?'}
        </h2>
        <p className="text-slate-500 text-sm mt-1 max-w-sm">
          {language === 'hi'
            ? 'अपनी आवश्यकता अंग्रेज़ी, हिंदी या Hinglish में बताएँ।'
            : 'Tell us what you need in English, Hindi or Hinglish.'}
        </p>

        <div className="my-8 relative flex flex-col items-center gap-3">
          <div className="relative flex items-center justify-center">
            {(phase === 'listening' || isProcessing || showSpeaking) && (
              <div className={`absolute w-28 h-28 rounded-full animate-ping ${showSpeaking ? 'bg-teal-500/20' : 'bg-emerald-500/20'}`} />
            )}
            <button
              onClick={phase === 'listening' ? stopListening : showSpeaking ? stopSpeaking : () => startListening()}
              disabled={isProcessing}
              aria-label={phase === 'listening' ? 'Stop listening' : showSpeaking ? 'Stop speaking' : 'Tap to Speak'}
              className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer focus:outline-none focus:ring-4 focus:ring-emerald-500/20 ${
                phase === 'listening'
                  ? 'bg-rose-500 text-white shadow-rose-500/30 scale-110'
                  : isProcessing
                    ? 'bg-amber-500 text-white shadow-amber-500/30 scale-105'
                    : showSpeaking
                      ? 'bg-teal-500 text-white shadow-teal-500/30 scale-105'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30 hover:scale-105 active:scale-95'
              } ${isProcessing ? 'opacity-90 cursor-not-allowed' : ''}`}
            >
              {phase === 'listening' ? <MicOff size={32} /> : isProcessing ? <Loader2 size={32} className="animate-spin" /> : showSpeaking ? <Volume2 size={32} className="animate-pulse" /> : <Mic size={32} />}
            </button>
          </div>

          <div className="text-center min-h-[48px]">
            <p className="text-sm font-semibold text-slate-900 flex items-center justify-center gap-2">
              {showListening && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
              {showUnderstanding && <Brain size={14} className="text-amber-600 animate-pulse" />}
              {showSearching && <Search size={14} className="text-blue-400 animate-pulse" />}
              {showResponding && <Sparkles size={14} className="text-purple-400 animate-pulse" />}
              {showSpeaking && <Volume2 size={14} className="text-teal-600 animate-pulse" />}
              {phaseLabel}
            </p>
            <p className="text-xs text-slate-500 mt-1">{phaseSubLabel}</p>
            {/* Progress dots for lifecycle */}
            {(isProcessing || showSpeaking) && (
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <span className={`w-1.5 h-1.5 rounded-full transition-colors ${phase === 'understanding' ? 'bg-amber-400 animate-pulse' : 'bg-slate-200'}`} />
                <span className={`w-6 h-0.5 rounded-full transition-colors ${phase === 'understanding' ? 'bg-amber-400' : 'bg-slate-200'}`} />
                <span className={`w-1.5 h-1.5 rounded-full transition-colors ${phase === 'searching' ? 'bg-blue-400 animate-pulse' : phase === 'understanding' ? 'bg-slate-500' : 'bg-slate-200'}`} />
                <span className={`w-6 h-0.5 rounded-full transition-colors ${phase === 'searching' ? 'bg-blue-400' : 'bg-slate-200'}`} />
                <span className={`w-1.5 h-1.5 rounded-full transition-colors ${phase === 'responding' ? 'bg-purple-400 animate-pulse' : phase === 'searching' ? 'bg-slate-500' : 'bg-slate-200'}`} />
                <span className={`w-6 h-0.5 rounded-full transition-colors ${phase === 'responding' ? 'bg-purple-400' : 'bg-slate-200'}`} />
                <span className={`w-1.5 h-1.5 rounded-full transition-colors ${showSpeaking ? 'bg-teal-400 animate-pulse' : 'bg-slate-200'}`} />
              </div>
            )}
          </div>

          {phase === 'listening' && (
            <Button variant="outline" size="sm" icon={<Square size={14} />} onClick={stopListening} className="mt-1">
              {language === 'hi' ? 'रोकें' : 'Stop'}
            </Button>
          )}
          {showSpeaking && (
            <Button variant="outline" size="sm" onClick={stopSpeaking} className="mt-1">
              {language === 'hi' ? 'बोलना रोकें' : 'Stop speaking'}
            </Button>
          )}
        </div>

        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 my-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] tracking-widest text-slate-500 uppercase font-semibold">
              {language === 'hi' ? 'या' : 'or'}
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleTypedSubmit} className="space-y-2 text-left">
            <label htmlFor="voice-typed-input" className="block text-xs font-semibold text-slate-600">
              {language === 'hi' ? 'या अपनी आवश्यकता टाइप करें' : 'Or type your requirement'}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Keyboard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="voice-typed-input"
                  type="text"
                  value={typedInput}
                  onChange={(e) => setTypedInput(e.target.value)}
                  placeholder={
                    language === 'hi'
                      ? 'उदा. मुझे 500 किलो टमाटर चाहिए'
                      : 'I need 500 kg Grade A tomatoes in Ghaziabad tomorrow.'
                  }
                  className="w-full h-11 pl-10 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40"
                  disabled={phase === 'listening' || isProcessing}
                />
              </div>
              <Button type="submit" variant="secondary" size="md" disabled={phase === 'listening' || isProcessing}>
                {language === 'hi' ? 'भेजें' : 'Send'}
              </Button>
            </div>
            {!hasSpeechRecognition() && (
              <p className="text-[11px] text-amber-300">
                {language === 'hi' ? 'वॉयस उपलब्ध नहीं — टाइप करें' : 'Voice unavailable — type to continue'}
              </p>
            )}
          </form>
        </div>

        {phase === 'listening' && interim && (
          <div className="w-full max-w-lg mt-6 bg-white/60 border border-slate-200 rounded-2xl p-4 text-left">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> {language === 'hi' ? 'सुन रहा हूँ...' : 'Listening...'}
            </p>
            <p className="text-sm text-slate-800 italic animate-pulse">“{interim}”</p>
          </div>
        )}

        {transcript && phase !== 'listening' && !isProcessing && !showSpeaking && !convResult && !response && !error && (
          <div className="w-full max-w-lg mt-6 bg-white/60 border border-slate-200 rounded-2xl p-4 text-left">
            <p className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-2">
              {language === 'hi' ? 'आपने कहा:' : 'You said:'}
            </p>
            <p className="text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-xl p-3">“{transcript}”</p>
          </div>
        )}

        {/* Phased processing indicator — tied to real lifecycle, no fake delays */}
        {(showUnderstanding || showSearching || showResponding) && (
          <Card className="w-full max-w-lg mt-6 bg-white/60 border-slate-200 p-4 text-left">
            <div className="space-y-3">
              <div className={`flex items-center gap-3 ${showUnderstanding ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${showUnderstanding ? 'bg-amber-500/20 text-amber-600 border border-amber-500/30' : 'bg-white text-slate-500'}`}>
                  {showUnderstanding ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${showUnderstanding ? 'text-white' : 'text-slate-500'}`}>{language === 'hi' ? 'समझ रहा हूँ...' : 'Understanding...'}</p>
                  <p className="text-xs text-slate-500">{language === 'hi' ? 'AI आपकी बात को पार्स कर रहा है' : 'Parsing via /api/voice-intent'}</p>
                </div>
                {showUnderstanding && <Loader2 size={14} className="ml-auto animate-spin text-amber-600" />}
                {!showUnderstanding && (phase as string) !== 'understanding' && <CheckCircle2 size={14} className="ml-auto text-emerald-600" />}
              </div>
              <div className={`flex items-center gap-3 ${showSearching ? 'opacity-100' : showUnderstanding ? 'opacity-40' : 'opacity-100'}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${showSearching ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white text-slate-500'}`}>
                  {showSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${showSearching ? 'text-white' : 'text-slate-500'}`}>{language === 'hi' ? 'FarmDirect में खोज...' : 'Searching FarmDirect...'}</p>
                  <p className="text-xs text-slate-500">{language === 'hi' ? 'बाज़ार डेटा में खोज' : 'Querying marketplace database'}</p>
                </div>
                {showSearching && <Loader2 size={14} className="ml-auto animate-spin text-blue-400" />}
                {(phase as string) === 'responding' || (phase as string) === 'speaking' ? <CheckCircle2 size={14} className="ml-auto text-emerald-600" /> : null}
              </div>
              <div className={`flex items-center gap-3 ${showResponding ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${showResponding ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-white text-slate-500'}`}>
                  {showResponding ? <Loader2 size={16} className="animate-spin" /> : <Store size={16} />}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${showResponding ? 'text-white' : 'text-slate-500'}`}>{language === 'hi' ? 'जवाब बना रहा हूँ...' : 'Generating response...'}</p>
                  <p className="text-xs text-slate-500">AI via /api/assistant-response</p>
                </div>
                {showResponding && <Loader2 size={14} className="ml-auto animate-spin text-purple-400" />}
              </div>
            </div>
            {transcript && (
              <p className="text-xs text-slate-500 mt-3 italic">“{transcript}”</p>
            )}
          </Card>
        )}

        {error && (
          <Card className="w-full max-w-lg mt-4 bg-rose-500/10 border-rose-500/30 p-4 text-left">
            <div className="flex gap-2.5">
              <AlertCircle size={16} className="text-rose-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-rose-700">{error}</p>
                {errorCode && <p className="text-[11px] text-rose-300/60 mt-1 font-mono">[{errorCode}]</p>}
                <p className="text-xs text-rose-300/80 mt-1">
                  {language === 'hi'
                    ? 'सुझाव: स्पष्ट बोलें या टाइप करें — जैसे “500 किलो टमाटर चाहिए”'
                    : 'Tip: Try speaking clearly or type e.g. “I need 500 kg tomatoes”'}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              <Button variant="outline" size="sm" onClick={resetForNext}>
                {language === 'hi' ? 'फिर से कोशिश करें' : 'Try Again'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                {language === 'hi' ? 'बंद करें' : 'Dismiss'}
              </Button>
              {errorCode === 'permission-denied' && (
                <span className="text-[11px] text-slate-500 self-center">Check browser site settings → Microphone → Allow</span>
              )}
            </div>
          </Card>
        )}

        {response && (
          <Card className="w-full max-w-lg mt-4 bg-emerald-500/10 border-emerald-500/20 p-4 text-left">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-600 uppercase mb-2">
              <Volume2 size={14} className={isSpeaking ? 'animate-pulse text-teal-400' : ''} />
              <span>{language === 'hi' ? 'सहायक प्रतिक्रिया' : 'Assistant Response'}</span>
              {isSpeaking && <span className="ml-auto text-teal-600 animate-pulse text-[11px]">● Speaking</span>}
              {!isSpeaking && (
                <button
                  onClick={() => speak(response)}
                  className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-200 text-emerald-300 hover:bg-emerald-500/30"
                >
                  {language === 'hi' ? 'फिर सुनें' : 'Replay'}
                </button>
              )}
              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300"
                >
                  Stop
                </button>
              )}
            </div>
            <p className="text-sm text-slate-900 leading-relaxed whitespace-pre-wrap">{response}</p>
            {isSpeaking && <p className="text-[11px] text-teal-300 mt-2 animate-pulse">Speaking in {detectResponseLanguage(response) === 'hi' ? 'Hindi' : 'English'}...</p>}
          </Card>
        )}

        {/* Confirmation card - shows when state is CONFIRMING */}
        {convState === 'CONFIRMING' && convResult?.listing && (
          <Card className="w-full max-w-lg mt-4 bg-white border-emerald-200 p-5 text-left shadow-sm">
            <div className="text-center mb-3">
              <p className="text-sm font-bold text-slate-900 flex items-center justify-center gap-2">
                <span>🌱</span> {language === 'hi' ? 'आपकी लिस्टिंग समझ ली:' : 'Aapki listing samajh li:'}
              </p>
            </div>
            <div className="space-y-2 text-sm bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">Farmer</span>
                <span className="font-semibold text-slate-900">{formatValue(convResult.listing.farmer_name)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">Phone</span>
                <span className="font-semibold text-slate-900">{formatValue(convResult.listing.phone)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">Product</span>
                <span className="font-semibold text-slate-900 capitalize">{formatValue(convResult.listing.product)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">Quantity</span>
                <span className="font-semibold text-slate-900">{formatQuantity(convResult.listing)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">Price</span>
                <span className="font-semibold text-slate-900">{convResult.listing.asking_price !== null && convResult.listing.asking_price !== undefined ? `₹${convResult.listing.asking_price}/${convResult.listing.price_unit || 'kg'}` : formatValue(convResult.listing.asking_price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">Location</span>
                <span className="font-semibold text-slate-900">{formatValue(convResult.listing.location)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">Quality</span>
                <span className="font-semibold text-slate-900">{formatValue(convResult.listing.quality)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">Intent</span>
                <span className="font-semibold text-slate-900 capitalize">{convResult.listing.intent}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 text-center mt-3">
              {language === 'hi' ? 'क्या आप इसे मार्केटप्लेस पर बेचना चाहते हैं?' : 'Kya aap ise marketplace par sell karna chahte hain?'}
            </p>
            <div className="flex gap-3 mt-4">
              <Button onClick={() => handleConfirm(true)} disabled={submitting} variant="primary" size="md" className="flex-1 justify-center font-bold">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : null} {language === 'hi' ? 'हाँ' : 'Haan'}
              </Button>
              <Button onClick={() => handleConfirm(false)} disabled={submitting} variant="outline" size="md" className="flex-1 justify-center">
                {language === 'hi' ? 'नहीं' : 'Nahi'}
              </Button>
            </div>
          </Card>
        )}

        {/* Final collected listing — structured Phase 1 schema shown in dev UI */}
        {convState === 'SUCCESS' && finalListing && (
          <Card className="w-full max-w-lg mt-4 bg-white border-emerald-200 p-5 text-left shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-700 uppercase mb-3">
              <ClipboardList size={14} />
              <span>{language === 'hi' ? 'अंतिम लिस्टिंग JSON' : 'Final Listing JSON'}</span>
              {listingId && (
                <span className="ml-auto bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px]">
                  ID: {listingId}
                </span>
              )}
            </div>
            <pre className="text-[11px] leading-relaxed bg-slate-900 text-emerald-300 rounded-xl p-4 overflow-x-auto font-mono whitespace-pre">
              {JSON.stringify(
                listingId ? { ...finalListing, listing_id: listingId } : finalListing,
                null,
                2
              )}
            </pre>
            <p className="text-[11px] text-slate-500 mt-2">
              {listingId
                ? (language === 'hi'
                    ? `लिस्टिंग सफलतापूर्वक बनाई गई — ID: ${listingId}`
                    : `Listing created successfully — ID: ${listingId}`)
                : (language === 'hi'
                    ? 'सभी आवश्यक फ़ील्ड एकत्र कर लिए गए हैं — Phase 1 स्कीमा।'
                    : 'All required fields collected — Phase 1 schema.')}
            </p>
          </Card>
        )}

        {/* Success - listing created */}
        {convState === 'SUCCESS' && finalListing && (
          <Card className="w-full max-w-lg mt-4 bg-emerald-50 border-emerald-200 p-4 text-left">
            <div className="flex gap-2 items-start">
              <CheckCircle2 size={18} className="text-emerald-600 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-800">{language === 'hi' ? 'सफलता!' : 'Success!'}</p>
                {listingId ? (
                  <p className="text-xs text-emerald-700 mt-1">
                    {language === 'hi' ? `लिस्टिंग ID: ${listingId}` : `Listing ID: ${listingId}`} • {finalListing.product} • {finalListing.quantity} {finalListing.unit}
                  </p>
                ) : (
                  <p className="text-xs text-emerald-700 mt-1">
                    {finalListing.product} • {finalListing.quantity} {finalListing.unit}
                  </p>
                )}
                {resultSummary && <p className="text-[11px] text-emerald-600 mt-1">{resultSummary}</p>}
              </div>
            </div>
          </Card>
        )}

        {/* Cancelled */}
        {convState === 'CANCELLED' && (
          <Card className="w-full max-w-lg mt-4 bg-slate-50 border-slate-200 p-4 text-left">
            <div className="flex gap-2 items-start">
              <XCircle size={18} className="text-slate-500 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-slate-700">{language === 'hi' ? 'रद्द किया गया' : 'Cancelled'}</p>
                <p className="text-xs text-slate-600 mt-1">{response}</p>
              </div>
            </div>
          </Card>
        )}

        {/* SUBMITTING state - loading */}
        {convState === 'SUBMITTING' && (
          <Card className="w-full max-w-lg mt-4 bg-amber-50 border-amber-200 p-4 text-left">
            <div className="flex gap-2 items-center">
              <Loader2 size={16} className="text-amber-600 animate-spin" />
              <p className="text-sm font-medium text-amber-700">{language === 'hi' ? 'लिस्टिंग बना रहा हूँ...' : 'Creating listing...'}</p>
            </div>
          </Card>
        )}

        {/* Mic remains available — no extra Process button needed */}
        {(response || convResult) && !isProcessing && (
          <p className="text-[11px] text-slate-500 mt-4 flex items-center gap-1.5">
            <Mic size={11} /> {language === 'hi' ? 'फिर से बोलने के लिए माइक दबाएँ' : 'Tap mic to speak again — auto-submits'}
          </p>
        )}

        {isIdle && (
          <p className="text-[11px] text-slate-500 mt-4 max-w-md">
            {language === 'hi'
              ? 'उदाहरण: “मुझे 500 किलो Grade A टमाटर चाहिए, गाज़ियाबाद में कल तक”'
              : 'Example: “I need 500 kg Grade A tomatoes in Ghaziabad tomorrow.”'}
          </p>
        )}
      </div>
    </div>
  );
};




