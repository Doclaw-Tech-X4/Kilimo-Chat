import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Sprout,
  MessageCircle,
  Mic,
  Sun,
  ShoppingBag,
  ChevronRight,
  Sparkles,
  ScanLine,
  BadgeCheck,
  Repeat2,
  TrendingUp,
  Cloud,
} from 'lucide-react'
import DockNavigation from './DockNavigation'

const HomePage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [typedText, setTypedText] = useState('')

  const welcomeMessage = `Karibu ${user?.full_name?.split(' ')[0] || 'Mkulima'}! 🌾`

  useEffect(() => {
    if (typedText.length < welcomeMessage.length) {
      const t = setTimeout(() => {
        setTypedText(welcomeMessage.slice(0, typedText.length + 1))
      }, 70)
      return () => clearTimeout(t)
    }
  }, [typedText, welcomeMessage])

  const quickActions = [
    { icon: MessageCircle, label: 'Start Chat', to: '/chat', solid: true },
    { icon: Mic, label: 'Voice Query', to: '/record', solid: false },
  ]

  const features = [
    { icon: ScanLine, title: 'Crop Diagnosis', desc: 'Spot pests & diseases with AI photo analysis.', tone: 'bg-emerald-50 text-emerald-700' },
    { icon: Mic, title: 'Voice Support', desc: 'Speak naturally in Swahili or English.', tone: 'bg-orange-50 text-orange-600' },
    { icon: Sun, title: 'Weather Advice', desc: 'Local forecasts with planting tips.', tone: 'bg-amber-50 text-amber-600' },
    { icon: ShoppingBag, title: 'Market Prices', desc: 'Real-time crop prices across Kenya.', tone: 'bg-sky-50 text-sky-600' },
  ]

  const steps = [
    { n: 1, title: 'Ask anything', desc: 'Text, voice, or photo to our AI expert.', icon: MessageCircle },
    { n: 2, title: 'AI analysis', desc: 'Smart processing in your language.', icon: ScanLine },
    { n: 3, title: 'Verified data', desc: 'Cross-checked with local ag databases.', icon: BadgeCheck },
    { n: 4, title: 'Instant answer', desc: 'Clear, actionable advice in seconds.', icon: Repeat2 },
  ]

  return (
    <div className="min-h-dvh bg-page">
      <div className="screen px-0">
        {/* Header */}
        <header className="safe-top px-5 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl grad-green text-white shadow-lifted">
                <Sprout className="h-5 w-5" />
              </span>
              <span className="text-[17px] font-bold text-primary">KilimoChat</span>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-[15px] shadow-card active:scale-95"
              aria-label="Profile"
            >
              {user?.full_name?.charAt(0)?.toUpperCase() || <Sprout className="h-4 w-4 text-primary" />}
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="mt-4 px-5">
          <div className="grad-hero relative overflow-hidden rounded-[1.75rem] p-6 text-white shadow-lifted">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
            <div className="absolute -bottom-14 right-16 h-36 w-36 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute right-6 top-6 h-3 w-3 animate-pulse rounded-full bg-yellow-300" />
              <div className="absolute right-14 top-16 h-2 w-2 animate-pulse rounded-full bg-yellow-200 [animation-delay:300ms]" />
            </div>

            <div className="relative">
              <span className="chip bg-white/15 text-white backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-yellow-300" /> Welcome
              </span>
              <h1 className="mt-3 min-h-[34px] text-[26px] font-extrabold leading-tight tracking-tight">
                {typedText}
                <span className="ml-0.5 inline-block w-[2px] animate-pulse bg-white/80 align-middle" style={{ height: 24 }} />
              </h1>
              <p className="mt-1 text-[13.5px] text-white/85">
                The smart farming companion that speaks your language.
              </p>

              <div className="mt-5 flex gap-2.5">
                {quickActions.map((a) => (
                  <button
                    key={a.label}
                    onClick={() => navigate(a.to)}
                    className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-semibold transition-all duration-200 active:scale-95 ${
                      a.solid ? 'bg-white text-primary shadow-lg' : 'bg-white/15 text-white backdrop-blur'
                    }`}
                  >
                    <a.icon className="h-4 w-4" />
                    {a.label}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Mini stats */}
        <section className="mt-4 px-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: TrendingUp, label: 'Market Watch', to: '/market' },
              { icon: Cloud, label: 'Weather', to: '/weather' },
            ].map((s) => (
              <button
                key={s.label}
                onClick={() => navigate(s.to)}
                className="card flex items-center gap-3 p-3.5 text-left transition-all active:scale-[0.97]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft">
                  <s.icon className="h-[18px] w-[18px] text-primary" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-ink">{s.label}</p>
                  <p className="truncate text-[11px] text-ink-faint">Tap to open</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Nurture heading */}
        <section className="mt-6 px-5">
          <h2 className="text-[20px] font-extrabold tracking-tight text-[#196d35]">
            Nurturing your growth
          </h2>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">
            Expert advice on crops, pests, weather, and market prices — all in one place.
          </p>
        </section>

        {/* Feature list */}
        <section className="mt-4 px-5">
          <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-ink">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Powerful features
          </h3>
          <div className="space-y-2.5">
            {features.map((f, i) => (
              <button
                key={f.title}
                onClick={() => navigate(['/chat', '/record', '/weather', '/market'][i])}
                className="card flex w-full items-start gap-3 p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${f.tone}`}>
                  <f.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold text-ink">{f.title}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-soft">{f.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mt-6 px-5">
          <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-ink">
            <span className="h-2 w-2 rounded-full bg-primary" />
            How it works
          </h3>
          <div className="rounded-[1.5rem] bg-gradient-to-br from-black/[0.03] to-black/[0.06] p-4">
            <div className="space-y-3.5">
              {steps.map((s) => (
                <div key={s.n} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full grad-green text-[12px] font-bold text-white">
                    {s.n}
                  </span>
                  <div className="flex-1">
                    <p className="flex items-center gap-1.5 text-[13.5px] font-bold text-[#1f7c39]">
                      {s.title}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-6 px-5">
          <div className="grad-hero relative overflow-hidden rounded-[1.75rem] p-6 text-center text-white">
            <div className="absolute -left-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
            <div className="relative">
              <h2 className="text-[21px] font-extrabold">Ready to start?</h2>
              <p className="mt-1.5 text-[13.5px] text-white/85">
                Join over 50,000 farmers growing smarter with KilimoChat.
              </p>
              <button
                onClick={() => navigate('/chat')}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-[15px] font-extrabold text-primary shadow-lg transition-all active:scale-95"
              >
                <MessageCircle className="h-5 w-5" />
                Start Chatting
              </button>
            </div>
          </div>
        </section>

        <footer className="safe-bottom px-5 pt-8 text-center">
          <p className="text-[12px] text-ink-faint">Empowering Kenyan Farmers with AI</p>
          <p className="mt-1 text-[11px] text-black/30">KilimoChat · Built for Kenya 🇰🇪</p>
        </footer>
      </div>
      <DockNavigation />
    </div>
  )
}

export default HomePage