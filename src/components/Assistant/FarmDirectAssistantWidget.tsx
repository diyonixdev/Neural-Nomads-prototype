import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { Button } from '../ui/Button';
import {
  Sparkles,
  Mic,
  MicOff,
  X,
  ShoppingBag,
  Tractor,
  Users,
  MessageCircle,
  Send,
  Loader2,
  ChevronRight,
  Volume2,
  Bot,
  ArrowRight,
  Leaf,
  Package,
  IndianRupee,
  MapPin,
  Eye,
  CheckCircle2,
  Search,
  Brain,
} from 'lucide-react';
import {
  createUserMessage,
  createAssistantMessage,
  getWelcomeMessage,
  quickPromptsForRole,
  hasSeenIntro as checkSeenIntro,
  markIntroSeen,
  getPreferredRole,
  setPreferredRole,
  type AssistantRole,
  type ChatMessage,
} from '../../services/assistantService';
import { parseVoiceIntent, generateAssistantResponse } from '../../services/aiService';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const hasSpeechRecognition = () =>
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

export const FarmDirectAssistantWidget: React.FC = () => {
  const { language, setRole } = useDemo();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [hasSeenIntro, setHasSeenIntro] = useState(false);
  const [view, setView] = useState<'intro' | 'chat'>('intro');
  const [selectedRole, setSelectedRole] = useState<AssistantRole>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [assistantPhase, setAssistantPhase] = useState<'idle' | 'understanding' | 'searching' | 'responding'>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load persisted intro state
  useEffect(() => {
    const seen = checkSeenIntro();
    setHasSeenIntro(seen);
    const pref = getPreferredRole();
    if (pref) setSelectedRole(pref);
    // If already seen, default view to chat (but drawer still closed)
    if (seen) {
      setView('chat');
    }
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Handle open logic: first time -> intro, else chat
  const handleOpen = useCallback(() => {
    if (hasSeenIntro) {
      setView('chat');
      // init welcome if empty
      if (messages.length === 0) {
        const role = getPreferredRole();
        const welcome = getWelcomeMessage(role, language);
        setMessages([
          {
            id: `welcome-${Date.now()}`,
            role: 'assistant',
            text: welcome,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } else {
      setView('intro');
    }
    setIsOpen(true);
  }, [hasSeenIntro, messages.length, language]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    stopListening();
    stopSpeaking();
  }, []);

  // Allow Farmer Help panel to open this same assistant (reuse, no second chatbot)
  useEffect(() => {
    const handler = () => handleOpen();
    window.addEventListener('farmdirect:open-assistant', handler as EventListener);
    return () => window.removeEventListener('farmdirect:open-assistant', handler as EventListener);
  }, [handleOpen]);

  // Keyboard escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) handleClose();
    };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, handleClose]);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!('speechSynthesis' in window) || !text) return;
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        const isHi = /[\u0900-\u097F]/.test(text) || /mujhe|chahiye|paas|dhoondho/.test(text.toLowerCase());
        utter.lang = isHi ? 'hi-IN' : 'en-IN';
        utter.rate = 0.95;
        utter.onstart = () => setIsSpeaking(true);
        utter.onend = () => setIsSpeaking(false);
        utter.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utter);
      } catch {
        setIsSpeaking(false);
      }
    },
    []
  );

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!hasSpeechRecognition()) {
      setLastError(language === 'hi' ? 'वॉयस उपलब्ध नहीं — टाइप करें' : 'Voice not supported — please type');
      inputRef.current?.focus();
      return;
    }
    stopSpeaking();
    setLastError(null);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    recognitionRef.current = rec;
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    rec.onstart = () => {
      setIsListening(true);
      setAssistantPhase('idle');
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = (event: any) => {
      setIsListening(false);
      const err = event?.error || '';
      if (err === 'not-allowed' || err === 'permission-denied') {
        const msg = language === 'hi' ? 'माइक्रोफ़ोन की अनुमति नहीं दी गई। ब्राउज़र सेटिंग्स में अनुमति दें।' : 'Microphone permission denied. Please allow access in browser settings.';
        setLastError(msg);
        setMessages((prev) => [...prev, { id: `err-${Date.now()}`, role: 'assistant', text: msg, timestamp: new Date().toISOString() } as ChatMessage]);
      } else if (err === 'no-speech') {
        const msg = language === 'hi' ? 'मैंने कुछ नहीं सुना। कृपया फिर से बोलें।' : "I didn't catch that. Please speak again.";
        setLastError(msg);
        setMessages((prev) => [...prev, { id: `err-${Date.now()}`, role: 'assistant', text: msg, timestamp: new Date().toISOString() } as ChatMessage]);
      } else if (err === 'audio-capture') {
        const msg = language === 'hi' ? 'माइक्रोफ़ोन नहीं मिला।' : 'No microphone found.';
        setLastError(msg);
        setMessages((prev) => [...prev, { id: `err-${Date.now()}`, role: 'assistant', text: msg, timestamp: new Date().toISOString() } as ChatMessage]);
      } else if (err === 'network') {
        const msg = language === 'hi' ? 'नेटवर्क त्रुटि।' : 'Network error.';
        setLastError(msg);
      } else if (err && err !== 'aborted') {
        setLastError(language === 'hi' ? `वॉयस त्रुटि: ${err}` : `Voice error: ${err}`);
      }
    };
    rec.onresult = (event: any) => {
      const t = event.results[0][0].transcript as string;
      if (!t || !t.trim()) {
        setLastError(language === 'hi' ? 'मैंने कुछ नहीं सुना।' : "I didn't catch that.");
        setIsListening(false);
        return;
      }
      setInput(t);
      setIsListening(false);
      setTimeout(() => handleSend(t), 150);
    };
    rec.onnomatch = () => {
      setIsListening(false);
      const msg = language === 'hi' ? 'मैंने कुछ नहीं सुना।' : "I didn't catch that. Please try again.";
      setLastError(msg);
      setMessages((prev) => [...prev, { id: `err-${Date.now()}`, role: 'assistant', text: msg, timestamp: new Date().toISOString() } as ChatMessage]);
    };
    try {
      rec.start();
    } catch (e: any) {
      setIsListening(false);
      const msg = e?.message?.includes('not-allowed') ? (language === 'hi' ? 'माइक्रोफ़ोन अनुमति नहीं।' : 'Microphone permission denied.') : (language === 'hi' ? 'माइक शुरू नहीं हो पाया।' : 'Could not start microphone.');
      setLastError(msg);
    }
  }, [language]);

  const handleSelectRole = (role: AssistantRole) => {
    setSelectedRole(role);
    if (role) setPreferredRole(role);
    // also sync demo role
    if (role === 'buyer') setRole('consumer');
    if (role === 'farmer') setRole('farmer');
  };

  const handleStartChatting = () => {
    markIntroSeen();
    setHasSeenIntro(true);
    const welcome = getWelcomeMessage(selectedRole, language);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        text: welcome,
        timestamp: new Date().toISOString(),
      },
    ]);
    setView('chat');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSend = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || isProcessing) return;
    console.log('[FRONTEND] request started with text:', text);
    console.log('[FRONTEND] calling /api/voice-intent');
    const userMsg = createUserMessage(text);
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);
    setLastError(null);
    // Use granular backend steps tied to real promises (no artificial delays) — mirrors VoiceAssistant flow
    try {
      setAssistantPhase('understanding');
      console.log('[FRONTEND] voice-intent request in progress...');
      let parsed: any;
      try {
        parsed = await parseVoiceIntent(text);
        console.log('[FRONTEND] voice-intent response received:', parsed);
      } catch (e: any) {
        console.error('[FRONTEND] voice-intent failed:', e);
        throw e;
      }

      // Validate parsed intent structure
      if (!parsed || typeof parsed.intent !== 'string') {
        throw new Error('Invalid intent');
      }

      setAssistantPhase('searching');
      console.log('[FRONTEND] starting marketplace search with intent:', parsed);
      let marketplaceResults: any = null;
      let buyerDemandResults: any = null;
      let inventoryResults: any = null;
      let addedProduce: any = null;
      const context: any = {};
      const lower = text.toLowerCase();
      const isAddIntent = /(\badd\b|\bhave\b|\bhain\b|\bpaas\b.*\bhai\b|\bbechna\b|\bI have\b)/i.test(text) && !!parsed.product && !!parsed.quantity;
      const isShowInventory = /show.*inventory|my inventory|my produce|stock|inventory dikhao/i.test(lower);
      const isShowBuyers = /show.*buyers|buyers.*looking|who.*interested|khareedar|buyers dhoondho|demand/i.test(lower);

      try {
        if ((parsed.intent === 'SELLER' || selectedRole === 'farmer') && isAddIntent) {
          console.log('[FRONTEND] SELLER add flow via /api/produce');
          const { farmerInventoryService } = await import('../../services/farmerInventoryService');
          const catMap: Record<string, string> = {
            Tomato: 'vegetables', Potato: 'vegetables', Onion: 'vegetables', Wheat: 'grains', Rice: 'grains', Cauliflower: 'vegetables', Cabbage: 'vegetables', Carrot: 'vegetables', Peas: 'vegetables', Apple: 'fruits', Banana: 'fruits', Mango: 'fruits',
          };
          const category = (catMap[parsed.product] || 'vegetables') as any;
          try {
            const p = await farmerInventoryService.addProduce({
              produceName: parsed.product,
              category,
              quantity: parsed.quantity,
              unit: (parsed.unit as any) || 'kg',
              grade: (parsed.quality as any) || 'Grade A',
              expectedPrice: parsed.price || 25,
              location: parsed.location || 'Dasna, Ghaziabad',
              state: 'Uttar Pradesh',
              harvestDate: new Date().toISOString().slice(0, 10),
              farmerId: 'f-001',
            });
            addedProduce = { id: p.id, name: p.name, quantityKg: p.quantityKg };
            context.buyersFound = 1;
            try {
              const br = await fetch(`/api/buyer-requirements?product=${encodeURIComponent(parsed.product)}`);
              if (br.ok) {
                const list = await br.json();
                buyerDemandResults = { requirements: list.slice(0, 6).map((r: any) => ({ id: r.id, produceName: r.produceName, category: r.category, grade: r.grade, quantityKg: r.quantityKg, budgetPerKg: r.budgetPerKg, location: r.location || r.buyerName, buyerName: r.buyerName || r.buyerId, buyerId: r.buyerId })), total: list.length };
                context.buyersFound = buyerDemandResults.total;
              }
            } catch {}
          } catch (e) {
            console.warn('[FRONTEND] addProduce failed, fallback', e);
          }
        } else if ((parsed.intent === 'SELLER' || selectedRole === 'farmer') && isShowInventory) {
          console.log('[FRONTEND] fetching inventory via /api/produce');
          const res = await fetch('/api/produce?farmerId=f-001');
          if (!res.ok) throw new Error(`inventory ${res.status}`);
          const list = await res.json();
          console.log('[FRONTEND] inventory results:', list.length);
          inventoryResults = { produce: list.slice(0, 20).map((p: any) => ({ id: p.id, name: p.name, category: p.category, grade: p.grade, quantityKg: p.quantityKg, expectedPricePerKg: p.expectedPricePerKg, location: p.location, harvestDate: p.harvestDate })), total: list.length };
        } else if ((parsed.intent === 'SELLER' || selectedRole === 'farmer') && isShowBuyers) {
          console.log('[FRONTEND] fetching buyer demand via /api/buyer-requirements');
          const url = parsed.product ? `/api/buyer-requirements?product=${encodeURIComponent(parsed.product)}` : '/api/buyer-requirements';
          const res = await fetch(url);
          if (!res.ok) throw new Error(`buyer ${res.status}`);
          const list = await res.json();
          console.log('[FRONTEND] buyer demand results:', list.length);
          buyerDemandResults = { requirements: list.slice(0, 6).map((r: any) => ({ id: r.id, produceName: r.produceName, category: r.category, grade: r.grade, quantityKg: r.quantityKg, budgetPerKg: r.budgetPerKg, location: r.location || r.buyerName, buyerName: r.buyerName || r.buyerId, buyerId: r.buyerId })), total: list.length };
          context.buyersFound = buyerDemandResults.total;
        } else {
          // Default BUYER marketplace search via backend
          console.log('[FRONTEND] calling /api/marketplace/search');
          const res = await fetch('/api/marketplace/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parsedIntent: parsed, role: selectedRole, text, filters: {} }),
          });
          console.log('[FRONTEND] marketplace search status:', res.status);
          if (!res.ok) throw new Error(`search ${res.status}`);
          const data = await res.json();
          console.log('[FRONTEND] marketplace search results:', data);
          marketplaceResults = data;
          context.farmersFound = data.total;
          context.farmerNames = data.results?.slice(0, 3).map((r: any) => r.farmer?.name || r.name) ?? [];
          if (data.total > 0) context.supply = { fulfilledKg: data.results.reduce((a: number, b: any) => a + b.quantityKg, 0), remainingKg: 0, isFulfilled: true };
        }
      } catch (e: any) {
        console.warn('[FRONTEND] searching fallback to local matching', e);
        // Fallback to local matching if backend search fails (but not network hard failure)
        if (e?.message?.includes('Failed to fetch') || e?.message?.includes('backend')) {
          throw e;
        }
        // For other errors, we continue to responding with empty context
      }

      setAssistantPhase('responding');
      console.log('[FRONTEND] calling /api/assistant-response');
      const replyText = await generateAssistantResponse(parsed, context, text);
      console.log('[FRONTEND] final response received:', replyText.slice(0, 120));
      if (!replyText || !replyText.trim()) throw new Error('empty');

      // Build reply object compatible with createAssistantMessage
      const reply = {
        text: replyText,
        parsedIntent: parsed,
        suggestions: marketplaceResults ? [`View ${marketplaceResults.total} results for ${parsed.product ?? 'your query'}`] : buyerDemandResults ? [`View ${buyerDemandResults.total} buyers`] : inventoryResults ? [`Inventory: ${inventoryResults.total} lots`] : [],
        context,
        marketplaceResults,
        buyerDemandResults,
        inventoryResults,
        addedProduce,
      };
      const assistantMsg = createAssistantMessage(reply);
      setMessages((prev) => [...prev, assistantMsg]);
      speak(assistantMsg.text);
      setLastError(null);
    } catch (e: any) {
      const msg = e?.message || '';
      let errorText: string;
      if (msg.includes('timeout') || e?.name === 'AbortError') {
        errorText = language === 'hi' ? 'AI ने समय पर जवाब नहीं दिया। कृपया फिर से कोशिश करें।' : 'AI timed out. Please try again.';
      } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        errorText = language === 'hi' ? 'नेटवर्क या बैकएंड उपलब्ध नहीं। कृपया कनेक्शन जांचें।' : 'Network or backend unavailable. Please check connection.';
      } else if (msg.includes('empty')) {
        errorText = language === 'hi' ? 'AI ने खाली जवाब दिया। कृपया फिर से कोशिश करें।' : 'AI returned empty response. Please try again.';
      } else {
        errorText = language === 'hi' ? 'क्षमा करें, कुछ गड़बड़ हुई। कृपया फिर से कोशिश करें।' : 'Sorry, something went wrong. Please try again.';
      }
      setLastError(errorText);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: errorText,
          timestamp: new Date().toISOString(),
        } as ChatMessage,
      ]);
    } finally {
      setIsProcessing(false);
      setAssistantPhase('idle');
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    handleSend(prompt);
  };

  const handleNavigateToVoice = () => {
    const target = selectedRole === 'farmer' ? '/farmer/voice' : '/consumer/voice';
    if (selectedRole === 'farmer') setRole('farmer');
    else setRole('consumer');
    navigate(target);
    handleClose();
  };

  // Prevent background scroll when open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* ===== Collapsed Floating Button ===== */}
      {!isOpen && (
        <div className="fixed z-30 bottom-20 lg:bottom-6 right-3 sm:right-4 lg:right-6 flex flex-col items-end gap-2 pointer-events-none">
          {/* Tooltip hint - desktop only */}
          <div className="hidden lg:flex pointer-events-auto mb-1 mr-1">
            <div className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-lg">
              {language === 'hi' ? 'सहायता चाहिए?' : 'Need help?'}
            </div>
          </div>

          <button
            onClick={handleOpen}
            aria-label="Ask FarmDirect AI"
            className="pointer-events-auto group relative inline-flex items-center justify-center sm:justify-start gap-2.5 p-2 sm:pl-2 sm:pr-5 sm:py-2.5 rounded-full bg-white border border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:border-emerald-200 hover:bg-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30
            w-14 h-14 sm:w-auto sm:h-auto"
          >
            {/* Pulse rings - subtle */}
            <span className="absolute inset-0 rounded-full animate-pulse bg-emerald-500/10 pointer-events-none" style={{ animationDuration: '2.5s' }} />
            <span className="absolute -inset-0.5 rounded-full border border-emerald-500/20 pointer-events-none opacity-60" />

            <span className="relative w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform shrink-0">
              <Sparkles size={18} />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
            </span>

            <span className="relative text-left hidden sm:block">
              <span className="block text-xs font-black tracking-tight text-slate-900 leading-none">Ask FarmDirect AI</span>
              <span className="block text-[11px] font-medium text-emerald-600 leading-none mt-0.5">
                {language === 'hi' ? 'हिंदी • Hinglish • English' : 'Hindi • Hinglish • English'}
              </span>
            </span>

            <span className="relative hidden sm:flex w-6 h-6 rounded-full bg-white/10 items-center justify-center text-white/80 group-hover:bg-white group-hover:text-emerald-600 transition-colors">
              <MessageCircle size={12} />
            </span>
          </button>

          {/* Mobile micro hint */}
          <span className="pointer-events-none hidden sm:hidden text-[10px] font-medium text-slate-500 bg-slate-50/80 backdrop-blur px-2 py-0.5 rounded-full border border-slate-200">
            Tap to chat
          </span>
        </div>
      )}

      {/* ===== Drawer / Side Panel ===== */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop - subtle, non-blocking feel, click to close */}
          <div
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <div
            className="
              relative w-full flex flex-col
              bg-white border-slate-200 shadow-2xl
              animate-in slide-in-from-right duration-300
              sm:rounded-l-3xl lg:rounded-l-3xl
              h-[86vh] sm:h-[86vh] lg:h-full
              sm:max-w-[420px] lg:max-w-[400px]
              mt-auto sm:mt-0
              rounded-t-3xl sm:rounded-t-none
              border-t sm:border-t-0 sm:border-l
              max-h-[86vh] sm:max-h-none lg:max-h-none
            "
            role="dialog"
            aria-modal="true"
            aria-label="FarmDirect AI Assistant"
          >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-200 bg-slate-50 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md">
                  <Sparkles size={16} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 leading-none tracking-tight">FarmDirect AI</p>
                  <p className="text-[11px] font-medium text-emerald-600 leading-none mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {view === 'intro'
                      ? language === 'hi'
                        ? 'आपका बाज़ार सहायक'
                        : 'Your marketplace assistant'
                      : isListening
                        ? language === 'hi'
                          ? 'सुन रहा हूँ...'
                          : 'Listening...'
                        : isProcessing
                          ? assistantPhase === 'understanding'
                            ? language === 'hi'
                              ? 'समझ रहा हूँ...'
                              : 'Understanding...'
                            : assistantPhase === 'searching'
                              ? language === 'hi'
                                ? 'खोज रहा हूँ...'
                                : 'Searching...'
                              : language === 'hi'
                                ? 'जवाब बना रहा हूँ...'
                                : 'Responding...'
                          : isSpeaking
                            ? language === 'hi'
                              ? 'बोल रहा हूँ...'
                              : 'Speaking...'
                            : language === 'hi'
                              ? 'ऑनलाइन'
                              : 'Online'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {view === 'chat' && (
                  <button
                    onClick={() => {
                      setMessages([]);
                      setView('intro');
                      // keep seen flag so user can re-enter chat quickly, but allow revisiting intro
                    }}
                    className="hidden sm:inline-flex text-[11px] font-semibold text-slate-400 hover:text-slate-900 px-2.5 py-1 rounded-full hover:bg-white transition-colors"
                    title="Show intro"
                  >
                    Intro
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                  aria-label="Close assistant"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain bg-white">
              {view === 'intro' ? (
                <div className="p-5 space-y-5">
                  {/* Title */}
                  <div className="text-center pt-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[11px] font-bold mb-3">
                      <Leaf size={12} /> SIH 26033 • Voice-First
                    </div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Meet FarmDirect AI</h2>
                    <p className="text-sm text-slate-400 mt-2 leading-relaxed max-w-[32ch] mx-auto">
                      Your AI assistant for buying and selling fresh produce directly from farmers.
                    </p>
                  </div>

                  {/* Capabilities */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white border border-slate-200 p-3.5 hover:border-emerald-500/20 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 mb-2.5">
                        <ShoppingBag size={16} />
                      </div>
                      <p className="text-xs font-black tracking-widest uppercase text-emerald-600">Buy</p>
                      <p className="text-xs text-slate-400 mt-1 leading-snug">Find products, compare prices and discover the best deals.</p>
                    </div>
                    <div className="rounded-2xl bg-white border border-slate-200 p-3.5 hover:border-amber-500/20 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-2.5">
                        <Tractor size={16} />
                      </div>
                      <p className="text-xs font-black tracking-widest uppercase text-amber-600">Sell</p>
                      <p className="text-xs text-slate-400 mt-1 leading-snug">Add your produce, manage inventory and find interested buyers.</p>
                    </div>
                    <div className="rounded-2xl bg-white border border-slate-200 p-3.5 hover:border-blue-500/20 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-2.5">
                        <Users size={16} />
                      </div>
                      <p className="text-xs font-black tracking-widest uppercase text-blue-400">Match</p>
                      <p className="text-xs text-slate-400 mt-1 leading-snug">Get matched with relevant farmers or buyers.</p>
                    </div>
                    <div className="rounded-2xl bg-white border border-slate-200 p-3.5 hover:border-purple-500/20 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-2.5">
                        <Mic size={16} />
                      </div>
                      <p className="text-xs font-black tracking-widest uppercase text-purple-400">Voice</p>
                      <p className="text-xs text-slate-400 mt-1 leading-snug">Talk naturally in Hindi, English or Hinglish.</p>
                    </div>
                  </div>

                  {/* Role selection */}
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-slate-900 text-center">How would you like to use FarmDirect AI?</p>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleSelectRole('buyer')}
                        className={`relative flex flex-col items-center gap-2 p-3.5 rounded-2xl border-2 text-left transition-all ${
                          selectedRole === 'buyer'
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            selectedRole === 'buyer' ? 'bg-white text-emerald-600' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          }`}
                        >
                          <ShoppingBag size={18} />
                        </span>
                        <span className={`text-xs font-black ${selectedRole === 'buyer' ? 'text-white' : 'text-white'}`}>I&apos;m a Buyer</span>
                        <span className={`text-[11px] leading-tight text-center ${selectedRole === 'buyer' ? 'text-emerald-50' : 'text-slate-400'}`}>
                          Find fresh produce
                        </span>
                        {selectedRole === 'buyer' && (
                          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white text-emerald-600 flex items-center justify-center">
                            <ChevronRight size={12} />
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => handleSelectRole('farmer')}
                        className={`relative flex flex-col items-center gap-2 p-3.5 rounded-2xl border-2 text-left transition-all ${
                          selectedRole === 'farmer'
                            ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            selectedRole === 'farmer' ? 'bg-white text-amber-400' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          }`}
                        >
                          <Tractor size={18} />
                        </span>
                        <span className={`text-xs font-black ${selectedRole === 'farmer' ? 'text-slate-900' : 'text-white'}`}>I&apos;m a Farmer / Seller</span>
                        <span className={`text-[11px] leading-tight text-center ${selectedRole === 'farmer' ? 'text-slate-700' : 'text-slate-400'}`}>
                          Sell your produce
                        </span>
                        {selectedRole === 'farmer' && (
                          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white text-amber-600 flex items-center justify-center">
                            <ChevronRight size={12} />
                          </span>
                        )}
                      </button>
                    </div>

                    {!selectedRole && (
                      <p className="text-[11px] text-center text-amber-300/80">Choose a role to personalize suggestions</p>
                    )}
                  </div>

                  {/* Start chatting + mic */}
                  <div className="space-y-3 pt-1">
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleStartChatting}
                      className="w-full justify-center text-sm font-black"
                      icon={<MessageCircle size={18} />}
                    >
                      Start chatting
                    </Button>

                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-slate-50" />
                      <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-500">or</span>
                      <div className="h-px flex-1 bg-slate-50" />
                    </div>

                    <button
                      onClick={() => {
                        if (!selectedRole) handleSelectRole('buyer');
                        handleStartChatting();
                        setTimeout(() => startListening(), 400);
                      }}
                      className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl bg-white hover:bg-white border border-slate-200 hover:border-slate-600 text-slate-700 transition-colors group"
                    >
                      <span className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                        <Mic size={16} />
                      </span>
                      <span className="text-left">
                        <span className="block text-xs font-bold text-slate-900">Tap to speak</span>
                        <span className="block text-[11px] text-slate-500">Hindi • Hinglish • English</span>
                      </span>
                      <ArrowRight size={16} className="ml-auto text-slate-500 group-hover:text-slate-900" />
                    </button>

                    <p className="text-[11px] text-center text-slate-500 px-2">
                      After this intro, we&apos;ll take you straight to chat next time.
                    </p>
                  </div>
                </div>
              ) : (
                // ===== Chat View =====
                <div className="flex flex-col h-full">
                  {/* Role badge */}
                  {selectedRole && (
                    <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700">
                        {selectedRole === 'buyer' ? <ShoppingBag size={12} className="text-emerald-600" /> : <Tractor size={12} className="text-amber-600" />}
                        {selectedRole === 'buyer'
                          ? language === 'hi'
                            ? 'खरीदार मोड'
                            : 'Buyer mode'
                          : language === 'hi'
                            ? 'किसान मोड'
                            : 'Farmer mode'}
                      </span>
                      <button
                        onClick={() => {
                          const next: AssistantRole = selectedRole === 'buyer' ? 'farmer' : 'buyer';
                          handleSelectRole(next);
                        }}
                        className="text-[11px] font-semibold text-slate-400 hover:text-slate-900"
                      >
                        Switch
                      </button>
                    </div>
                  )}

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    {messages.map((m) => (
                      <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                            m.role === 'user'
                              ? 'bg-emerald-500 text-white rounded-br-sm'
                              : 'bg-white border border-slate-200 text-slate-900 rounded-bl-sm'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.text}</p>
                          {m.suggestions && m.suggestions.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              {m.suggestions.map((s) => (
                                <button
                                  key={s}
                                  onClick={() => handleQuickPrompt(s)}
                                  className="px-2.5 py-1 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700 hover:text-slate-900 transition-colors"
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          )}
                          {/* Structured results from backend (real marketplace data, not fictional) */}
                          {m.role === 'assistant' && (m as any).marketplaceResults && (m as any).marketplaceResults.results?.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="text-[11px] font-bold tracking-widest uppercase text-emerald-600">
                                Marketplace Results • {(m as any).marketplaceResults.total} found
                              </p>
                              {(m as any).marketplaceResults.results.slice(0, 3).map((r: any) => (
                                <div
                                  key={r.id}
                                  className="flex gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-200 transition-colors cursor-pointer"
                                  onClick={() => {
                                    navigate(`/product/${r.id}`);
                                    handleClose();
                                  }}
                                >
                                  <div className="w-12 h-12 rounded-lg bg-white overflow-hidden shrink-0">
                                    <img
                                      src={r.image || `https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=80`}
                                      alt={r.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-900 truncate">{r.name}</p>
                                    <p className="text-[11px] text-slate-400 flex items-center gap-2">
                                      <span className="flex items-center gap-1">
                                        <Package size={10} /> {r.quantityKg} kg
                                      </span>
                                      <span className="flex items-center gap-1 text-emerald-600 font-bold">
                                        <IndianRupee size={10} /> {r.expectedPricePerKg}/kg
                                      </span>
                                    </p>
                                    <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                                      <MapPin size={10} /> {r.location} {r.farmer?.name ? `• ${r.farmer.name}` : ''}
                                    </p>
                                  </div>
                                  <Eye size={14} className="text-slate-500 shrink-0 mt-1" />
                                </div>
                              ))}
                              {(m as any).marketplaceResults.total > 3 && (
                                <button
                                  onClick={() => {
                                    navigate('/consumer/matches');
                                    handleClose();
                                  }}
                                  className="w-full text-[11px] font-semibold text-emerald-600 hover:text-emerald-300 flex items-center justify-center gap-1 py-1"
                                >
                                  View all {(m as any).marketplaceResults.total} in marketplace <ArrowRight size={11} />
                                </button>
                              )}
                            </div>
                          )}
                          {m.role === 'assistant' && (m as any).addedProduce && (
                            <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex gap-2.5 items-center">
                              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                              <div>
                                <p className="text-xs font-bold text-emerald-300">Added to inventory via backend</p>
                                <p className="text-[11px] text-slate-700">
                                  {(m as any).addedProduce.name} • {(m as any).addedProduce.quantityKg} kg
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  navigate('/farmer?tab=my-produce');
                                  handleClose();
                                }}
                                className="ml-auto text-[11px] px-2 py-1 rounded-full bg-emerald-500 text-white font-bold"
                              >
                                View
                              </button>
                            </div>
                          )}
                          {m.role === 'assistant' && (m as any).inventoryResults && (m as any).inventoryResults.produce?.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="text-[11px] font-bold tracking-widest uppercase text-amber-600">
                                Your Inventory • {(m as any).inventoryResults.total} lots
                              </p>
                              {(m as any).inventoryResults.produce.slice(0, 3).map((p: any) => (
                                <div key={p.id} className="flex gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200">
                                  <Package size={14} className="text-amber-600 mt-0.5 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                                    <p className="text-[11px] text-slate-500">
                                      {p.quantityKg} kg • ₹{p.expectedPricePerKg}/kg • {p.location}
                                    </p>
                                  </div>
                                </div>
                              ))}
                              <button
                                onClick={() => {
                                  navigate('/farmer?tab=inventory');
                                  handleClose();
                                }}
                                className="w-full text-[11px] font-semibold text-amber-600 hover:text-amber-300 flex items-center justify-center gap-1 py-1"
                              >
                                Open inventory <ArrowRight size={11} />
                              </button>
                            </div>
                          )}
                          {m.role === 'assistant' && (m as any).buyerDemandResults && (m as any).buyerDemandResults.requirements?.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="text-[11px] font-bold tracking-widest uppercase text-blue-400">
                                Buyer Demand • {(m as any).buyerDemandResults.total} requests
                              </p>
                              {(m as any).buyerDemandResults.requirements.slice(0, 3).map((r: any) => (
                                <div key={r.id} className="flex gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200">
                                  <Users size={14} className="text-blue-400 mt-0.5 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-900 truncate">
                                      {r.buyerName} • <span className="text-blue-400">{r.produceName}</span>
                                    </p>
                                    <p className="text-[11px] text-slate-500">
                                      {r.quantityKg} kg • ₹{r.budgetPerKg}/kg • {r.location}
                                    </p>
                                  </div>
                                </div>
                              ))}
                              <button
                                onClick={() => {
                                  navigate('/farmer/buyers');
                                  handleClose();
                                }}
                                className="w-full text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1 py-1"
                              >
                                View buyers <ArrowRight size={11} />
                              </button>
                            </div>
                          )}
                          <p className={`text-[10px] mt-1.5 ${m.role === 'user' ? 'text-emerald-100/70' : 'text-slate-500'}`}>
                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}

                    {isProcessing && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-3.5 py-3 w-full">
                          <div className="space-y-2">
                            <div className={`flex items-center gap-2 ${assistantPhase === 'understanding' ? 'text-amber-400' : 'text-slate-500'}`}>
                              <Brain size={14} className={assistantPhase === 'understanding' ? 'animate-pulse' : ''} />
                              <span className="text-xs font-semibold">{assistantPhase === 'understanding' ? (language === 'hi' ? 'समझ रहा हूँ...' : 'Understanding...') : 'Understanding'}</span>
                              {assistantPhase === 'understanding' && <Loader2 size={12} className="animate-spin ml-auto" />}
                            </div>
                            <div className={`flex items-center gap-2 ${assistantPhase === 'searching' ? 'text-blue-400' : 'text-slate-500'}`}>
                              <Search size={14} className={assistantPhase === 'searching' ? 'animate-pulse' : ''} />
                              <span className="text-xs font-semibold">{assistantPhase === 'searching' ? (language === 'hi' ? 'FarmDirect में खोज...' : 'Searching FarmDirect...') : 'Searching FarmDirect'}</span>
                              {assistantPhase === 'searching' && <Loader2 size={12} className="animate-spin ml-auto" />}
                            </div>
                            <div className={`flex items-center gap-2 ${assistantPhase === 'responding' ? 'text-purple-400' : 'text-slate-500'}`}>
                              <Sparkles size={14} className={assistantPhase === 'responding' ? 'animate-pulse' : ''} />
                              <span className="text-xs font-semibold">{assistantPhase === 'responding' ? (language === 'hi' ? 'जवाब बना रहा हूँ...' : 'Generating response...') : 'Response'}</span>
                              {assistantPhase === 'responding' && <Loader2 size={12} className="animate-spin ml-auto" />}
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-2">
                            {assistantPhase === 'understanding'
                              ? language === 'hi'
                                ? 'आपकी बात को पार्स कर रहा हूँ...'
                                : 'Parsing your request via AI...'
                              : assistantPhase === 'searching'
                                ? language === 'hi'
                                  ? 'बाज़ार डेटा में खोज...'
                                  : 'Querying marketplace database...'
                                : language === 'hi'
                                  ? 'AI जवाब बना रहा है...'
                                  : 'AI is crafting response...'}
                          </p>
                        </div>
                      </div>
                    )}

                    {isListening && (
                      <div className="flex justify-center">
                        <div className="px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-1.5 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                          Listening… speak now
                        </div>
                      </div>
                    )}

                    {/* Quick prompts when empty-ish */}
                    {messages.length <= 1 && !isProcessing && (
                      <div className="pt-2">
                        <p className="text-[11px] font-semibold tracking-wide uppercase text-slate-500 mb-2">
                          {language === 'hi' ? 'कोशिश करें' : 'Try asking'}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {quickPromptsForRole(selectedRole, language).map((p) => (
                            <button
                              key={p}
                              onClick={() => handleQuickPrompt(p)}
                              className="px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:border-emerald-200 hover:bg-white text-xs text-slate-700 hover:text-slate-900 transition-colors text-left"
                            >
                              &quot;{p}&quot;
                            </button>
                          ))}
                        </div>

                        <div className="mt-4 p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                          <p className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                            <Volume2 size={12} /> {language === 'hi' ? 'वॉयस से तेज़' : 'Faster with voice'}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {language === 'hi'
                              ? 'बोलें: “मुझे 500 किलो टमाटर चाहिए” या “मेरे पास 2 टन आलू हैं”'
                              : 'Say: “I need 500 kg tomatoes” or “I have 2 tonnes potatoes”'}
                          </p>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Voice quick action */}
                  {hasSpeechRecognition() && (
                    <div className="px-4 py-2 border-t border-slate-200 bg-slate-900/20 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 hidden sm:inline">
                        {selectedRole === 'farmer'
                          ? language === 'hi'
                            ? 'उदा. “Mere paas 2 ton aloo hain”'
                            : 'e.g. “I have 2 tonnes potatoes”'
                          : language === 'hi'
                            ? 'उदा. “Mujhe 500 kg tamatar chahiye”'
                            : 'e.g. “I need 500 kg tomatoes”'}
                      </span>
                      <button
                        onClick={handleNavigateToVoice}
                        className="ml-auto text-[11px] font-semibold text-emerald-600 hover:text-emerald-300 flex items-center gap-1"
                      >
                        Open full voice page <ArrowRight size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer input - only in chat view */}
            {view === 'chat' && (
              <div className="shrink-0 p-3 sm:p-3.5 border-t border-slate-200 bg-slate-50/80 backdrop-blur">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-end gap-2"
                >
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={
                        selectedRole === 'farmer'
                          ? language === 'hi'
                            ? 'बताइए, क्या बेचना है…'
                            : 'What do you want to sell…'
                          : language === 'hi'
                            ? 'बताइए, क्या चाहिए…'
                            : 'What do you need…'
                      }
                      className="w-full h-11 pl-3 pr-10 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-200"
                      disabled={isProcessing}
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-[10px] text-slate-500">
                      {input.length > 0 ? `${input.length}` : ''}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    disabled={isProcessing}
                    className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                      isListening
                        ? 'bg-rose-500 border-rose-500 text-slate-900 animate-pulse'
                        : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    aria-label={isListening ? 'Stop listening' : 'Start voice input'}
                    title={isListening ? 'Stop' : 'Voice'}
                  >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>

                  <button
                    type="submit"
                    disabled={!input.trim() || isProcessing}
                    className="w-11 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20 transition-colors"
                    aria-label="Send message"
                  >
                    {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </form>

                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Bot size={10} className="text-emerald-600" />
                    {language === 'hi' ? 'हिंदी / Hinglish / English' : 'Hindi / Hinglish / English'}
                    {isSpeaking && <span className="ml-2 text-teal-600 flex items-center gap-1 animate-pulse">● Speaking</span>}
                  </p>
                  {isSpeaking ? (
                    <button
                      onClick={stopSpeaking}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300"
                    >
                      Stop
                    </button>
                  ) : (
                    messages.length > 0 && (
                      <button
                        onClick={() => {
                          if (messages[messages.length - 1]?.role === 'assistant') speak(messages[messages.length - 1].text);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-900"
                      >
                        Replay
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Intro footer hint */}
            {view === 'intro' && (
              <div className="shrink-0 px-5 py-3 border-t border-slate-200 bg-slate-50">
                <p className="text-[11px] text-center text-slate-500">
                  {language === 'hi' ? 'बंद करने के लिए बाहर क्लिक करें या Esc दबाएँ' : 'Click outside or press Esc to close • Non-blocking'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};





