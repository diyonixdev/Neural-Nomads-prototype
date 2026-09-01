import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VoiceAssistant } from '../../components/VoiceAssistant/VoiceAssistant';
import { Card } from '../../components/ui/Card';
import { Sparkles, CheckCircle2, ShieldCheck, Zap, Loader2 } from 'lucide-react';
import { useDemo } from '../../context/DemoContext';
import { matchFarmers } from '../../services/aiService';
import type { ParsedVoiceIntent } from '../../services/aiService';

export const ConsumerVoicePage: React.FC = () => {
  const { language, parsedIntent, setParsedIntent, setLastSpokenText, setFarmerMatchResults } = useDemo();
  const navigate = useNavigate();
  const [isFinding, setIsFinding] = useState(false);
  const [findError, setFindError] = useState<string | null>(null);

  const handleParsedResult = useCallback(
    (intent: ParsedVoiceIntent, originalText: string) => {
      setParsedIntent(intent);
      setLastSpokenText(originalText);
      setFarmerMatchResults([]);
      setFindError(null);
    },
    [setParsedIntent, setLastSpokenText, setFarmerMatchResults]
  );

  const handleFindFarmers = useCallback(() => {
    setFindError(null);
    setIsFinding(true);
    try {
      const requirement = parsedIntent;
      // If we have a valid BUYER requirement with product, pre-compute filtered results
      // Otherwise navigate immediately and let Market page show general listings
      // This ensures ALWAYS opens Market per spec, while still using requirement to filter when available
      if (requirement && requirement.intent === 'BUYER' && requirement.product) {
        const results = matchFarmers(requirement);
        setFarmerMatchResults(results);
      } else {
        // No valid filter — clear previous filtered results so Market shows general Farmers Market
        // Keep requirement in context if exists so Market can display banner/filter hint
        setFarmerMatchResults([]);
      }
      // Always navigate immediately to existing Market page (reuses /consumer/matches)
      // Browser back navigates to /consumer/voice correctly
      navigate('/consumer/matches');
    } catch (e) {
      console.error(e);
      // Even on error, still navigate to Market — show friendly message there
      setFarmerMatchResults([]);
      navigate('/consumer/matches');
    } finally {
      setIsFinding(false);
    }
  }, [parsedIntent, setFarmerMatchResults, navigate]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-300">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          {language === 'hi' ? 'वॉयस-फर्स्ट खरीदार सहायक' : 'Voice-First Consumer Assistant'}
        </h1>
        <p className="text-slate-400 text-sm">
          {language === 'hi'
            ? 'अपनी आवश्यक फसल, मात्रा, और डिलीवरी स्थान स्वाभाविक भाषा में बोलें।'
            : 'Speak what you need in plain Hindi or English. Our NLP parses requirement and matches nearby farmers.'}
        </p>
      </div>

      <VoiceAssistant mode="consumer" onParsedResult={handleParsedResult} onProceed={handleFindFarmers} />

      {isFinding && (
        <Card className="bg-slate-900/60 border-slate-800 p-4 flex items-center gap-3">
          <Loader2 size={18} className="animate-spin text-emerald-400" />
          <p className="text-sm text-slate-200">
            {language === 'hi' ? 'Suitable farmers dhoondh rahe hain...' : 'Finding suitable farmers...'}
          </p>
        </Card>
      )}

      {findError && !isFinding && (
        <Card className="bg-rose-500/10 border-rose-500/20 p-4">
          <p className="text-sm text-rose-200">{findError}</p>
        </Card>
      )}

      <Card className="bg-slate-900/60 border-slate-800 p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <Sparkles size={14} className="text-emerald-400" />
          <span>{language === 'hi' ? 'एआई वॉयस इंजन की विशेषताएं' : 'How the Voice AI Pipeline Works'}</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="space-y-1">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-400" /> Indic NLP
            </span>
            <p className="text-slate-400 text-[11px]">Understands mixed Hindi/Hinglish agricultural terms & units (Katta, Ton, Quintal).</p>
          </div>
          <div className="space-y-1">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-teal-400" /> Grade Detection
            </span>
            <p className="text-slate-400 text-[11px]">Extracts quality specs (Grade A, Organic, Table Variety) automatically.</p>
          </div>
          <div className="space-y-1">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Zap size={13} className="text-amber-400" /> Zero-Lag Geo
            </span>
            <p className="text-slate-400 text-[11px]">Instantly filters FPOs and farmers within optimal transit radius.</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
