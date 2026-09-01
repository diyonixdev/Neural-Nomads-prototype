import React from 'react';
import { MatchScoreDetails } from '../../types';
import { useDemo } from '../../context/DemoContext';
import { Sparkles, CheckCircle, ShieldCheck } from 'lucide-react';

interface MatchScoreProps {
  scoreDetails: MatchScoreDetails;
  size?: 'compact' | 'full';
}

export const MatchScore: React.FC<MatchScoreProps> = ({ scoreDetails, size = 'full' }) => {
  const { language } = useDemo();
  const { overallScore, priceMatch, distanceScore, qualityConfidence, freshnessScore, notes, notesHi } = scoreDetails;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 border-emerald-500 bg-emerald-500/10';
    if (score >= 75) return 'text-amber-400 border-amber-500 bg-amber-500/10';
    return 'text-rose-400 border-rose-500 bg-rose-500/10';
  };

  if (size === 'compact') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${getScoreColor(overallScore)}`}>
        <Sparkles size={12} />
        <span>{overallScore}% Match</span>
      </div>
    );
  }

  const criteria = [
    { label: language === 'hi' ? 'मूल्य दक्षता' : 'Price Advantage', score: priceMatch },
    { label: language === 'hi' ? 'दूरी / निकटता' : 'Proximity', score: distanceScore },
    { label: language === 'hi' ? 'गुणवत्ता विश्वास' : 'Quality Trust', score: qualityConfidence },
    { label: language === 'hi' ? 'ताज़गी स्कोर' : 'Freshness Index', score: freshnessScore },
  ];

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100">
              {language === 'hi' ? 'एआई मिलान सटीकता' : 'AI Match Confidence'}
            </h4>
            <p className="text-xs text-slate-400">
              {language === 'hi' ? 'मंडी बनाम सीधा विश्लेषण' : 'Direct vs Middleman Analysis'}
            </p>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-xl border text-base font-extrabold flex items-center gap-1.5 ${getScoreColor(overallScore)}`}>
          <Sparkles size={16} />
          <span>{overallScore}%</span>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {criteria.map((item, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">{item.label}</span>
              <span className="font-semibold text-slate-200">{item.score}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${item.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Highlights */}
      <div className="pt-3 border-t border-slate-800 space-y-1.5">
        {(language === 'hi' ? notesHi : notes).map((note, idx) => (
          <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
            <CheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5" />
            <span>{note}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
