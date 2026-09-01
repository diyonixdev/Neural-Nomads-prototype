import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ShieldCheck, ArrowRight, ArrowLeft, TrendingDown, TrendingUp } from 'lucide-react';
import { formatCurrency, formatKg } from '../../utils/formatters';

export const ConsumerOrderPage: React.FC = () => {
  const { activeOrder, language } = useDemo();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/consumer/matches')}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Matches</span>
          </button>
          <h1 className="text-2xl font-black text-white">
            {language === 'hi' ? 'सीधा ऑर्डर अनुबंध सारांश' : 'Direct Farm Contract & Order Lock'}
          </h1>
          <p className="text-slate-400 text-sm">
            Contract ID: <span className="font-mono text-emerald-400">{activeOrder.id}</span>
          </p>
        </div>
        <Badge variant="emerald" icon={<ShieldCheck size={14} />}>
          Smart Escrow Protected
        </Badge>
      </div>

      {/* Contract Breakdown Card */}
      <Card className="border-slate-700/80 bg-slate-800/90 p-6 space-y-6">
        {/* Parties */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-slate-700/80">
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 uppercase font-semibold">Farmer / Producer</span>
            <h4 className="font-bold text-white text-base mt-1">{activeOrder.farmer.name}</h4>
            <p className="text-xs text-slate-400">{activeOrder.farmer.village}, {activeOrder.farmer.district}</p>
            <p className="text-xs text-emerald-400 mt-1 font-medium">{activeOrder.farmer.fpoName}</p>
          </div>

          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 uppercase font-semibold">Buyer / Consumer</span>
            <h4 className="font-bold text-white text-base mt-1">{activeOrder.buyer.name}</h4>
            <p className="text-xs text-slate-400">{activeOrder.buyer.location}</p>
            <p className="text-xs text-cyan-400 mt-1 font-medium">{activeOrder.buyer.type}</p>
          </div>
        </div>

        {/* Commodity & Pricing Comparison */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-200">Price & Economic Surplus Breakdown</h3>

          <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Produce & Grade</span>
              <span className="font-semibold text-white">{activeOrder.produce.name} ({activeOrder.produce.grade})</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Quantity</span>
              <span className="font-semibold text-amber-400">{formatKg(activeOrder.quantityKg)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Direct Agreed Rate</span>
              <span className="font-bold text-emerald-400">{formatCurrency(activeOrder.agreedPricePerKg)} / kg</span>
            </div>
            <div className="flex justify-between text-base font-extrabold pt-3 border-t border-slate-800 text-white">
              <span>Total Direct Contract Value</span>
              <span className="text-emerald-400">{formatCurrency(activeOrder.totalAmount)}</span>
            </div>
          </div>

          {/* Intermediary Comparison Banner */}
          <div className="grid grid-cols-2 gap-3 p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl">
            <div>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <TrendingDown size={14} className="text-emerald-400" /> Buyer Paid Middleman Market
              </span>
              <p className="text-base font-bold text-slate-300 mt-0.5 line-through">
                {formatCurrency(activeOrder.retailBenchmarkTotal)}
              </p>
              <span className="text-xs text-emerald-400 font-semibold">
                You saved {formatCurrency(activeOrder.retailBenchmarkTotal - activeOrder.totalAmount)} (24%)
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <TrendingUp size={14} className="text-emerald-400" /> Farmer Mandi Alternative
              </span>
              <p className="text-base font-bold text-slate-300 mt-0.5 line-through">
                {formatCurrency(activeOrder.mandiBenchmarkTotal)}
              </p>
              <span className="text-xs text-emerald-400 font-semibold">
                Farmer earned +{formatCurrency(activeOrder.totalAmount - activeOrder.mandiBenchmarkTotal)} (47%)
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => navigate('/consumer/storage')}
          >
            Assign Solar Cold Storage
          </Button>

          <Button
            variant="primary"
            size="lg"
            className="w-full sm:flex-1"
            icon={<ArrowRight size={18} />}
            onClick={() => navigate('/consumer/storage')}
          >
            Lock Order & Proceed to Storage
          </Button>
        </div>
      </Card>
    </div>
  );
};
