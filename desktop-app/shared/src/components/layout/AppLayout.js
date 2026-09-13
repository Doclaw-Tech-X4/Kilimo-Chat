import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CalendarDays, Menu, PanelLeftClose, PanelLeftOpen, Wifi, WifiOff } from 'lucide-react';
import TitleBar from './TitleBar';
import Sidebar from './Sidebar';
import { checkBackendHealth } from '../../services/api';

const PAGE_TITLES = {
  '/home': 'Home',
  '/chat': 'AI Expert Chat',
  '/record': 'Voice Record',
  '/weather': 'Weather & Farming Calendar',
  '/market': 'Market Prices',
  '/profile': 'My Profile',
  '/help': 'Help & About',
  '/admin': 'Document Manager',
};

const AppLayout = ({ children }) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState(null);

  const pageTitle =
    PAGE_TITLES[location.pathname] || 'KilimoChat Desktop';

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      const ok = await checkBackendHealth();
      if (mounted) setBackendOnline(ok);
    };
    poll();
    const t = setInterval(poll, 30000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="kc-desktop-app flex h-full flex-col">
      <TitleBar />

      <div className="flex min-h-0 flex-1">
        {/* Desktop sidebar */}
        <div className="kc-desktop-sidebar hidden lg:block">
          <Sidebar collapsed={collapsed} />
        </div>

        {/* Mobile overlay sidebar */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full shadow-2xl">
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="kc-command-bar flex items-center justify-between gap-3 px-5 py-3 lg:px-8">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                className="no-drag kc-btn-ghost !px-2 lg:hidden"
                onClick={() => setMobileOpen(true)}
                title="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="no-drag kc-btn-ghost !px-2 hidden lg:inline-flex"
                onClick={() => setCollapsed((v) => !v)}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                  Workspace <span className="text-[#b7c4ba]">/</span> {pageTitle}
                </div>
                <div className="hidden text-xs text-[#8a938c] sm:block">
                  Kurukta · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
              </div>
            </div>

            {/* Right cluster */}
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden items-center gap-2 rounded-xl border border-[#e4eae5] bg-white px-3 py-2 text-xs font-semibold text-[#5d6a60] md:flex">
                <CalendarDays className="h-4 w-4 text-primary" />
                Today
              </div>
              <div
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold ${backendOnline === null
                    ? 'border-[#e4eae5] bg-white text-[#8a938c]'
                    : backendOnline
                      ? 'border-[#bfe2c7] bg-[#effaf1] text-primary'
                      : 'border-red-200 bg-red-50 text-red-600'
                  }`}
                title={
                  backendOnline === null
                    ? 'Checking backend…'
                    : backendOnline
                      ? 'Backend online'
                      : 'Backend offline'
                }
              >
                {backendOnline ? (
                  <Wifi className="h-3.5 w-3.5" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5" />
                )}
                {backendOnline === null
                  ? 'Checking…'
                  : backendOnline
                    ? 'Backend online'
                    : 'Backend offline'}
              </div>
            </div>
          </header>

          {/* Scrollable content */}
          <main className="kc-content-canvas min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1800px] px-5 py-6 lg:px-8 lg:py-8">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AppLayout;