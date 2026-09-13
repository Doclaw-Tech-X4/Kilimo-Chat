import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  House,
  MessageCircle,
  Mic,
  Sun,
  ShoppingBag,
  UserRound,
  CircleHelp,
  ShieldCheck,
  LogOut,
  Leaf,
} from 'lucide-react';

const NAV_GROUPS = [
  {
    title: 'Main',
    items: [
      { path: '/home', icon: House, label: 'Home' },
      { path: '/chat', icon: MessageCircle, label: 'AI Expert Chat' },
      { path: '/record', icon: Mic, label: 'Voice Record' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { path: '/weather', icon: Sun, label: 'Weather' },
      { path: '/market', icon: ShoppingBag, label: 'Market Prices' },
    ],
  },
  {
    title: 'Account',
    items: [
      { path: '/profile', icon: UserRound, label: 'My Profile' },
      { path: '/help', icon: CircleHelp, label: 'Help & About' },
      { path: '/admin', icon: ShieldCheck, label: 'Document Manager' },
    ],
  },
];

const Sidebar = ({ collapsed, onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path) => {
    if (path === '/home') return location.pathname === '/home';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const fallbackName = user?.full_name || user?.email || user?.phone_number || 'Farmer';
  const initials = fallbackName
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <aside
      className={`kc-navigation-rail flex h-full flex-col transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-[248px]'
        }`}
    >
      {/* Brand */}
      <div className={`flex items-center gap-3 px-4 py-5 ${collapsed ? 'justify-center' : ''}`}>
        <div className="kc-brand-orb flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-light to-primary">
          <Leaf className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-[15px] font-extrabold text-white">KilimoChat</div>
            <div className="text-[11px] text-[#9fb9a7]">Smart farming workspace</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-[#799486]">
                {group.title}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    type="button"
                    title={item.label}
                    onClick={() => {
                      navigate(item.path);
                      onNavigate?.();
                    }}
                    className={`kc-sidebar-link ${active ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''
                      }`}
                  >
                    <span className="kc-sidebar-icon">
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User card + logout */}
      <div className="border-t border-white/10 p-3">
        {!collapsed && (
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-white/10 p-2.5">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-soft text-xs font-bold text-white">
              {initials || 'K'}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-white">
                {fallbackName}
              </div>
              <div className="truncate text-[11px] text-[#9fb9a7]">
                {user?.phone_number || 'Farmer'}
              </div>
            </div>
          </div>
        )}
        <button
          type="button"
          title="Log out"
          onClick={handleLogout}
          className={`kc-sidebar-link !text-red-600 hover:!bg-red-50 ${collapsed ? 'justify-center px-0' : ''
            }`}
        >
          <span className="kc-sidebar-icon !text-red-500">
            <LogOut className="h-[18px] w-[18px]" />
          </span>
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;