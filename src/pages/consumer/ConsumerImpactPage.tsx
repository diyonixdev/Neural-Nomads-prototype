import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  TrendingUp,
  TrendingDown,
  Leaf,
  RotateCcw,
  Clock,
  Award
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export const ConsumerImpactPage: React.FC = () => {
  const { activeOrder, resetDemo, language } = useDemo();
  const navigate = useNavigate();

  const comparisonData = [
    {
      metric: 'Farmer Revenue',
      'Traditional Mandi': activeOrder.mandiBenchmarkTotal,
      'FarmDirect AI': activeOrder.totalAmount,
    },
    {
      metric: 'Consumer Cost',
      'Traditional Mandi': activeOrder.retailBenchmarkTotal,
      'FarmDirect AI': activeOrder.totalAmount,
    },
  ];

  const handleRestart = () => {
    resetDemo();
    navigate('/');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="emerald" className="mb-2">
            SIH Problem Statement 26033 Solved
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            {language === 'hi' ? 'आर्थिक व सामाजिक प्रभाव विश्लेषण' : 'Disintermediation & Fair-Price Impact'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Quantifiable value created by connecting farmer directly to consumer with Voice AI.
          </p>
        </div>

        <Button
          variant="outline"
          icon={<RotateCcw size={16} />}
          onClick={handleRestart}
        >
          Restart Full Demo
        </Button>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 bg-gradient-to-br from-emerald-950/40 to-slate-900 border-emerald-500/30">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase mb-1">
            <TrendingUp size={16} />
            <span>Farmer Profit Uplift</span>
          </div>
          <p className="text-3xl font-black text-emerald-400">+{activeOrder.impact.farmerEarningsIncreasePct}%</p>
          <p className="text-xs text-slate-400 mt-1">
            Farmer receives {formatCurrency(activeOrder.agreedPricePerKg)}/kg vs {formatCurrency(19)}/kg mandi rate
          </p>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-teal-950/40 to-slate-900 border-teal-500/30">
          <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase mb-1">
            <TrendingDown size={16} />
            <span>Consumer Price Reduction</span>
          </div>
          <p className="text-3xl font-black text-teal-400">-{activeOrder.impact.consumerPriceDiscountPct}%</p>
          <p className="text-xs text-slate-400 mt-1">
            Buyer pays {formatCurrency(activeOrder.agreedPricePerKg)}/kg vs {formatCurrency(37)}/kg retail markup
          </p>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-cyan-950/40 to-slate-900 border-cyan-500/30">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase mb-1">
            <Award size={16} />
            <span>Middleman Cut Abolished</span>
          </div>
          <p className="text-3xl font-black text-white">{formatCurrency(activeOrder.impact.intermediaryFeeEliminated)}</p>
          <p className="text-xs text-slate-400 mt-1">
            Pure intermediary commission saved directly on this 500kg batch
          </p>
        </Card>
      </div>

      {/* Visual Chart Comparison */}
      <Card className="p-6 border-slate-700/80 bg-slate-900/90">
        <h3 className="text-base font-bold text-white mb-2">
          Economic Value Comparison: Traditional Mandi vs FarmDirect AI (₹)
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Direct bilateral trade captures the spread lost to commission agents, auction fees, and multi-tier handlers.
        </p>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <XAxis dataKey="metric" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" tickFormatter={(val) => `₹${val}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                formatter={(value: number) => [`₹${value.toLocaleString()}`, '']}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Bar dataKey="Traditional Mandi" fill="#ef4444" radius={[6, 6, 0, 0]} />
              <Bar dataKey="FarmDirect AI" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Environmental & Freshness Impact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-5 border-slate-800 bg-slate-900/60 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <Leaf size={24} />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">CO₂ & Spoilage Reduction</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Saved <span className="text-emerald-400 font-semibold">{activeOrder.impact.foodWasteReducedKg} kg</span> harvest spoilage via solar pre-cooling & EV reefer transit.
            </p>
          </div>
        </Card>

        <Card className="p-5 border-slate-800 bg-slate-900/60 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">Farm-to-Fork Speed</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Transit time reduced from 2.5 days (multiple mandi hops) to <span className="text-teal-400 font-semibold">under 3 hours</span>.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
