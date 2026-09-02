import React from 'react';
import { ColdStorageUnit } from '../../types';
import { useDemo } from '../../context/DemoContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Warehouse, Sun, Cpu, Thermometer, Droplets, MapPin, CheckCircle2 } from 'lucide-react';
import { formatKg, formatDistance } from '../../utils/formatters';

interface StorageCardProps {
  unit: ColdStorageUnit;
  selected?: boolean;
  onSelect?: (unit: ColdStorageUnit) => void;
}

export const StorageCard: React.FC<StorageCardProps> = ({ unit, selected = false, onSelect }) => {
  const { language } = useDemo();

  return (
    <Card
      hover
      className={`border transition-all shadow-sm ${
        selected
          ? 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-500/20'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600">
            <Warehouse size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">{unit.name}</h3>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <MapPin size={12} className="text-cyan-600" />
              {unit.location} • {formatDistance(unit.distanceKm)}
            </p>
          </div>
        </div>
        {selected ? (
          <Badge variant="emerald" icon={<CheckCircle2 size={12} />}>
            {language === 'hi' ? 'चयनित' : 'Allocated'}
          </Badge>
        ) : (
          <Badge variant="blue">{unit.facilityType}</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <Thermometer size={14} className="text-cyan-600" />
          <span className="text-slate-700">Temp: {unit.temperatureRange}</span>
        </div>
        <div className="flex items-center gap-2">
          <Droplets size={14} className="text-blue-600" />
          <span className="text-slate-700">RH: {unit.humidityRange}</span>
        </div>
        <div className="flex items-center gap-2">
          {unit.solarPowered && (
            <span className="text-amber-600 flex items-center gap-1">
              <Sun size={14} /> Solar Micro-Grid
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unit.iotMonitored && (
            <span className="text-emerald-600 flex items-center gap-1">
              <Cpu size={14} /> IoT Telemetry
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
        <div>
          <span>Available Space: </span>
          <span className="font-semibold text-slate-900">{formatKg(unit.availableKg)}</span>
        </div>
        <div>
          <span>Rate: </span>
          <span className="font-bold text-emerald-600">₹{unit.dailyRatePerKg}/kg/day</span>
        </div>
      </div>

      {onSelect && (
        <div className="mt-4">
          <Button
            variant={selected ? 'primary' : 'secondary'}
            size="sm"
            className="w-full"
            onClick={() => onSelect(unit)}
          >
            {selected
              ? (language === 'hi' ? 'स्टोरेज आरक्षित है' : 'Storage Allocated')
              : (language === 'hi' ? 'यह स्टोरेज चुनें' : 'Select Storage Slot')}
          </Button>
        </div>
      )}
    </Card>
  );
};
