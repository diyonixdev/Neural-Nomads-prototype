import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Tractor, Mic, Users, TrendingUp } from 'lucide-react';

export const FarmerDashboardPage: React.FC = () => {
  const { language } = useDemo();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-slate-900/90 border border-slate-800 rounded-3xl">
        <div>
          <div className="flex items-center gap-2 text-teal-400 text-xs font-bold mb-1">
            <Tractor size={14} />
            <span>{language === 'hi' ? 'किसान व एफपीओ पोर्टल' : 'Farmer & FPO Portal'}</span>
          </div>
          <h1 className="text-2xl font-black text-white">
            {language === 'hi' ? 'सीधा खरीदार बाज़ार' : 'Direct Producer Marketplace'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {language === 'hi'
              ? 'अपनी फसल बोलकर लिस्ट करें और बिना मंडी आढ़ती के तुरंत खरीदार पाएं।'
              : 'List your harvest by voice and connect directly with bulk buyers, co-ops, and retail networks.'}
          </p>
        </div>

        <Button
          variant="primary"
          size="lg"
          className="bg-teal-500 hover:bg-teal-600 focus:ring-teal-500"
          icon={<Mic size={18} />}
          onClick={() => navigate('/farmer/voice')}
        >
          {language === 'hi' ? 'फसल की आवाज़ रिकॉर्ड करें' : 'Speak Harvest Inventory'}
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Extra Profit vs Mandi</span>
          <p className="text-xl font-bold text-teal-400 mt-1">+47.3%</p>
          <span className="text-[11px] text-slate-500">₹28/kg vs ₹19/kg APMC</span>
        </Card>

        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Verified Buyers</span>
          <p className="text-xl font-bold text-emerald-400 mt-1">3 Active</p>
          <span className="text-[11px] text-slate-500">within 40km radius</span>
        </Card>

        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Payment Settlement</span>
          <p className="text-xl font-bold text-amber-400 mt-1">Instant Direct</p>
          <span className="text-[11px] text-slate-500">Zero delayed credit</span>
        </Card>

        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <span className="text-xs text-slate-400 font-medium">FPO Trust Score</span>
          <p className="text-xl font-bold text-cyan-400 mt-1">4.9 / 5.0</p>
          <span className="text-[11px] text-slate-500">142 successful deals</span>
        </Card>
      </div>

      {/* Quick Access Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card hover className="p-5 border-slate-800 bg-slate-900/70" onClick={() => navigate('/farmer/voice')}>
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-3">
            <Mic size={20} />
          </div>
          <h3 className="font-bold text-white text-sm">Voice Inventory Assistant</h3>
          <p className="text-xs text-slate-400 mt-1">Speak in Hindi or Hinglish to list your harvest in seconds.</p>
        </Card>

        <Card hover className="p-5 border-slate-800 bg-slate-900/70" onClick={() => navigate('/farmer/buyers')}>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
            <Users size={20} />
          </div>
          <h3 className="font-bold text-white text-sm">Matched Bulk Buyers</h3>
          <p className="text-xs text-slate-400 mt-1">See verified retail stores and co-ops waiting for your produce.</p>
        </Card>

        <Card hover className="p-5 border-slate-800 bg-slate-900/70" onClick={() => navigate('/farmer/order')}>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3">
            <TrendingUp size={20} />
          </div>
          <h3 className="font-bold text-white text-sm">Dispatch & Settlement</h3>
          <p className="text-xs text-slate-400 mt-1">Track farm pickup, solar cold storage, and instant bank payout.</p>
        </Card>
      </div>
    </div>
  );
};
