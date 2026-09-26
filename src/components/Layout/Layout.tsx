import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { FarmDirectAssistantWidget } from '../Assistant/FarmDirectAssistantWidget';

export const Layout: React.FC = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/auth';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Topbar />

      <div className={`flex-1 flex w-full mx-auto ${isHome || isAuthPage ? 'max-w-[1600px]' : 'max-w-7xl'}`}>
        {/* Hide sidebar on homepage and login page for full portal canvas, show on inner app pages */}
        {!isHome && !isAuthPage && <Sidebar />}

        <main
          className={`flex-1 overflow-y-auto pb-24 lg:pb-8 bg-slate-50 ${
            isHome || isAuthPage ? 'p-0 max-w-none w-full' : 'p-4 sm:p-6 lg:p-8 max-w-5xl'
          }`}
        >
          <Outlet />
        </main>
      </div>

      {!isAuthPage && <BottomNav />}
      {/* Floating FarmDirect AI assistant — voice-first but non-blocking, always available */}
      <FarmDirectAssistantWidget />
    </div>
  );
};
