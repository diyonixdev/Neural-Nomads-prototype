import React from 'react';
import { NavLink } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import {
  LayoutDashboard,
  Mic,
  Users,
  FileText,
  MapPin,
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { role, language } = useDemo();

  const consumerLinks = [
    { to: '/consumer', icon: LayoutDashboard, label: 'Home', labelHi: 'होम' },
    { to: '/consumer/voice', icon: Mic, label: 'Voice', labelHi: 'वॉयस', special: true },
    { to: '/consumer/matches', icon: Users, label: 'Farmers', labelHi: 'किसान' },
    { to: '/consumer/order', icon: FileText, label: 'Order', labelHi: 'ऑर्डर' },
    { to: '/consumer/tracking', icon: MapPin, label: 'Track', labelHi: 'ट्रैक' },
  ];

  const farmerLinks = [
    { to: '/farmer', icon: LayoutDashboard, label: 'Home', labelHi: 'होम' },
    { to: '/farmer/voice', icon: Mic, label: 'Voice', labelHi: 'वॉयस', special: true },
    { to: '/farmer/buyers', icon: Users, label: 'Buyers', labelHi: 'खरीदार' },
    { to: '/farmer/connection', icon: Users, label: 'Connect', labelHi: 'संपर्क' },
    { to: '/farmer/order', icon: FileText, label: 'Order', labelHi: 'ऑर्डर' },
  ];

  const currentLinks = role === 'consumer' ? consumerLinks : farmerLinks;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-3 py-2">
      <div className="flex items-center justify-around">
        {currentLinks.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/consumer' || link.to === '/farmer'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center p-1 rounded-xl transition-all ${
                  link.special
                    ? '-mt-5 bg-emerald-500 text-white p-3 rounded-full shadow-lg shadow-emerald-500/30'
                    : isActive
                    ? 'text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <Icon size={link.special ? 22 : 19} />
              <span className={`text-[10px] mt-0.5 ${link.special ? 'hidden' : 'block'}`}>
                {language === 'hi' ? link.labelHi : link.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};
