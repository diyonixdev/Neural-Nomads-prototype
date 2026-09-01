import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { OrderTimeline } from '../../components/OrderTimeline/OrderTimeline';
import { CheckCircle2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export const FarmerOrderPage: React.FC = () => {
  const { activeOrder, language } = useDemo();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/farmer/buyers')}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Buyers</span>
          </button>
          <h1 className="text-2xl font-black text-white">
            {language === 'hi' ? 'किसान ऑर्डर व त्वरित भुगतान' : 'Farmer Order Dispatch & Settlement'}
          </h1>
          <p className="text-slate-400 text-sm">
            Contract: <span className="font-mono text-teal-400">{activeOrder.id}</span>
          </p>
        </div>
        <Badge variant="emerald" icon={<ShieldCheck size={14} />}>
          Verified Direct Payout
        </Badge>
      </div>

      {/* Payout & Earnings Summary */}
      <Card className="border-teal-500/40 bg-slate-900/90 p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase">Total Guaranteed Payout</span>
            <div className="text-3xl font-black text-emerald-400 mt-1">
              {formatCurrency(activeOrder.totalAmount)}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              500 kg @ {formatCurrency(activeOrder.agreedPricePerKg)}/kg (vs Mandi {formatCurrency(19)}/kg)
            </p>
          </div>

          <div className="text-right">
            <Badge variant="emerald" size="md">
              +{activeOrder.impact.farmerEarningsIncreasePct}% Gain
            </Badge>
            <p className="text-xs text-slate-400 mt-2">Direct Bank Transfer on Delivery</p>
          </div>
        </div>

        {/* Dispatch Status */}
        <div className="space-y-4">
          <OrderTimeline timeline={activeOrder.timeline} />
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => navigate('/consumer/impact')}
          >
            View Platform Impact
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="w-full sm:flex-1 bg-teal-500 hover:bg-teal-600 focus:ring-teal-500"
            icon={<CheckCircle2 size={18} />}
            onClick={() => navigate('/consumer/impact')}
          >
            Complete Order Lifecycle
          </Button>
        </div>
      </Card>
    </div>
  );
};
