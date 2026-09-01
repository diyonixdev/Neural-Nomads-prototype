import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { VehicleCard } from '../../components/VehicleCard/VehicleCard';
import { RouteCard } from '../../components/RouteCard/RouteCard';
import { mockLogisticsVehicles } from '../../data/mockData';
import { LogisticsVehicle } from '../../types';
import { ArrowRight, ArrowLeft, Zap } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const ConsumerLogisticsPage: React.FC = () => {
  const { activeOrder, updateActiveOrder, language } = useDemo();
  const navigate = useNavigate();

  const handleSelectVehicle = (vehicle: LogisticsVehicle) => {
    updateActiveOrder({ logisticsAllocated: vehicle });
    navigate('/consumer/tracking');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/consumer/storage')}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Storage</span>
          </button>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <span>{language === 'hi' ? 'ग्रीन ईवी लॉजिस्टिक्स और रूट' : 'EV Cold-Chain Logistics'}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold flex items-center gap-1">
              <Zap size={12} /> Zero Emissions Fleet
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Reefer EV mini-trucks routed directly from farm pre-cooling to buyer doorstep.
          </p>
        </div>

        <Button
          variant="primary"
          icon={<ArrowRight size={16} />}
          onClick={() => navigate('/consumer/tracking')}
        >
          Track Live Dispatch
        </Button>
      </div>

      {/* Route Optimization Preview */}
      {activeOrder.route && (
        <RouteCard route={activeOrder.route} />
      )}

      {/* Available Vehicles Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          Available EV Fleet Pilots Nearby:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mockLogisticsVehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              selected={activeOrder.logisticsAllocated?.id === vehicle.id}
              onSelect={handleSelectVehicle}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
