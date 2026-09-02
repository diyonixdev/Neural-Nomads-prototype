import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { StorageCard } from '../../components/StorageCard/StorageCard';
import { mockStorageUnits } from '../../data/mockData';
import { ColdStorageUnit } from '../../types';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const ConsumerStoragePage: React.FC = () => {
  const { activeOrder, updateActiveOrder, language } = useDemo();
  const navigate = useNavigate();

  const handleSelectStorage = (unit: ColdStorageUnit) => {
    updateActiveOrder({ storageAllocated: unit });
    navigate('/consumer/logistics');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/consumer/order')}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Order Summary</span>
          </button>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>{language === 'hi' ? 'सोलर कोल्ड स्टोरेज आवंटन' : 'Cold Storage & Buffer Allocation'}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-200 text-cyan-600 font-semibold">
              IoT Telemetry Active
            </span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Prevent spoilage and maintain farm freshness with solar micro-cooling hubs close to the harvest location.
          </p>
        </div>

        <Button
          variant="primary"
          icon={<ArrowRight size={16} />}
          onClick={() => navigate('/consumer/logistics')}
        >
          Proceed to Logistics
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockStorageUnits.map((unit) => (
          <StorageCard
            key={unit.id}
            unit={unit}
            selected={activeOrder.storageAllocated?.id === unit.id}
            onSelect={handleSelectStorage}
          />
        ))}
      </div>
    </div>
  );
};



