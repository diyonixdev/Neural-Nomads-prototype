import React, { useState } from 'react';
import { useDemo } from '../../context/DemoContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { Sprout, RotateCcw, Globe, ShoppingBag, Tractor, Menu, X, Sparkles, Mic, Store, User, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';

export const Topbar: React.FC = () => {
  const { role, setRole, language, toggleLanguage, resetDemo } = useDemo();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const navItems = [
    { label: language === 'hi' ? 'होम' : 'Home', labelEn: 'Home', to: '/', end: true },
    { label: language === 'hi' ? 'बाज़ार' : 'Marketplace', labelEn: 'Marketplace', to: '/consumer/matches', end: false },
    { label: language === 'hi' ? 'किसानों के लिए' : 'For Farmers', labelEn: 'For Farmers', to: '/farmer', end: false },
    { label: language === 'hi' ? 'AI सहायक' : 'AI Assistant', labelEn: 'AI Assistant', to: role === 'farmer' ? '/farmer/voice' : '/consumer/voice', end: false },
    { label: language === 'hi' ? 'किसान पोर्टल' : 'Kisan Portal', labelEn: 'Kisan Portal', to: '/login', end: false },
  ];

  const isActive = (to: string, end: boolean) => {
    if (end) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <div
          onClick={() => {
            navigate('/');
            setMobileOpen(false);
          }}
          className="flex items-center gap-3 cursor-pointer group shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <Sprout size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                FarmDirect AI
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                SIH 26033
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-slate-500 leading-none">
              Two-Sided Voice-First Agri Marketplace
            </p>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to + item.labelEn}
              to={item.to}
              end={item.end}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all border ${
                isActive(item.to, item.end)
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-transparent'
              }`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Desktop Role Switcher Pill - acts as Login/Profile switcher */}
          <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => handleRoleChange('consumer')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                role === 'consumer'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ShoppingBag size={14} />
              <span>{language === 'hi' ? 'उपभोक्ता' : 'Buyer'}</span>
            </button>
            <button
              onClick={() => handleRoleChange('farmer')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                role === 'farmer'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Tractor size={14} />
              <span>{language === 'hi' ? 'किसान' : 'Seller'}</span>
            </button>
          </div>

          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            title="Toggle Language"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
          >
            <Globe size={14} className="text-emerald-600" />
            <span>{language === 'en' ? 'हिंदी' : 'EN'}</span>
          </button>

          {/* Profile / Login button - desktop */}
          <div className="hidden sm:flex items-center gap-2">
            {isAuthenticated && user ? (
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors shadow-sm"
                title="Go to Kisan Portal Dashboard"
              >
                <ShieldCheck size={15} className="text-emerald-600" />
                <span className="max-w-[120px] truncate">{user.name}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
                title="Sign In / Digital e-KYC"
              >
                <ShieldCheck size={14} className="text-emerald-200" />
                <span>{language === 'hi' ? 'लॉग इन / पहचान' : 'Login / e-KYC'}</span>
              </button>
            )}
          </div>

          {/* Reset Demo Button - desktop only */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            icon={<RotateCcw size={14} />}
            title="Reset Prototype to Initial Demo State"
            className="hidden xl:inline-flex"
          >
            {language === 'hi' ? 'रीसेट' : 'Reset'}
          </Button>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Dropdown */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-3">
            <nav className="grid grid-cols-2 gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to + item.labelEn + '-mobile'}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold border transition-all ${
                    isActive(item.to, item.end)
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  {item.labelEn === 'Home' && <Store size={16} />}
                  {item.labelEn === 'Marketplace' && <ShoppingBag size={16} />}
                  {item.labelEn === 'For Farmers' && <Tractor size={16} />}
                  {item.labelEn === 'AI Assistant' && <Mic size={16} />}
                  {item.labelEn === 'Kisan Portal' && <ShieldCheck size={16} />}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Mobile Role Switcher + Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 flex-1">
                <button
                  onClick={() => handleRoleChange('consumer')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    role === 'consumer' ? 'bg-emerald-500 text-white shadow' : 'text-slate-500'
                  }`}
                >
                  <ShoppingBag size={14} /> {language === 'hi' ? 'खरीदार' : 'Buyer'}
                </button>
                <button
                  onClick={() => handleRoleChange('farmer')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    role === 'farmer' ? 'bg-emerald-500 text-white shadow' : 'text-slate-500'
                  }`}
                >
                  <Tractor size={14} /> {language === 'hi' ? 'किसान' : 'Seller'}
                </button>
              </div>
              <Button variant="outline" size="sm" onClick={handleReset} icon={<RotateCcw size={14} />}>
                {language === 'hi' ? 'रीसेट' : 'Reset'}
              </Button>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 justify-center">
              <Sparkles size={12} className="text-emerald-600" />
              <span>Zero commission • Direct farmer-to-buyer</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
