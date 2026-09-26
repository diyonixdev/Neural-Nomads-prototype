import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  Tractor,
  Package,
  Plus,
  Wallet,
  BarChart3,
  ClipboardList,
  Leaf,
  ShieldCheck,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { role, language } = useDemo();
  const location = useLocation();

  const consumerNav = [
    { to: '/consumer', icon: LayoutDashboard, label: 'Overview', labelHi: 'डैशबोर्ड' },
    { to: '/login', icon: ShieldCheck, label: 'Kisan Portal & e-KYC', labelHi: 'किसान पोर्टल (लॉगिन)', highlight: true },
    { to: '/demand-forecast', icon: BarChart3, label: 'Market Demand & Trends', labelHi: 'बाजार मांग व रुझान' },
    { to: '/consumer/voice', icon: Mic, label: 'Voice Assistant', labelHi: 'वॉयस सहायक' },
    { to: '/consumer/matches', icon: Users, label: 'Farmer Matches', labelHi: 'किसान मिलान' },
    { to: '/consumer/call', icon: PhoneCall, label: 'Direct Call', labelHi: 'सीधी बातचीत' },
    { to: '/consumer/order', icon: FileText, label: 'Order Summary', labelHi: 'ऑर्डर सारांश' },
    { to: '/consumer/storage', icon: Warehouse, label: 'Cold Storage', labelHi: 'कोल्ड स्टोरेज' },
    { to: '/consumer/logistics', icon: Truck, label: 'EV Logistics', labelHi: 'ईवी लॉजिस्टिक्स' },
    { to: '/consumer/tracking', icon: MapPin, label: 'Live Tracking', labelHi: 'लाइव ट्रैकिंग' },
    { to: '/consumer/impact', icon: TrendingUp, label: 'Impact & Savings', labelHi: 'बचत और प्रभाव' },
  ];

  // Seller: clearly separate experience — 7 items as requested, amber/teal identity
  const farmerNav = [
    { to: '/farmer', icon: LayoutDashboard, label: 'Dashboard', labelHi: 'डैशबोर्ड', end: true },
    { to: '/login', icon: ShieldCheck, label: 'Kisan Portal & e-KYC', labelHi: 'किसान पोर्टल (लॉगिन)', highlight: true },
    { to: '/farmer/demand', icon: BarChart3, label: 'Demand Forecasting', labelHi: 'मांग पूर्वानुमान' },
    { to: '/farmer?tab=my-produce', icon: Leaf, label: 'My Produce', labelHi: 'मेरी उपज' },
    { to: '/farmer?tab=add-produce', icon: Plus, label: 'Add Produce', labelHi: 'उपज जोड़ें' },
    { to: '/farmer?tab=inventory', icon: Package, label: 'Inventory', labelHi: 'इन्वेंटरी' },
    { to: '/farmer/buyers', icon: Users, label: 'Buyer Requests', labelHi: 'खरीदार अनुरोध' },
    { to: '/farmer/order', icon: ClipboardList, label: 'Orders', labelHi: 'ऑर्डर' },
    { to: '/farmer?tab=earnings', icon: Wallet, label: 'Earnings', labelHi: 'कमाई' },
    { to: '/farmer/voice', icon: Mic, label: 'Voice Add', labelHi: 'वॉयस जोड़ें' },
    { to: '/farmer/connection', icon: PhoneCall, label: 'Direct Connect', labelHi: 'सीधा संपर्क' },
  ];

  const currentNav = role === 'consumer' ? consumerNav : farmerNav;

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-slate-200 p-4 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto shadow-sm">
      {/* Role Badge Indicator — distinct styling */}
      <div className={`mb-4 p-3 rounded-2xl border flex items-center gap-3 ${role === 'farmer' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${role === 'farmer' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
          {role === 'consumer' ? <ShoppingBag size={20} /> : <Tractor size={20} />}
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            {language === 'hi' ? 'सक्रिय मोड' : 'Active Flow'}
          </span>
          <p className="text-xs font-bold text-slate-800">
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
          const isSeller = role === 'farmer';
          // Handle query param active for farmer tabs
          const fullPath = location.pathname + location.search;
          const isQueryActive = item.to.includes('?') ? fullPath === item.to : location.pathname === item.to.split('?')[0] && (item as any).end ? location.pathname === item.to : location.pathname.startsWith(item.to.split('?')[0]);
          // For items with ?tab=, check search exactly
          const activeViaQuery = item.to.includes('?tab=') ? fullPath === item.to : undefined;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={(item as any).end}
              className={({ isActive }) => {
                const active = activeViaQuery !== undefined ? activeViaQuery : isActive || isQueryActive;
                if (isSeller) {
                  return `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    active
                      ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                  }`;
                }
                return `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  active
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                }`;
              }}
            >
              <div className="flex items-center gap-3">
                <Icon size={17} className="transition-transform group-hover:scale-110 shrink-0" />
                <span>{language === 'hi' ? item.labelHi : item.label}</span>
              </div>
              {item.highlight && (
                <span className={`w-2 h-2 rounded-full animate-pulse ${role === 'farmer' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Prototype Note */}
      <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5 text-emerald-600 font-semibold mb-1">
          <Sparkles size={12} />
          <span>P0 Core Flow Ready</span>
        </div>
        <p className="leading-tight">Zero intermediaries direct agricultural trade prototype.</p>
      </div>
    </aside>
  );
};
