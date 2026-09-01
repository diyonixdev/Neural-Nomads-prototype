import React from 'react';
import { LogisticsVehicle } from '../../types';
import { useDemo } from '../../context/DemoContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Truck, Zap, CheckCircle2, Clock } from 'lucide-react';
import { formatCurrency, formatKg } from '../../utils/formatters';

interface VehicleCardProps {
  vehicle: LogisticsVehicle;
  selected?: boolean;
  onSelect?: (vehicle: LogisticsVehicle) => void;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, selected = false, onSelect }) => {
  const { language } = useDemo();

  return (
    <Card
      hover
      className={`border transition-all ${
        selected
          ? 'border-emerald-500 bg-slate-800 ring-2 ring-emerald-500/20'
          : 'border-slate-700/80 bg-slate-800/80'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Truck size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-100 text-sm sm:text-base">{vehicle.vehicleType}</h3>
              {vehicle.coldChainReady && (
                <Badge variant="blue" size="sm">Active Cold Chain</Badge>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Plate: <span className="font-mono text-slate-300 font-semibold">{vehicle.vehicleNumber}</span>
            </p>
          </div>
        </div>

        {selected ? (
          <Badge variant="emerald" icon={<CheckCircle2 size={12} />}>
            {language === 'hi' ? 'वाहन बुक किया गया' : 'Vehicle Dispatched'}
          </Badge>
        ) : (
          <Badge variant="amber" icon={<Clock size={12} />}>
            ETA {vehicle.etaMins}m
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4 p-3 bg-slate-900/70 rounded-xl text-xs">
        <div>
          <span className="text-slate-400">Pilot / Driver:</span>
          <p className="font-semibold text-slate-200 mt-0.5">{vehicle.driverName}</p>
        </div>
        <div>
          <span className="text-slate-400">Capacity:</span>
          <p className="font-semibold text-slate-200 mt-0.5">{formatKg(vehicle.capacityKg)}</p>
        </div>
        <div className="col-span-2 flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
          <span className="text-emerald-400 flex items-center gap-1 font-medium">
            <Zap size={14} /> CO₂ Reduced: {vehicle.co2SavedKg} kg
          </span>
          <span className="font-bold text-slate-100">Est. Trip: {formatCurrency(vehicle.costEstimate)}</span>
        </div>
      </div>

      {onSelect && (
        <div className="mt-4">
          <Button
            variant={selected ? 'primary' : 'secondary'}
            size="sm"
            className="w-full"
            onClick={() => onSelect(vehicle)}
          >
            {selected
              ? (language === 'hi' ? 'वाहन संलग्न है' : 'Vehicle Assigned')
              : (language === 'hi' ? 'यह ईवी वाहन बुक करें' : 'Assign EV Reefer Logistics')}
          </Button>
        </div>
      )}
    </Card>
  );
};
