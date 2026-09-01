import React from 'react';
import { useDemo } from '../../context/DemoContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sprout, RotateCcw, Globe, ShoppingBag, Tractor } from 'lucide-react';
import { Button } from '../ui/Button';

export const Topbar: React.FC = () => {
  const { role, setRole, language, toggleLanguage, resetDemo } = useDemo();
  const navigate = useNavigate();
  const location = useLocation();

  const handleRoleChange = (newRole: 'consumer' | 'farmer') => {
    setRole(newRole);
    if (newRole === 'consumer' && !location.pathname.startsWith('/consumer')) {
      navigate('/consumer');
    } else if (newRole === 'farmer' && !location.pathname.startsWith('/farmer')) {
      navigate('/farmer');
    }
  };

  const handleReset = () => {
    resetDemo();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900/90 backdrop-blur-xl border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-3 cursor-pointer group shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <Sprout size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                FarmDirect AI
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                SIH 26033
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-slate-400 leading-none">
              Two-Sided Voice-First Agri Marketplace
            </p>
          </div>
        </div>

        {/* Center/Right Controls: Role Switcher, Language Toggle, Reset Demo */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Role Switcher Pill */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => handleRoleChange('consumer')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                role === 'consumer'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShoppingBag size={14} />
              <span>{language === 'hi' ? 'उपभोक्ता' : 'Consumer'}</span>
            </button>
            <button
              onClick={() => handleRoleChange('farmer')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                role === 'farmer'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Tractor size={14} />
              <span>{language === 'hi' ? 'किसान' : 'Farmer'}</span>
            </button>
          </div>

          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            title="Toggle Language"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
          >
            <Globe size={14} className="text-emerald-400" />
            <span>{language === 'en' ? 'हिंदी' : 'EN'}</span>
          </button>

          {/* Reset Demo Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            icon={<RotateCcw size={14} />}
            title="Reset Prototype to Initial Demo State"
            className="hidden sm:inline-flex"
          >
            {language === 'hi' ? 'रीसेट डेमो' : 'Reset Demo'}
          </Button>
        </div>
      </div>
    </header>
  );
};
