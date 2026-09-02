import React, { useEffect, useState } from 'react';
import { X, HelpCircle, ShoppingBag, Tractor, Users, Mic, Bot, ChevronDown, MessageCircle, Volume2, Package, ClipboardList, Sparkles } from 'lucide-react';
import { useDemo } from '../../context/DemoContext';

type HelpLang = 'hi' | 'hinglish' | 'en';

interface FarmerHelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAssistant: () => void;
}

const getInitialHelpLang = (appLang: string): HelpLang => {
  try {
    const saved = localStorage.getItem('farmdirect_help_lang') as HelpLang | null;
    if (saved === 'hi' || saved === 'hinglish' || saved === 'en') return saved;
  } catch {}
  if (appLang === 'hi') return 'hi';
  return 'hinglish';
};

export const FarmerHelpPanel: React.FC<FarmerHelpPanelProps> = ({ isOpen, onClose, onOpenAssistant }) => {
  const { language } = useDemo();
  const [helpLang, setHelpLang] = useState<HelpLang>(() => getInitialHelpLang(language));
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    voiceSteps: true,
    whatCanSay: true,
    buySell: true,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('farmdirect_help_lang');
      if (!saved) {
        setHelpLang(getInitialHelpLang(language));
      }
    } catch {}
  }, [language]);

  const handleLangChange = (l: HelpLang) => {
    setHelpLang(l);
    try { localStorage.setItem('farmdirect_help_lang', l); } catch {}
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const t = content[helpLang];
  const toggle = (k: string) => setExpanded((prev) => ({ ...prev, [k]: !prev[k] }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={onClose} aria-hidden="true" />
      <div
        className="relative w-full flex flex-col bg-white border-slate-200 shadow-2xl animate-in slide-in-from-right duration-300 sm:rounded-l-3xl lg:rounded-l-3xl h-[86vh] sm:h-[86vh] lg:h-full sm:max-w-[440px] lg:max-w-[440px] mt-auto sm:mt-0 rounded-t-3xl sm:rounded-t-none border-t sm:border-t-0 sm:border-l max-h-[86vh] sm:max-h-none overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
      >
        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-slate-200 bg-slate-50/80 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <HelpCircle size={18} />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 leading-tight">{t.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">{t.subtitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors shrink-0 shadow-sm"
              aria-label="Close help"
            >
              <X size={14} />
            </button>
          </div>

          {/* Language selector */}
          <div className="mt-4 grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-white border border-slate-200 shadow-sm">
            {([
              { id: 'hi', label: 'हिंदी' },
              { id: 'hinglish', label: 'Hinglish' },
              { id: 'en', label: 'English' },
            ] as const).map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleLangChange(opt.id as HelpLang)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                  helpLang === opt.id
                    ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4 bg-white">
          {/* BUY / SELL / MATCH / VOICE - 2x2 grid, farmer-friendly */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white border border-slate-200 p-3.5 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-2.5">
                <ShoppingBag size={16} />
              </div>
              <p className="text-xs font-black tracking-wide text-slate-900">{t.cards.buy.title}</p>
              <p className="text-xs text-slate-500 mt-1.5 leading-snug">{t.cards.buy.desc}</p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-3.5 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-2.5">
                <Tractor size={16} />
              </div>
              <p className="text-xs font-black tracking-wide text-slate-900">{t.cards.sell.title}</p>
              <p className="text-xs text-slate-500 mt-1.5 leading-snug">{t.cards.sell.desc}</p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-3.5 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-2.5">
                <Users size={16} />
              </div>
              <p className="text-xs font-black tracking-wide text-slate-900">{t.cards.match.title}</p>
              <p className="text-xs text-slate-500 mt-1.5 leading-snug">{t.cards.match.desc}</p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-3.5 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 mb-2.5">
                <Mic size={16} />
              </div>
              <p className="text-xs font-black tracking-wide text-slate-900">{t.cards.voice.title}</p>
              <p className="text-xs text-slate-500 mt-1.5 leading-snug">{t.cards.voice.desc}</p>
            </div>
          </div>

          {/* VOICE ASSISTANT कैसे इस्तेमाल करें? */}
          <Section
            icon={<Mic size={16} className="text-teal-600" />}
            title={t.voiceGuide.title}
            expanded={expanded.voiceSteps}
            onToggle={() => toggle('voiceSteps')}
            color="teal"
          >
            <div className="space-y-3">
              {t.voiceGuide.steps.map((s: any, idx: number) => (
                <div key={idx} className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-700 shrink-0">
                    {idx + 1}
                  </span>
                  <p className="text-sm text-slate-700 leading-relaxed pt-1">{s.text}</p>
                </div>
              ))}
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200">
                <p className="text-xs font-bold tracking-widest uppercase text-teal-700 flex items-center gap-1.5">
                  <Volume2 size={12} /> {helpLang === 'hi' ? 'उदाहरण' : 'Example'}
                </p>
                <p className="text-sm text-slate-800 mt-1.5 font-medium italic leading-relaxed">“{t.voiceGuide.example}”</p>
              </div>
              <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700 leading-relaxed" start={4}>
                {t.voiceGuide.stepsAfterExample.map((s: string, i: number) => (
                  <li key={i} value={4 + i}>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          </Section>

          {/* WHAT CAN I SAY? */}
          <Section
            icon={<MessageCircle size={16} className="text-amber-600" />}
            title={t.whatCanSay.title}
            expanded={expanded.whatCanSay}
            onToggle={() => toggle('whatCanSay')}
            color="amber"
          >
            <p className="text-xs font-bold text-slate-700 mb-2">{t.whatCanSay.trySaying}</p>
            <div className="space-y-2">
              {t.whatCanSay.examples.map((ex: string, i: number) => (
                <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-sm text-slate-800 font-medium italic">“{ex}”</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-3">
              {helpLang === 'hi'
                ? 'आप हिंदी, Hinglish या English किसी में भी बोल सकते हैं।'
                : helpLang === 'hinglish'
                ? 'Aap Hindi, Hinglish ya English kisi mein bhi bol sakte hain.'
                : 'You can speak in Hindi, Hinglish or English.'}
            </p>
          </Section>

          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
            <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
              <HelpCircle size={12} /> {helpLang === 'hi' ? 'टिप' : 'Tip'}
            </p>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {helpLang === 'hi'
                ? 'हर सेक्शन को खोल/बंद करने के लिए हेडर पर टैप करें।'
                : helpLang === 'hinglish'
                ? 'Har section ko open/close karne ke liye header par tap karein.'
                : 'Tap any section header to expand or collapse.'}
            </p>
          </div>
        </div>

        {/* Footer Voice CTA */}
        <div className="shrink-0 p-4 border-t border-slate-200 bg-slate-50/80 backdrop-blur">
          <button
            onClick={() => {
              onClose();
              setTimeout(() => onOpenAssistant(), 150);
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-white text-sm font-black shadow-lg shadow-emerald-500/20 transition-colors"
          >
            <span className="text-base leading-none">🎤</span>
            {t.voiceCta}
          </button>
          <p className="text-[11px] text-center text-slate-500 mt-2">
            {helpLang === 'hi' ? 'यही FarmDirect AI Voice Assistant खुलेगा' : helpLang === 'hinglish' ? 'Yahi FarmDirect AI Voice Assistant khulega' : 'Opens the existing FarmDirect AI Voice Assistant'}
          </p>
        </div>
      </div>
    </div>
  );
};

const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  color: string;
  children: React.ReactNode;
}> = ({ icon, title, expanded, onToggle, children }) => {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">{icon}</span>
        <span className="flex-1 text-sm font-bold text-slate-900 leading-tight">{title}</span>
        <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && <div className="px-4 pb-4 pt-0">{children}</div>}
    </div>
  );
};

const content: Record<HelpLang, any> = {
  hi: {
    title: 'FarmDirect AI में मदद चाहिए?',
    subtitle: 'Yahan aapko FarmDirect AI use karne ke simple steps milenge.',
    cards: {
      buy: {
        title: 'BUY / खरीदें',
        desc: 'किसान से सीधे ताज़ी फसल खरीदें। अलग-अलग किसानों के उत्पाद और कीमतों की तुलना करें।',
      },
      sell: {
        title: 'SELL / बेचें',
        desc: 'अपनी फसल सीधे खरीदारों को बेचें। अपनी फसल, मात्रा और कीमत आसानी से जोड़ें।',
      },
      match: {
        title: 'MATCH / खरीदार खोजें',
        desc: 'AI आपकी फसल के लिए सही खरीदार खोजने में मदद करता है।',
      },
      voice: {
        title: 'VOICE / आवाज़ से बोलें',
        desc: 'आप हिंदी में बोलकर भी FarmDirect AI का इस्तेमाल कर सकते हैं। आपको टाइप करने की जरूरत नहीं है।',
      },
    },
    voiceGuide: {
      title: 'VOICE ASSISTANT कैसे इस्तेमाल करें?',
      steps: [
        { text: 'माइक बटन पर क्लिक करें।' },
        { text: "माइक की अनुमति माँगे तो 'Allow' दबाएँ।" },
        { text: 'साफ़ और सामान्य आवाज़ में बोलें।' },
      ],
      example: 'मेरे पास 500 किलो Grade A टमाटर हैं।',
      stepsAfterExample: [
        'AI आपकी बात समझेगा और आपकी जानकारी को प्रोसेस करेगा।',
        'AI आपके लिए सही जानकारी, खरीदार या उत्पाद दिखाएगा।',
        'अगर जवाब पसंद आए, तो आगे की कार्रवाई करें।',
      ],
    },
    whatCanSay: {
      title: 'आप AI से क्या बोल सकते हैं?',
      trySaying: 'Try saying:',
      examples: ['मेरी इन्वेंटरी दिखाओ।', 'मेरे टमाटर के खरीदार दिखाओ।', '500 किलो टमाटर जोड़ो।', 'मेरे ऑर्डर दिखाओ।'],
    },
    voiceCta: '🎤 अभी AI से बात करें',
  },
  hinglish: {
    title: 'FarmDirect AI mein help chahiye?',
    subtitle: 'Yahan aapko FarmDirect AI use karne ke simple steps milenge.',
    cards: {
      buy: {
        title: 'BUY / खरीदें',
        desc: 'Kisan se directly fresh fasal khareedein. Alag-alag farmers ke products aur prices compare karein.',
      },
      sell: {
        title: 'SELL / बेचें',
        desc: 'Apni fasal directly buyers ko bechein. Apni fasal, quantity aur price easily add karein.',
      },
      match: {
        title: 'MATCH / खरीदार खोजें',
        desc: 'AI aapki fasal ke liye sahi buyers dhoondhne mein help karta hai.',
      },
      voice: {
        title: 'VOICE / आवाज़ से बोलें',
        desc: 'Aap Hindi mein bolkar bhi FarmDirect AI use kar sakte hain. Aapko type karne ki zarurat nahi hai.',
      },
    },
    voiceGuide: {
      title: 'VOICE ASSISTANT kaise use karein?',
      steps: [
        { text: 'Mic button par click karein.' },
        { text: "Agar microphone permission maange, to 'Allow' dabayein." },
        { text: 'Normal aur clear voice mein boliye.' },
      ],
      example: 'Mere paas 500 kilo Grade A tamatar hain.',
      stepsAfterExample: [
        'AI aapki baat samjhega aur request ko process karega.',
        'AI aapko relevant information, buyers ya products dikhayega.',
        'Agar response sahi lage, to next action karein.',
      ],
    },
    whatCanSay: {
      title: 'Aap AI se kya bol sakte hain?',
      trySaying: 'Try saying:',
      examples: ['Meri inventory dikhao.', 'Mere tamatar ke buyers dikhao.', '500 kilo tamatar add karo.', 'Mere orders dikhao.'],
    },
    voiceCta: '🎤 Abhi AI se baat karein',
  },
  en: {
    title: 'Need help with FarmDirect AI?',
    subtitle: 'Here are simple steps to help you use FarmDirect AI.',
    cards: {
      buy: {
        title: 'BUY / खरीदें',
        desc: 'Buy fresh produce directly from farmers. Compare products and prices from different farmers.',
      },
      sell: {
        title: 'SELL / बेचें',
        desc: 'Sell your produce directly to buyers. Easily add your crop, quantity and price.',
      },
      match: {
        title: 'MATCH / खरीदार खोजें',
        desc: 'AI helps find suitable buyers for your produce.',
      },
      voice: {
        title: 'VOICE / आवाज़ से बोलें',
        desc: 'You can use FarmDirect AI by speaking in Hindi. You do not need to type.',
      },
    },
    voiceGuide: {
      title: 'How to use VOICE ASSISTANT?',
      steps: [
        { text: 'Click the microphone button.' },
        { text: "If your browser asks for microphone permission, click 'Allow'." },
        { text: 'Speak clearly and normally.' },
      ],
      example: 'I have 500 kg of Grade A tomatoes.',
      stepsAfterExample: [
        'AI will understand your request and process it.',
        'AI will show relevant information, buyers, or products.',
        'If the response looks correct, continue with the next action.',
      ],
    },
    whatCanSay: {
      title: 'What can you say to AI?',
      trySaying: 'Try saying:',
      examples: ['Show my inventory.', 'Show buyers for my tomatoes.', 'Add 500 kg tomatoes.', 'Show my orders.'],
    },
    voiceCta: '🎤 Talk to AI now',
  },
};
