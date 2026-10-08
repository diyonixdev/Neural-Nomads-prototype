import React from 'react';
import { Tractor, Building2, ShoppingBag, Truck, CheckCircle2 } from 'lucide-react';
import type { UserType } from '../../types/auth';

interface UserTypeSelectorProps {
  selectedType: UserType;
  onSelect: (type: UserType) => void;
}

interface TypeOption {
  id: UserType;
  title: string;
  hindiTitle: string;
  badge: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const OPTIONS: TypeOption[] = [
  {
    id: 'farmer',
    title: 'Farmer / Producer',
    hindiTitle: 'किसान / उत्पादक',
    badge: 'DIRECT SELLER',
    desc: 'List produce via voice or form, get fair mandi-free prices, and receive direct buyer payments.',
    icon: Tractor,
    color: 'emerald',
  },
  {
    id: 'fpo',
    title: 'FPO / Organization',
    hindiTitle: 'कृषक उत्पादक संगठन (FPO)',
    badge: 'AGGREGATOR',
    desc: 'Aggregate crop lots from member farmers, manage shared storage, and negotiate high-volume contracts.',
    icon: Building2,
    color: 'blue',
  },
  {
    id: 'consumer',
    title: 'Consumer / Household',
    hindiTitle: 'उपभोक्ता / परिवार',
    badge: 'RETAIL BUYER',
    desc: 'Buy 100% farm-fresh vegetables and fruits with complete traceability and quality grading.',
    icon: ShoppingBag,
    color: 'teal',
  },
  {
    id: 'buyer',
    title: 'Bulk Buyer / Business',
    hindiTitle: 'थोक खरीदार / व्यापारी',
    badge: 'INSTITUTIONAL',
    desc: 'Post wholesale requirements, verify lot certificates, and schedule temperature-controlled logistics.',
    icon: Truck,
    color: 'amber',
  },
];

export const UserTypeSelector: React.FC<UserTypeSelectorProps> = ({ selectedType, onSelect }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Select Your Account Category
        </label>
        <span className="text-[11px] text-emerald-700 font-semibold">Step 1 of 2</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = selectedType === opt.id;

          return (
            <div
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-emerald-50/70 border-emerald-600 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-2.5">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                        isSelected ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {opt.badge}
                    </span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">{opt.title}</h4>
                  <p className="text-[11px] text-slate-500 font-medium">{opt.hindiTitle}</p>
                </div>

                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{opt.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
