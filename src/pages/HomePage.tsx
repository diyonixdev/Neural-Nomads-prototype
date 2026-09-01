import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../context/DemoContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ShoppingBag, Tractor, Sparkles, TrendingUp, ShieldCheck, ArrowRight } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { setRole, language } = useDemo();
  const navigate = useNavigate();

  const handleStartConsumer = () => {
    setRole('consumer');
    navigate('/consumer/voice');
  };

  const handleStartFarmer = () => {
    setRole('farmer');
    navigate('/farmer/voice');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/60 border border-slate-800 p-6 sm:p-10 shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-4">
            <Sparkles size={14} />
            <span>Problem Statement 26033: Elimination of Intermediaries</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Direct Farm-to-Fork with{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
              Voice AI
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
            {language === 'hi'
              ? 'बिचौलियों को हटाकर किसानों की कमाई बढ़ाएं और उपभोक्ताओं को उचित मूल्य पर ताज़ा उपज उपलब्ध कराएं।'
              : 'Empowering both smallholder farmers and consumers to express inventory and demand naturally in Hindi & English, matching directly with zero commission cuts.'}
          </p>
        </div>
      </div>

      {/* Dual Flow Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Consumer Flow Entry */}
        <Card hover className="p-6 border-slate-700/80 bg-slate-800/80 flex flex-col justify-between" onClick={handleStartConsumer}>
          <div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-4">
              <ShoppingBag size={28} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              {language === 'hi' ? 'खरीदार / उपभोक्ता प्रवाह' : 'Buyer Flow'}
            </span>
            <h2 className="text-xl font-bold text-white mt-1">
              {language === 'hi' ? 'उपभोक्ता वॉयस मोड' : 'Consumer Voice Flow'}
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              "{language === 'hi' ? 'मुझे कल गाज़ियाबाद में 500 किलो ग्रेड ए टमाटर चाहिए।' : 'I need 500 kg Grade A tomatoes in Ghaziabad tomorrow.'}"
            </p>

            <div className="mt-4 space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>AI matches direct local FPOs and farmers</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-emerald-400" />
                <span>Save ~24% compared to traditional retail markups</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <Button variant="primary" className="w-full" icon={<ArrowRight size={16} />}>
              {language === 'hi' ? 'उपभोक्ता प्रवाह शुरू करें' : 'Launch Consumer Voice'}
            </Button>
          </div>
        </Card>

        {/* Farmer Flow Entry */}
        <Card hover className="p-6 border-slate-700/80 bg-slate-800/80 flex flex-col justify-between" onClick={handleStartFarmer}>
          <div>
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/30 flex items-center justify-center mb-4">
              <Tractor size={28} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
              {language === 'hi' ? 'किसान / उत्पादक प्रवाह' : 'Farmer Flow'}
            </span>
            <h2 className="text-xl font-bold text-white mt-1">
              {language === 'hi' ? 'किसान वॉयस मोड' : 'Farmer Voice Flow'}
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              "{language === 'hi' ? 'मेरे पास 2 टन ग्रेड ए आलू हैं। मुझे खरीदार ढूंढो।' : 'I have 2 tons of Grade A potatoes. Find me buyers.'}"
            </p>

            <div className="mt-4 space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-teal-400" />
                <span>Direct access to verified bulk buyers & societies</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-teal-400" />
                <span>Earn +47% higher revenue than APMC mandi cut</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <Button variant="primary" className="w-full bg-teal-500 hover:bg-teal-600 focus:ring-teal-500" icon={<ArrowRight size={16} />}>
              {language === 'hi' ? 'किसान प्रवाह शुरू करें' : 'Launch Farmer Voice'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
