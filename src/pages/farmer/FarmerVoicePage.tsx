import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { VoiceAssistant } from '../../components/VoiceAssistant/VoiceAssistant';
import { Card } from '../../components/ui/Card';
import { Sparkles } from 'lucide-react';
import { useDemo } from '../../context/DemoContext';
import { matchBuyers } from '../../services/aiService';
import type { ParsedVoiceIntent } from '../../services/aiService';

export const FarmerVoicePage: React.FC = () => {
  const { language, setBuyerMatchResults, setParsedIntent } = useDemo();
  const navigate = useNavigate();

  const handleParsedResult = useCallback((intent: ParsedVoiceIntent, _originalText: string) => {
    setParsedIntent(intent);
    const results = matchBuyers(intent);
    setBuyerMatchResults(results);
  }, [setParsedIntent, setBuyerMatchResults]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-300">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          {language === 'hi' ? 'किसान वॉयस इन्वेंटरी सहायक' : 'Farmer Voice Inventory Assistant'}
        </h1>
        <p className="text-slate-500 text-sm">
          {language === 'hi'
            ? 'अपनी फसल की जानकारी अपनी भाषा में बोलें (जैसे: "मेरे पास 2 टन ग्रेड ए आलू हैं।")'
            : 'Speak your harvest details naturally in Hindi or English (e.g. "I have 2 tons of Grade A potatoes.")'}
        </p>
      </div>

      <VoiceAssistant
        mode="farmer"
        onParsedResult={handleParsedResult}
        onProceed={() => navigate('/farmer')}
      />

      <Card className="bg-white border-slate-200 p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          <Sparkles size={14} className="text-teal-600" />
          <span>{language === 'hi' ? 'किसान के लिए वॉयस के लाभ' : 'Farmer-First Voice Capabilities'}</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
          <div>
            <span className="font-semibold text-slate-900 block mb-1">
              {language === 'hi' ? 'बिना टाइपिंग के लिस्टिंग' : 'No Typing Needed'}
            </span>
            <p className="text-slate-500 text-[11px]">Designed for rural connectivity and local dialect recognition.</p>
          </div>
          <div>
            <span className="font-semibold text-slate-900 block mb-1">
              {language === 'hi' ? 'मंडी से बेहतर भाव' : 'Fair Price Discovery'}
            </span>
            <p className="text-slate-500 text-[11px]">AI calculates fair wholesale benchmarks to prevent under-pricing.</p>
          </div>
          <div>
            <span className="font-semibold text-slate-900 block mb-1">
              {language === 'hi' ? 'सीधा संपर्क' : 'Direct Buyer Matching'}
            </span>
            <p className="text-slate-500 text-[11px]">Instant notification sent to supermarkets and bulk procurers.</p>
          </div>
        </div>
      </Card>
    </div>
  );
};


