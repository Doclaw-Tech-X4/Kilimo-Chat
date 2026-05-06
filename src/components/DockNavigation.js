import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, MessageCircle, ShoppingBag, Sun, HelpCircle, Mic } from 'lucide-react';

const DockNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/expertchat', icon: MessageCircle, label: 'Chat' },
    { path: '/market', icon: ShoppingBag, label: 'Market' },
    { path: '/weather', icon: Sun, label: 'Weather' },
    { path: '/help', icon: HelpCircle, label: 'Help' },
  ];

  const isActive = (path) => {
    if (path === '/home') {
      return currentPath === '/home';
    }
    if (path === '/expertchat') {
      return currentPath === '/expertchat';
    }
    return currentPath.startsWith(path);
  };

  return (
    <>
      {/* Spacer to prevent content from being hidden behind dock */}
      <div className="h-24 w-full shrink-0" aria-hidden="true" />
      
      <nav className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
        {/* Main dock container */}
      <div className="flex items-end gap-1 rounded-2xl bg-white/90 backdrop-blur-xl px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/20">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={`
                group relative flex flex-col items-center justify-center
                min-w-[56px] h-[52px] rounded-xl
                transition-all duration-300 ease-out
                ${active 
                  ? 'bg-gradient-to-br from-[#148d42] to-[#0f7e39] text-white shadow-[0_4px_14px_rgba(20,141,66,0.35)] scale-105 -translate-y-1' 
                  : 'text-[#656565] hover:text-[#148d42] hover:bg-[#148d42]/10'
                }
              `}
            >
              {/* Icon with bounce animation on active */}
              <Icon 
                className={`
                  h-5 w-5 transition-all duration-300
                  ${active ? 'animate-bounce-subtle' : 'group-hover:scale-110'}
                `} 
              />
              
              {/* Label */}
              <span className={`
                text-[10px] font-medium mt-0.5 transition-all duration-300
                ${active ? 'opacity-100 font-semibold' : 'opacity-70 group-hover:opacity-100'}
              `}>
                {item.label}
              </span>
              
              {/* Active indicator dot */}
              {active && (
                <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-white/60 animate-pulse" />
              )}
            </button>
          );
        })}

        {/* Floating Record Button */}
        <button
          type="button"
          onClick={() => navigate('/record')}
          className={`
            group relative flex flex-col items-center justify-center
            min-w-[56px] h-[60px] -mt-4
            rounded-xl
            bg-gradient-to-br from-[#148d42] to-[#0f6b32]
            text-white
            shadow-[0_8px_24px_rgba(20,141,66,0.4),0_0_0_4px_rgba(255,255,255,0.8)]
            transition-all duration-300 ease-out
            hover:scale-110 hover:-translate-y-2 hover:shadow-[0_12px_32px_rgba(20,141,66,0.5)]
            active:scale-95
            ${currentPath === '/record' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#148d42]' : ''}
          `}
        >
          <div className="relative">
            <Mic className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
            {/* Ripple effect */}
            <span className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-0 group-hover:opacity-100" />
          </div>
          <span className="text-[10px] font-medium mt-0.5">Record</span>
        </button>
      </div>
      </nav>
    </>
  );
};

export default DockNavigation;
