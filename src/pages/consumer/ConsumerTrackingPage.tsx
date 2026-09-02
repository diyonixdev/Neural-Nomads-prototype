import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { OrderTimeline } from '../../components/OrderTimeline/OrderTimeline';
import { RouteCard } from '../../components/RouteCard/RouteCard';
import { Navigation, Phone, Thermometer, ArrowRight, ArrowLeft } from 'lucide-react';

export const ConsumerTrackingPage: React.FC = () => {
  const { activeOrder, language } = useDemo();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/consumer/logistics')}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Logistics</span>
          </button>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>{language === 'hi' ? 'लाइव पारगमन ट्रैकिंग' : 'Real-time Delivery Tracking'}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold animate-pulse">
              ● Live Transit
            </span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Tracking order <span className="font-mono text-emerald-600">{activeOrder.id}</span> with real-time temperature telemetry.
          </p>
        </div>

        <Button
          variant="primary"
          icon={<ArrowRight size={16} />}
          onClick={() => navigate('/consumer/impact')}
        >
          View Economic Impact
        </Button>
      </div>

      {/* Live Map / Sensor HUD Simulation */}
      <Card className="p-6 border-slate-200 bg-white shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Navigation size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Pilot: Suresh Verma</h3>
              <p className="text-xs text-slate-500">EV Reefer • UP 14 BT 9942 • ETA 25 mins</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <Thermometer size={14} className="text-cyan-600" />
              <span className="text-slate-600">Chamber Temp: </span>
              <span className="font-bold text-cyan-700">5.2°C (Optimal)</span>
            </div>
            <Button variant="outline" size="sm" icon={<Phone size={14} />}>
              Call Driver
            </Button>
          </div>
        </div>

        {/* Route Details Component */}
        {activeOrder.route && (
          <div className="mt-6">
            <RouteCard route={activeOrder.route} />
          </div>
        )}
      </Card>

      {/* Timeline Journey */}
      <OrderTimeline timeline={activeOrder.timeline} />
    </div>
  );
};
