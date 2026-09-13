import { useNavigate, useLocation } from 'react-router-dom'
import { Home, MessageCircle, ShoppingBag, Sun, HelpCircle, Mic } from 'lucide-react'

const DockNavigation = () => {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const navItems = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/chat', icon: MessageCircle, label: 'Chat' },
    { path: '/market', icon: ShoppingBag, label: 'Market' },
    { path: '/weather', icon: Sun, label: 'Weather' },
    { path: '/help', icon: HelpCircle, label: 'Help' },
  ]

  const isActive = (path) =>
    path === '/home' ? pathname === '/home' : pathname.startsWith(path)

  return (
    <>
      <div className="h-24 w-full shrink-0" aria-hidden="true" />
      <nav className="dock-nav">
        <div className="glass flex items-end justify-around gap-0.5 rounded-[1.75rem] px-2 py-2 shadow-dock">
          {navItems.map((item) => {
            const active = isActive(item.path)
            const Icon = item.icon
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={`dock-item ${active ? 'grad-green text-white shadow-lifted' : 'active:scale-95 hover:bg-primary/10 hover:text-primary'}`}
              >
                <Icon className={`h-5 w-5 transition-transform duration-200 ${active ? 'scale-110' : ''}`} />
                <span className={`mt-1 text-[10px] font-semibold ${active ? 'text-white' : 'text-ink-faint'}`}>
                  {item.label}
                </span>
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => navigate('/record')}
            className="relative -top-4 flex min-w-[52px] flex-col items-center justify-center rounded-2xl grad-green px-2 py-2 text-white shadow-[0_10px_26px_rgba(20,141,66,0.45)] transition-all duration-200 hover:-top-5 active:scale-95"
          >
            <span className="absolute inset-0 -z-10 animate-pulse-ring rounded-2xl bg-primary/50" />
            <Mic className="h-5 w-5" />
            <span className="mt-1 text-[10px] font-semibold">Record</span>
          </button>
        </div>
      </nav>
    </>
  )
}

export default DockNavigation