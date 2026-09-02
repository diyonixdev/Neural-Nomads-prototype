import React from 'react';
import { FarmerMatch } from '../../types';
import { useDemo } from '../../context/DemoContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { MatchScore } from '../MatchScore/MatchScore';
import { MapPin, Star, TrendingUp, PhoneCall } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface FarmerCardProps {
  match: FarmerMatch;
  onConnect?: (match: FarmerMatch) => void;
  onViewDetails?: (match: FarmerMatch) => void;
}

export const FarmerCard: React.FC<FarmerCardProps> = ({ match, onConnect, onViewDetails }) => {
  const { language } = useDemo();
  const { farmer, produce, matchScore, offeredPricePerKg, estimatedSavingsPct, directGainPct } = match;

  return (
    <Card hover className="flex flex-col justify-between border-slate-200 bg-white shadow-sm">
      <div>
        {/* Header with Avatar & Details */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={farmer.avatar}
              alt={farmer.name}
              className="w-13 h-13 rounded-full object-cover border-2 border-emerald-200"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  {language === 'hi' ? farmer.nameHi : farmer.name}
                </h3>
                {farmer.fpoMember && (
                  <Badge variant="emerald" size="sm">FPO Verified</Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1">
                  <MapPin size={12} className="text-emerald-600" />
                  {farmer.village}, {farmer.district} ({farmer.distanceKm} km)
                </span>
                <span className="flex items-center gap-1 text-amber-600 font-semibold">
                  <Star size={12} className="fill-amber-400 text-amber-500" />
                  {farmer.rating} ({farmer.totalDeals} deals)
                </span>
              </div>
            </div>
          </div>
          <MatchScore scoreDetails={matchScore} size="compact" />
        </div>

        {/* Produce & Price Banner */}
        <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {language === 'hi' ? 'उपलब्ध फसल' : 'Offered Crop'}
              </span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {language === 'hi' ? produce.nameHi : produce.name}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500">
                {language === 'hi' ? 'सीधा मूल्य' : 'Direct Price'}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-emerald-600">
                  {formatCurrency(offeredPricePerKg)}
                </span>
                <span className="text-xs text-slate-500">/kg</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1">
              <TrendingUp size={13} className="text-emerald-600" />
              {language === 'hi' ? `उपभोक्ता बचत: ~${estimatedSavingsPct}%` : `Consumer Savings: ~${estimatedSavingsPct}%`}
            </span>
            <span className="text-emerald-700 font-medium">
              {language === 'hi' ? `किसान का शुद्ध लाभ: +${directGainPct}%` : `Farmer Net Gain: +${directGainPct}%`}
            </span>
          </div>
        </div>

        {/* Detailed Match Factors */}
        <div className="mt-4">
          <MatchScore scoreDetails={matchScore} size="full" />
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-5 pt-4 border-t border-slate-200 flex items-center gap-3">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => onViewDetails?.(match)}
        >
          {language === 'hi' ? 'विवरण देखें' : 'View Breakdown'}
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          icon={<PhoneCall size={16} />}
          onClick={() => onConnect?.(match)}
        >
          {language === 'hi' ? 'सीधा कनेक्ट करें' : 'Connect Directly'}
        </Button>
      </div>
    </Card>
  );
};
