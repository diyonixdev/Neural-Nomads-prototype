import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Loader2,
  Sparkles,
  ArrowRight,
  Keyboard,
  Square,
  AlertCircle,
  Volume2,
} from 'lucide-react';
import { useDemo } from '../../context/DemoContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { parseVoiceIntent, generateAssistantResponse } from '../../services/aiService';
import type { ParsedVoiceIntent } from '../../services/aiService';

interface VoiceAssistantProps {
  mode: 'consumer' | 'farmer';
  onParsedResult?: (data: ParsedVoiceIntent, originalText: string) => void;
  onProceed?: () => void;
}

type RecognitionLang = 'auto' | 'en-IN' | 'hi-IN';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const hasSpeechRecognition = () =>
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ mode, onParsedResult, onProceed }) => {
  const { language, setParsedIntent, setAssistantResponse, setLastSpokenText } = useDemo();

  // UI states as per spec: idle -> listening -> transcribed -> processing -> extracted -> ai response
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [typedInput, setTypedInput] = useState('');
  const [parsed, setParsed] = useState<ParsedVoiceIntent | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recognitionLang] = useState<RecognitionLang>('auto');

  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>('');
  const interimRef = useRef<string>('');

  const getEffectiveSTTLang = useCallback((): string => {
    if (recognitionLang === 'hi-IN') return 'hi-IN';
    if (recognitionLang === 'en-IN') return 'en-IN';
    return language === 'hi' ? 'hi-IN' : 'en-IN';
  }, [recognitionLang, language]);

  const resetAll = useCallback(() => {
    setTranscript('');
    setInterim('');
    finalTranscriptRef.current = '';
    interimRef.current = '';
    setParsed(null);
    setResponse(null);
    setError(null);
    setIsProcessing(false);
    setIsListening(false);
  }, []);

  const handleTryAgain = () => {
    resetAll();
    setTypedInput('');
  };

  // Core: call existing services only (no regex/AI prompts here)
  const processTranscript = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        setError(
          language === 'hi'
            ? 'कृपया पहले बोलें या टाइप करें।'
            : 'Please speak or type your requirement first.'
        );
        return;
      }

      setIsProcessing(true);
      setError(null);
      setParsed(null);
      setResponse(null);

      try {
        // STATE 4 -> 5: use existing service
        const parsedIntent = await parseVoiceIntent(trimmed);
        setParsed(parsedIntent);
        setParsedIntent(parsedIntent);
        setLastSpokenText(trimmed);

        if (!parsedIntent || parsedIntent.intent === 'UNKNOWN') {
          // Still call assistant for friendly fallback, but show error style
          const assistantMsg = await generateAssistantResponse(parsedIntent ?? { intent: 'UNKNOWN', product: null, quantity: null, unit: null, quality: null, location: null, date: null, price: null }, {}, trimmed);
          setResponse(assistantMsg);
          setAssistantResponse(assistantMsg);
          if (onParsedResult && parsedIntent) onParsedResult(parsedIntent, trimmed);
          return;
        }

        if (onParsedResult) onParsedResult(parsedIntent, trimmed);

        // STATE 6: use existing Phase 6 implementation
        const assistantMsg = await generateAssistantResponse(parsedIntent, {}, trimmed);
        setResponse(assistantMsg);
        setAssistantResponse(assistantMsg);
      } catch (e) {
        console.error(e);
        setError(
          language === 'hi'
            ? 'Sorry, main request samajh nahi paaya. Please dobara try karein.'
            : "Sorry, I couldn't understand that. Please try again."
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [language, onParsedResult, setAssistantResponse, setLastSpokenText, setParsedIntent]
  );

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    setInterim('');
    interimRef.current = '';
  }, []);

  const startListening = useCallback(() => {
    if (!hasSpeechRecognition()) {
      setError(
        language === 'hi'
          ? 'आपके ब्राउज़र में वॉयस सपोर्ट नहीं है। कृपया Chrome/Edge उपयोग करें या नीचे टाइप करें।'
          : 'Voice recognition not supported in this browser. Please use Chrome/Edge or type your requirement below.'
      );
      return;
    }

    setError(null);
    // keep transcript until new result, but clear interim/parsed/response for fresh attempt if user re-records
    setInterim('');
    finalTranscriptRef.current = '';
    interimRef.current = '';
    setParsed(null);
    setResponse(null);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = getEffectiveSTTLang();

    recognition.onstart = () => {
      setIsListening(true);
      setInterim(language === 'hi' ? 'सुन रहा हूँ...' : 'Listening...');
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const t = result[0].transcript;
        if (result.isFinal) finalTranscript += t + ' ';
        else interimTranscript += t;
      }
      if (interimTranscript) {
        setInterim(interimTranscript);
        interimRef.current = interimTranscript;
        finalTranscriptRef.current = '';
      }
      if (finalTranscript) {
        const cleaned = finalTranscript.trim();
        setTranscript(cleaned);
        setInterim('');
        interimRef.current = '';
        finalTranscriptRef.current = cleaned;
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setError(
          language === 'hi'
            ? 'माइक्रोफ़ोन की अनुमति नहीं दी गई। ब्राउज़र सेटिंग्स में अनुमति दें।'
            : 'Microphone permission denied. Please allow access in browser settings and try again.'
        );
      } else if (event.error === 'no-speech') {
        setError(
          language === 'hi'
            ? 'कोई आवाज़ नहीं सुनी गई। कृपया फिर से बोलें।'
            : 'No speech detected. Please try again.'
        );
      } else if (event.error === 'audio-capture') {
        setError(
          language === 'hi'
            ? 'माइक्रोफ़ोन नहीं मिला। कृपया माइक कनेक्ट करें।'
            : 'No microphone found. Please check your microphone.'
        );
      } else if (event.error !== 'aborted') {
        setError(language === 'hi' ? `वॉयस त्रुटि: ${event.error}` : `Voice error: ${event.error}. Please try again.`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      const candidate = finalTranscriptRef.current || interimRef.current;
      const filtered = candidate && candidate !== 'सुन रहा हूँ...' && candidate !== 'Listening...' ? candidate.trim() : '';
      if (filtered) {
        setTranscript(filtered);
        setInterim('');
        interimRef.current = '';
        // STATE 3: transcribed – do NOT auto-process, wait for user to click Process Request (per spec)
        // keep transcript visible for user to confirm
      } else {
        // empty speech
        if (!transcript) {
          setError(
            language === 'hi'
              ? 'खाली वॉयस — कृपया फिर से बोलें या टाइप करें।'
              : 'Empty speech. Please try speaking again or type your requirement.'
          );
        }
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error(e);
      setError(language === 'hi' ? 'माइक शुरू नहीं हो पाया।' : 'Could not start microphone.');
      setIsListening(false);
    }
  }, [getEffectiveSTTLang, language, transcript]);

  const handleTypedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = typedInput.trim();
    if (!val) {
      setError(language === 'hi' ? 'कृपया अपनी आवश्यकता टाइप करें।' : 'Please type your requirement.');
      return;
    }
    setTranscript(val);
    setError(null);
    // keep typed input visible, but transcript is now val
    finalTranscriptRef.current = val;
  };

  const handleProcessClick = () => {
    const textToProcess = transcript || typedInput;
    if (!textToProcess.trim()) {
      setError(language === 'hi' ? 'पहले बोलें या टाइप करें।' : 'Please speak or type your requirement first.');
      return;
    }
    // ensure transcript holds the typed value if user typed
    if (!transcript && typedInput) {
      setTranscript(typedInput.trim());
      finalTranscriptRef.current = typedInput.trim();
      processTranscript(typedInput.trim());
    } else {
      processTranscript(textToProcess);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const isIdle = !isListening && !isProcessing && !transcript && !parsed && !response;
  const isTranscribed = !!transcript && !isProcessing && !parsed;
  const showRequirement = !!parsed && !isProcessing;
  const showResponse = !!response && !isProcessing;

  // Helpers for requirement display
  const formatValue = (val: string | number | null | undefined) => {
    if (val === null || val === undefined || val === '') return language === 'hi' ? 'निर्दिष्ट नहीं' : 'Not specified';
    return String(val);
  };
  const formatQuantity = (p: ParsedVoiceIntent | null) => {
    if (!p || p.quantity === null) return language === 'hi' ? 'निर्दिष्ट नहीं' : 'Not specified';
    const unitLabel = p.unit ? ` ${p.unit}` : '';
    return `${p.quantity}${unitLabel}`;
  };
  const formatDate = (date: string | null) => {
    if (!date) return language === 'hi' ? 'निर्दिष्ट नहीं' : 'Not specified';
    // DEMO_TOMORROW_DATE handling – show Tomorrow/Kal
    if (date === '2026-09-02' || date.toLowerCase().includes('tomorrow')) {
      return language === 'hi' ? 'कल' : 'Tomorrow';
    }
    return date;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* STATE 1 – IDLE header */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4">
          <Sparkles size={14} />
          <span>{language === 'hi' ? 'वॉयस अनुरोध' : 'Voice Request'}</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white max-w-md uppercase tracking-tight">
          {mode === 'consumer'
            ? language === 'hi'
              ? 'आज आपको क्या चाहिए?'
              : 'What do you need today?'
            : language === 'hi'
              ? 'आप क्या बेचना चाहते हैं?'
              : 'What do you want to sell?'}
        </h2>
        <p className="text-slate-400 text-sm mt-1 max-w-sm">
          {language === 'hi'
            ? 'अपनी आवश्यकता अंग्रेज़ी, हिंदी या Hinglish में बताएँ।'
            : 'Tell us what you need in English, Hindi or Hinglish.'}
        </p>

        {/* Microphone – visual focus */}
        <div className="my-8 relative flex flex-col items-center gap-3">
          <div className="relative flex items-center justify-center">
            {(isListening || isProcessing) && (
              <div className="absolute w-28 h-28 rounded-full bg-emerald-500/20 animate-ping" />
            )}
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing}
              aria-label={isListening ? 'Stop listening' : 'Tap to Speak'}
              className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer focus:outline-none focus:ring-4 focus:ring-emerald-500/20 ${
                isListening
                  ? 'bg-rose-500 text-white shadow-rose-500/30 scale-110'
                  : isProcessing
                    ? 'bg-amber-500 text-white shadow-amber-500/30 scale-105'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30 hover:scale-105 active:scale-95'
              }`}
            >
              {isListening ? <MicOff size={32} /> : isProcessing ? <Loader2 size={32} className="animate-spin" /> : <Mic size={32} />}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-white">
              {isListening
                ? language === 'hi'
                  ? 'सुन रहा हूँ...'
                  : 'Listening...'
                : isProcessing
                  ? language === 'hi'
                    ? 'समझ रहा हूँ...'
                    : 'Understanding your request...'
                  : language === 'hi'
                    ? '🎙️ बोलने के लिए टैप करें'
                    : '🎙️ Tap to Speak'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isListening
                ? language === 'hi'
                  ? 'आप बोल सकते हैं...  •  Stop दबाएँ जब पूरा हो'
                  : 'You can speak now...  •  Press Stop when done'
                : language === 'hi'
                  ? 'माइक दबाएँ और स्वाभाविक रूप से बोलें'
                  : 'Tap mic and speak naturally'}
            </p>
          </div>

          {isListening && (
            <Button variant="outline" size="sm" icon={<Square size={14} />} onClick={stopListening} className="mt-2">
              {language === 'hi' ? 'रोकें' : 'Stop'}
            </Button>
          )}
        </div>

        {/* STATE 1 – Type fallback (always visible in idle, also after error) */}
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 my-4">
            <div className="h-px flex-1 bg-slate-700/60" />
            <span className="text-[11px] tracking-widest text-slate-500 uppercase font-semibold">
              {language === 'hi' ? 'या' : 'or'}
            </span>
            <div className="h-px flex-1 bg-slate-700/60" />
          </div>

          <form onSubmit={handleTypedSubmit} className="space-y-2 text-left">
            <label htmlFor="voice-typed-input" className="block text-xs font-semibold text-slate-300">
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
                  className="w-full h-11 pl-10 pr-3 rounded-xl bg-slate-950/70 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40"
                  disabled={isListening || isProcessing}
                />
              </div>
              <Button type="submit" variant="secondary" size="md" disabled={isListening || isProcessing}>
                {language === 'hi' ? 'सेट करें' : 'Set'}
              </Button>
            </div>
          </form>
        </div>

        {/* Live listening interim */}
        {isListening && interim && (
          <div className="w-full max-w-lg mt-6 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-left">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
              {language === 'hi' ? 'सुन रहा हूँ...' : 'Listening...'}
            </p>
            <p className="text-sm text-slate-200 italic animate-pulse">“{interim}”</p>
          </div>
        )}

        {/* STATE 3 – TRANSCRIBED */}
        {isTranscribed && (
          <Card className="w-full max-w-lg mt-6 bg-slate-950/60 border-slate-800 p-4 text-left">
            <p className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">
              {language === 'hi' ? 'आपने कहा:' : 'You said:'}
            </p>
            <p className="text-sm font-medium text-white bg-slate-900 border border-slate-800 rounded-xl p-3">“{transcript}”</p>
            <div className="flex gap-2 mt-3">
              <Button variant="primary" size="md" onClick={handleProcessClick} disabled={isProcessing}>
                {language === 'hi' ? 'अनुरोध प्रोसेस करें' : 'Process Request'}
              </Button>
              <Button variant="outline" size="md" onClick={handleTryAgain} disabled={isProcessing}>
                {language === 'hi' ? 'फिर से' : 'Try Again'}
              </Button>
            </div>
            {typedInput && transcript === typedInput && (
              <p className="text-[11px] text-slate-500 mt-2">
                {language === 'hi' ? 'टाइप किया गया टेक्स्ट प्रोसेस होगा' : 'Typed text will be processed'}
              </p>
            )}
          </Card>
        )}

        {/* STATE 4 – PROCESSING */}
        {isProcessing && (
          <Card className="w-full max-w-lg mt-6 bg-slate-950/60 border-slate-800 p-4 text-left">
            <div className="flex items-center gap-3">
              <Loader2 size={18} className="animate-spin text-amber-400" />
              <div>
                <p className="text-sm font-semibold text-white">
                  {language === 'hi' ? 'आपके अनुरोध को समझ रहा हूँ...' : 'Understanding your request...'}
                </p>
                <p className="text-xs text-slate-500">
                  {language === 'hi' ? 'कृपया प्रतीक्षा करें' : 'Calling parseVoiceIntent()...'}
                </p>
              </div>
            </div>
            {transcript && (
              <p className="text-xs text-slate-400 mt-3 italic">“{transcript}”</p>
            )}
          </Card>
        )}

        {/* Error handling – friendly, no API keys */}
        {error && !isProcessing && (
          <Card className="w-full max-w-lg mt-4 bg-rose-500/10 border-rose-500/30 p-4 text-left">
            <div className="flex gap-2.5">
              <AlertCircle size={16} className="text-rose-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-rose-200">{error}</p>
                <p className="text-xs text-rose-300/80 mt-1">
                  {language === 'hi'
                    ? 'सुझाव: स्पष्ट बोलें या टाइप करें — जैसे “500 किलो टमाटर चाहिए”'
                    : 'Tip: Try speaking clearly or type e.g. “I need 500 kg tomatoes”'}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={handleTryAgain}>
                {language === 'hi' ? 'फिर से कोशिश करें' : 'Try Again'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                {language === 'hi' ? 'बंद करें' : 'Dismiss'}
              </Button>
            </div>
          </Card>
        )}

        {/* STATE 5 – REQUIREMENT EXTRACTED */}
        {showRequirement && parsed && (
          <Card className="w-full max-w-lg mt-6 bg-slate-900 border-slate-700/80 p-0 overflow-hidden text-left">
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles size={14} className="text-emerald-400" />
                {language === 'hi' ? 'आपकी आवश्यकता' : 'Your Requirement'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'hi' ? 'parseVoiceIntent() द्वारा निकाला गया' : 'Extracted via parseVoiceIntent()'}
              </p>
            </div>
            <div className="divide-y divide-slate-800 text-sm">
              <div className="flex justify-between p-3">
                <span className="text-slate-400">Intent</span>
                <Badge variant={parsed.intent === 'BUYER' ? 'blue' : parsed.intent === 'SELLER' ? 'emerald' : 'slate'}>
                  {parsed.intent}
                </Badge>
              </div>
              <div className="flex justify-between p-3">
                <span className="text-slate-400">{language === 'hi' ? 'उत्पाद' : 'Product'}</span>
                <span className="font-semibold text-white">{formatValue(parsed.product)}</span>
              </div>
              <div className="flex justify-between p-3">
                <span className="text-slate-400">{language === 'hi' ? 'मात्रा' : 'Quantity'}</span>
                <span className="font-semibold text-white">{formatQuantity(parsed)}</span>
              </div>
              <div className="flex justify-between p-3">
                <span className="text-slate-400">{language === 'hi' ? 'गुणवत्ता' : 'Quality'}</span>
                <span className="font-semibold text-white">{formatValue(parsed.quality)}</span>
              </div>
              <div className="flex justify-between p-3">
                <span className="text-slate-400">Location</span>
                <span className="font-semibold text-white">{formatValue(parsed.location)}</span>
              </div>
              <div className="flex justify-between p-3">
                <span className="text-slate-400">Date</span>
                <span className="font-semibold text-white">{formatDate(parsed.date)}</span>
              </div>
              <div className="flex justify-between p-3">
                <span className="text-slate-400">Price</span>
                <span className="font-semibold text-white">
                  {parsed.price !== null && parsed.price !== undefined ? `₹${parsed.price}/kg` : language === 'hi' ? 'निर्दिष्ट नहीं' : 'Not specified'}
                </span>
              </div>
            </div>
            {parsed.intent === 'UNKNOWN' && (
              <div className="p-3 bg-amber-500/10 border-t border-amber-500/20 text-xs text-amber-200">
                {language === 'hi'
                  ? 'इरादा स्पष्ट नहीं — कृपया “चाहिए” या “बेचना है” जैसे शब्दों का उपयोग करें।'
                  : 'Intent unclear — try including “need” / “want to buy” or “have to sell”.'}
              </div>
            )}
          </Card>
        )}

        {/* STATE 6 – AI RESPONSE */}
        {showResponse && response && (
          <Card className="w-full max-w-lg mt-4 bg-emerald-500/10 border-emerald-500/20 p-4 text-left">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-400 uppercase mb-2">
              <Volume2 size={14} />
              <span>{language === 'hi' ? 'सहायक प्रतिक्रिया' : 'Assistant Response'}</span>
            </div>
            <p className="text-sm text-slate-100 leading-relaxed">{response}</p>
            <p className="text-[11px] text-slate-500 mt-2">
              {language === 'hi' ? 'generateAssistantResponse() द्वारा' : 'via generateAssistantResponse()'}
            </p>
          </Card>
        )}

        {/* FIND FARMERS / FIND BUYERS – only after valid BUYER/SELLER */}
        {showRequirement && parsed && parsed.intent !== 'UNKNOWN' && onProceed && (
          <div className="w-full max-w-lg mt-4">
            {parsed.intent === 'BUYER' ? (
              <Button variant="primary" size="lg" icon={<ArrowRight size={18} />} onClick={onProceed} className="w-full">
                {language === 'hi' ? 'किसान खोजें' : 'Find Farmers'}
              </Button>
            ) : (
              <Button variant="primary" size="lg" icon={<ArrowRight size={18} />} onClick={onProceed} className="w-full bg-teal-600 hover:bg-teal-700 border-teal-500">
                {language === 'hi' ? 'खरीदार खोजें' : 'Find Buyers'}
              </Button>
            )}
            <p className="text-[11px] text-slate-500 mt-2">
              {parsed.intent === 'BUYER'
                ? language === 'hi'
                  ? 'अगले चरण में matchFarmers() चलेगा (Step 8)'
                  : 'Next step will connect to matchFarmers() (Step 8)'
                : language === 'hi'
                  ? 'अगले चरण में matchBuyers() चलेगा'
                  : 'Next step will connect to matchBuyers()'}
            </p>
          </div>
        )}

        {/* Unknown intent – still show Try Again */}
        {showRequirement && parsed?.intent === 'UNKNOWN' && (
          <div className="w-full max-w-lg mt-3">
            <Button variant="outline" size="md" onClick={handleTryAgain} className="w-full">
              {language === 'hi' ? 'फिर से कोशिश करें' : 'Try Again'}
            </Button>
          </div>
        )}

        {/* Idle helper – show example when no interaction yet */}
        {isIdle && !error && (
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
