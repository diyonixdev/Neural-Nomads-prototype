import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PhoneOff, Sparkles, ArrowRight } from 'lucide-react';

export const ConsumerCallPage: React.FC = () => {
  const { selectedMatch, language } = useDemo();
  const navigate = useNavigate();
  const [callStatus, setCallStatus] = useState<'connecting' | 'active' | 'negotiated' | 'ended'>('connecting');

  const farmer = selectedMatch?.farmer;

  useEffect(() => {
    const t1 = setTimeout(() => setCallStatus('active'), 1500);
    const t2 = setTimeout(() => {
      setCallStatus('negotiated');
    }, 5500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-300">
      <div className="text-center">
        <Badge variant="emerald" className="mb-2">
          {language === 'hi' ? 'सीधा संपर्क सिमुलेशन' : 'Direct P2P Connection Simulation'}
        </Badge>
        <h1 className="text-2xl font-bold text-slate-900">
          {language === 'hi' ? 'किसान के साथ सीधी कॉल' : 'Direct Farmer Audio & AI Negotiation'}
        </h1>
      </div>

      {/* Call Interface Box */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center">
        {/* Animated Sound Wave or Status */}
        <div className="flex flex-col items-center">
          <div className="relative mb-6">
            <img
              src={farmer?.avatar}
              alt={farmer?.name}
              className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500 shadow-xl"
            />
            {callStatus === 'active' && (
              <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
            )}
          </div>

          <h2 className="text-xl font-bold text-slate-900">
            {language === 'hi' ? farmer?.nameHi : farmer?.name}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {farmer?.village}, {farmer?.district} • {farmer?.fpoName}
          </p>

          <div className="mt-3">
            {callStatus === 'connecting' && (
              <Badge variant="amber">Connecting secure line...</Badge>
            )}
            {callStatus === 'active' && (
              <Badge variant="emerald">Live Call • 00:34</Badge>
            )}
            {callStatus === 'negotiated' && (
              <Badge variant="purple" icon={<Sparkles size={12} />}>
                Fair Price Agreed: ₹28/kg (Zero Broker Cut)
              </Badge>
            )}
          </div>
        </div>

        {/* Live Subtitles & AI Mediation */}
        <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-emerald-600">
              AI Bilingual Translation & Mediation
            </span>
            <span className="text-[11px] text-slate-500">Auto-transcribed</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2 rounded-lg bg-white border border-slate-200">
              <span className="font-bold text-amber-600">Farmer: </span>
              <span className="text-slate-600">
                "Namaste! Hamare paas 650kg fresh tamatar hai, direct farm pick ho jayega."
              </span>
            </div>
            <div className="p-2 rounded-lg bg-white border border-slate-200">
              <span className="font-bold text-cyan-600">Buyer: </span>
              <span className="text-slate-600">
                "We need 500kg delivered to Ghaziabad by tomorrow morning."
              </span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
              <span className="font-bold text-emerald-600">AI Assistant: </span>
              <span className="text-emerald-700">
                "Fair price locked at ₹28/kg. Farmer gets +47% more than mandi rate, Buyer saves 24%."
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button
            variant="danger"
            size="lg"
            icon={<PhoneOff size={18} />}
            onClick={() => setCallStatus('ended')}
          >
            End Call
          </Button>

          {callStatus === 'negotiated' && (
            <Button
              variant="primary"
              size="lg"
              icon={<ArrowRight size={18} />}
              onClick={() => navigate('/consumer/order')}
            >
              Proceed to Order Lock
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};




