import React from 'react';
import { RouteOptimization } from '../../types';
import { useDemo } from '../../context/DemoContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Navigation, Clock, Fuel, CheckCircle2 } from 'lucide-react';
import { formatDistance } from '../../utils/formatters';

interface RouteCardProps {
  route: RouteOptimization;
}

export const RouteCard: React.FC<RouteCardProps> = ({ route }) => {
  const { language } = useDemo();

  return (
    <Card className="border-slate-700/80 bg-slate-800/90">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Navigation size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm sm:text-base">
              {language === 'hi' ? 'एआई अनुकूलित लॉजिस्टिक्स मार्ग' : 'AI Route Optimization Engine'}
            </h3>
            <p className="text-xs text-slate-400">
              {language === 'hi' ? 'कम उत्सर्जन और न्यूनतम पारगमन समय' : 'Cold-Chain Preserved Green Corridor'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="emerald" icon={<Fuel size={12} />}>
            {route.fuelSavedPct}% {language === 'hi' ? 'ऊर्जा बचत' : 'Efficiency Gain'}
          </Badge>
          <Badge variant="blue" icon={<Clock size={12} />}>
            {route.estimatedTransitTime}
          </Badge>
        </div>
      </div>

      {/* Metric summary */}
      <div className="grid grid-cols-3 gap-3 my-4 p-3.5 bg-slate-900/80 rounded-xl text-center">
        <div>
          <span className="text-xs text-slate-400 block">
            {language === 'hi' ? 'कुल दूरी' : 'Total Distance'}
          </span>
          <span className="text-base font-bold text-slate-100 mt-0.5 block">
            {formatDistance(route.totalDistanceKm)}
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-400 block">
            {language === 'hi' ? 'अनुमानित समय' : 'Transit ETA'}
          </span>
          <span className="text-base font-bold text-emerald-400 mt-0.5 block">
            {route.estimatedTransitTime}
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-400 block">
            {language === 'hi' ? 'कार्बन बचत' : 'CO₂ Footprint'}
          </span>
          <span className="text-base font-bold text-teal-400 mt-0.5 block">
            {route.carbonEmissionKg} kg
          </span>
        </div>
      </div>

      {/* Step by step stops */}
      <div className="space-y-3 mt-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {language === 'hi' ? 'मार्ग पड़ाव विवरण:' : 'Corridor Waypoints:'}
        </h4>
        {route.stops.map((stop, idx) => (
          <div key={stop.id} className="flex items-start gap-3 relative">
            {idx < route.stops.length - 1 && (
              <div className="absolute left-3.5 top-6 bottom-0 w-0.5 bg-slate-700" />
            )}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold z-10 ${
                stop.status === 'completed'
                  ? 'bg-emerald-500 text-white'
                  : stop.status === 'current'
                  ? 'bg-amber-500 text-white animate-pulse ring-4 ring-amber-500/20'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {stop.status === 'completed' ? <CheckCircle2 size={14} /> : idx + 1}
            </div>
            <div className="flex-1 pb-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 text-xs sm:text-sm">
                  {language === 'hi' ? stop.titleHi : stop.title}
                </span>
                <span className="text-xs text-slate-400 font-mono">{stop.timestamp}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{stop.description}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
