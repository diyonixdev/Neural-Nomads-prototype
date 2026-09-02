import React from 'react';
import { Buyer } from '../../types';
import { useDemo } from '../../context/DemoContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { MapPin, Building, ShieldCheck, PhoneCall } from 'lucide-react';
import { formatCurrency, formatKg } from '../../utils/formatters';

interface BuyerCardProps {
  buyer: Buyer;
  onConnect?: (buyer: Buyer) => void;
}

export const BuyerCard: React.FC<BuyerCardProps> = ({ buyer, onConnect }) => {
  const { language } = useDemo();

  return (
    <Card hover className="flex flex-col justify-between border-slate-200 bg-white shadow-sm">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={buyer.avatar}
              alt={buyer.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-teal-200"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  {language === 'hi' ? buyer.nameHi : buyer.name}
                </h3>
                {buyer.verified && (
                  <ShieldCheck size={16} className="text-teal-600" />
                )}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Building size={12} className="text-slate-400" />
                {buyer.type}
              </p>
            </div>
          </div>
          <Badge variant="blue" size="sm">
            {buyer.type}
          </Badge>
        </div>

        {/* Demand Info */}
        <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">{language === 'hi' ? 'मांग (फसल)' : 'Required Produce'}:</span>
            <span className="font-semibold text-slate-900">{buyer.requiredProduce}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">{language === 'hi' ? 'मात्रा' : 'Required Quantity'}:</span>
            <span className="font-bold text-amber-600">{formatKg(buyer.requiredQuantityKg)}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">{language === 'hi' ? 'बजट दर' : 'Budget Target'}:</span>
            <span className="font-bold text-emerald-600">{formatCurrency(buyer.budgetPerKg)}/kg</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1 border-t border-slate-200">
            <MapPin size={12} className="text-emerald-600 shrink-0" />
            <span className="truncate">{buyer.location}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-slate-200">
        <Button
          variant="primary"
          className="w-full"
          icon={<PhoneCall size={16} />}
          onClick={() => onConnect?.(buyer)}
        >
          {language === 'hi' ? 'सीधा संपर्क करें' : 'Connect with Buyer'}
        </Button>
      </div>
    </Card>
  );
};
