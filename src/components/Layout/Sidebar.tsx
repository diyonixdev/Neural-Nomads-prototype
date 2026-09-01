import React from 'react';
import { NavLink } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import {
  LayoutDashboard,
  Mic,
  Users,
  PhoneCall,
  FileText,
  Warehouse,
  Truck,
  MapPin,
  TrendingUp,
  Sparkles,
  ShoppingBag,
  Tractor
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { role, language } = useDemo();

  const consumerNav = [
    { to: '/consumer', icon: LayoutDashboard, label: 'Overview', labelHi: 'डैशबोर्ड' },
    { to: '/consumer/voice', icon: Mic, label: 'Voice Assistant', labelHi: 'वॉयस सहायक', highlight: true },
    { to: '/consumer/matches', icon: Users, label: 'Farmer Matches', labelHi: 'किसान मिलान' },
    { to: '/consumer/call', icon: PhoneCall, label: 'Direct Call', labelHi: 'सीधी बातचीत' },
    { to: '/consumer/order', icon: FileText, label: 'Order Summary', labelHi: 'ऑर्डर सारांश' },
    { to: '/consumer/storage', icon: Warehouse, label: 'Cold Storage', labelHi: 'कोल्ड स्टोरेज' },
    { to: '/consumer/logistics', icon: Truck, label: 'EV Logistics', labelHi: 'ईवी लॉजिस्टिक्स' },
    { to: '/consumer/tracking', icon: MapPin, label: 'Live Tracking', labelHi: 'लाइव ट्रैकिंग' },
    { to: '/consumer/impact', icon: TrendingUp, label: 'Impact & Savings', labelHi: 'बचत और प्रभाव' },
  ];

  const farmerNav = [
    { to: '/farmer', icon: LayoutDashboard, label: 'Farmer Overview', labelHi: 'किसान डैशबोर्ड' },
    { to: '/farmer/voice', icon: Mic, label: 'Voice Inventory', labelHi: 'वॉयस इन्वेंटरी', highlight: true },
    { to: '/farmer/buyers', icon: Users, label: 'Matched Buyers', labelHi: 'खरीदार मिलान' },
    { to: '/farmer/connection', icon: PhoneCall, label: 'Direct Connect', labelHi: 'सीधा संपर्क' },
    { to: '/farmer/order', icon: FileText, label: 'Dispatch & Order', labelHi: 'डिस्पैच व भुगतान' },
  ];

  const currentNav = role === 'consumer' ? consumerNav : farmerNav;

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-slate-900/90 border-r border-slate-800 p-4 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
      {/* Role Badge Indicator */}
      <div className="mb-4 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
          {role === 'consumer' ? <ShoppingBag size={20} /> : <Tractor size={20} />}
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            {language === 'hi' ? 'सक्रिय मोड' : 'Active Flow'}
          </span>
          <p className="text-xs font-bold text-slate-200">
            {role === 'consumer'
              ? (language === 'hi' ? 'उपभोक्ता / खरीदार' : 'Buyer / Consumer')
              : (language === 'hi' ? 'किसान / उत्पादक' : 'Farmer / FPO Producer')}
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1">
        {currentNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/consumer' || item.to === '/farmer'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon size={17} className="transition-transform group-hover:scale-110 shrink-0" />
                <span>{language === 'hi' ? item.labelHi : item.label}</span>
              </div>
              {item.highlight && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Prototype Note */}
      <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
          <Sparkles size={12} />
          <span>P0 Core Flow Ready</span>
        </div>
        <p className="leading-tight">Zero intermediaries direct agricultural trade prototype.</p>
      </div>
    </aside>
  );
};
