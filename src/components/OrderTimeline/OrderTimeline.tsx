import React from 'react';
import { OrderTimelineItem } from '../../types';
import { useDemo } from '../../context/DemoContext';
import { Card } from '../ui/Card';
import { CheckCircle2, Mic, PhoneCall, Warehouse, Truck, Award } from 'lucide-react';

interface OrderTimelineProps {
  timeline: OrderTimelineItem[];
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ timeline }) => {
  const { language } = useDemo();

  const getIcon = (iconName: string, size = 16) => {
    switch (iconName) {
      case 'Mic': return <Mic size={size} />;
      case 'CheckCircle2': return <CheckCircle2 size={size} />;
      case 'PhoneCall': return <PhoneCall size={size} />;
      case 'Warehouse': return <Warehouse size={size} />;
      case 'Truck': return <Truck size={size} />;
      case 'Award': return <Award size={size} />;
      default: return <CheckCircle2 size={size} />;
    }
  };

  return (
    <Card className="border-slate-700/80 bg-slate-800/90">
      <h3 className="font-bold text-slate-100 text-sm sm:text-base mb-4 flex items-center justify-between">
        <span>{language === 'hi' ? 'लाइव ऑर्डर प्रगति' : 'Live Order Journey & P0 Pipeline'}</span>
        <span className="text-xs text-emerald-400 font-normal">
          {timeline.filter(t => t.status === 'completed').length} of {timeline.length} {language === 'hi' ? 'चरण पूर्ण' : 'Steps Complete'}
        </span>
      </h3>

      <div className="space-y-4">
        {timeline.map((step, idx) => (
          <div key={step.id} className="flex items-start gap-3 relative">
            {idx < timeline.length - 1 && (
              <div
                className={`absolute left-4 top-7 bottom-0 w-0.5 ${
                  step.status === 'completed' ? 'bg-emerald-500/80' : 'bg-slate-700'
                }`}
              />
            )}

            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${
                step.status === 'completed'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : step.status === 'in_progress'
                  ? 'bg-amber-500 text-white animate-pulse ring-4 ring-amber-500/20'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              {getIcon(step.iconName, 15)}
            </div>

            <div className="flex-1 pb-2">
              <div className="flex items-center justify-between">
                <h4 className={`text-sm font-semibold ${
                  step.status === 'completed' ? 'text-slate-200' : step.status === 'in_progress' ? 'text-amber-400 font-bold' : 'text-slate-400'
                }`}>
                  {language === 'hi' ? step.titleHi : step.title}
                </h4>
                {step.timestamp && (
                  <span className="text-xs font-mono text-slate-400">{step.timestamp}</span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'hi' ? step.descriptionHi : step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
