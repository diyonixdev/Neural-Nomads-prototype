import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { mockBuyers } from '../../data/mockData';
import { PhoneOff, Sparkles, ArrowRight } from 'lucide-react';

export const FarmerConnectionPage: React.FC = () => {
  const { language } = useDemo();
  const navigate = useNavigate();
  const buyer = mockBuyers[0];
  const [callStatus, setCallStatus] = useState<'connecting' | 'active' | 'agreed'>('connecting');

  useEffect(() => {
    const t1 = setTimeout(() => setCallStatus('active'), 1500);
    const t2 = setTimeout(() => setCallStatus('agreed'), 5000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-300">
      <div className="text-center">
        <Badge variant="emerald" className="mb-2">
          {language === 'hi' ? 'सीधा संपर्क सिमुलेशन' : 'Direct Producer-Buyer Call'}
        </Badge>
        <h1 className="text-2xl font-bold text-white">
          {language === 'hi' ? 'खरीदार के साथ सीधी बातचीत' : 'Direct Buyer Negotiation Call'}
        </h1>
      </div>

      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center">
        <div className="flex flex-col items-center">
          <img
            src={buyer.avatar}
            alt={buyer.name}
            className="w-24 h-24 rounded-full object-cover border-4 border-teal-500 shadow-xl mb-4"
          />
          <h2 className="text-xl font-bold text-white">{buyer.name}</h2>
          <p className="text-xs text-slate-400">{buyer.location} • {buyer.type}</p>

          <div className="mt-3">
            {callStatus === 'connecting' && <Badge variant="amber">Connecting to Store Procurement Team...</Badge>}
            {callStatus === 'active' && <Badge variant="emerald">Live Call • 00:21</Badge>}
            {callStatus === 'agreed' && (
              <Badge variant="purple" icon={<Sparkles size={12} />}>
                Contract Agreed: 500 kg @ ₹28/kg Direct
              </Badge>
            )}
          </div>
        </div>

        {/* Live Audio Transcript */}
        <div className="mt-6 p-4 bg-slate-950/70 border border-slate-800 rounded-2xl text-left space-y-2 text-xs">
          <span className="font-semibold uppercase tracking-wider text-teal-400 block mb-2">
            AI Automated Price Negotiation Assistant
          </span>
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
            <span className="font-bold text-cyan-400">Buyer Procurement: </span>
            <span className="text-slate-300">
              "We confirm 500 kg Grade A tomatoes at ₹28/kg with instant payment upon delivery."
            </span>
          </div>
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
            <span className="font-bold text-amber-400">Farmer: </span>
            <span className="text-slate-300">
              "Deal pakka. Hum farm pickup ke liye crate pack kar rahe hain."
            </span>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-4">
          <Button variant="danger" size="lg" icon={<PhoneOff size={18} />} onClick={() => navigate('/farmer/buyers')}>
            End Call
          </Button>

          {callStatus === 'agreed' && (
            <Button
              variant="primary"
              size="lg"
              className="bg-teal-500 hover:bg-teal-600 focus:ring-teal-500"
              icon={<ArrowRight size={18} />}
              onClick={() => navigate('/farmer/order')}
            >
              Confirm Dispatch & Payout
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
