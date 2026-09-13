import { useNavigate } from 'react-router-dom'
import { ScanSearch, Mic, Sun, ShoppingBag, Sprout, ArrowLeft, Sparkles, Zap, Shield, Heart, Leaf, MessageCircle } from 'lucide-react'
import DockNavigation from './DockNavigation'

const AboutPage = () => {
  const navigate = useNavigate()

  const features = [
    { icon: ScanSearch, title: 'Disease diagnosis', to: '/chat', desc: 'Snap a photo for instant AI analysis' },
    { icon: Mic, title: 'Voice query', to: '/record', desc: 'Speak in Swahili or English' },
    { icon: Sun, title: 'Weather Report', to: '/weather', desc: 'Local forecasts with crop calendars' },
    { icon: ShoppingBag, title: 'Market prices', to: '/market', desc: 'Live prices, dealers & trends' },
  ]

  const accreditations = [
    { icon: Sparkles, title: 'AI-Powered Insights', desc: 'Instant AI analysis for crop diseases, pests, and soil health from your phone camera!' },
    { icon: Shield, title: 'Trusted by 10,000+ Farmers', desc: 'Join thousands of Kenyan farmers transforming their harvests with KilimoChat.' },
    { icon: Zap, title: 'Real-Time Weather', desc: 'Hyper-local weather updates with crop-specific farming calendar alerts.' },
    { icon: Heart, title: 'Free Forever', desc: 'All features completely free, supported by partners who believe in empowering farmers.' },
  ]

  return (
    <div className="min-h-dvh bg-page">
      <div className="screen px-0">
        <header className="app-header">
          <div className="app-header-inner">
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/home')} className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-card active:scale-95">
                <ArrowLeft className="h-[18px] w-[18px]" />
              </button>
              <span className="flex h-8 w-8 items-center justify-center rounded-full grad-green text-white">
                <Sprout className="h-4 w-4" />
              </span>
              <span className="text-[15px] font-extrabold text-primary">KilimoChat</span>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-[13px]">👤</span>
          </div>
        </header>

        <div className="px-5 pb-4">
          <section className="text-center">
            <h1 className="text-[24px] font-extrabold tracking-tight text-[#186d35]">Bridging the Agricultural Gap</h1>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">
              Empowering Kenyan farmers with AI-driven expertise where extension services are scarce.
            </p>
          </section>

          <section className="mt-5 grid grid-cols-2 gap-3">
            <div className="relative overflow-hidden rounded-[1.25rem] bg-[#f0c5b8] p-4 text-[#6b4c41]">
              <div className="absolute -bottom-4 -right-5 h-20 w-20 rounded-full border-8 border-[#e7b2a2] opacity-45" />
              <div className="mb-1 text-[22px]">🧑‍🌾</div>
              <p className="text-[20px] font-extrabold text-[#6f615a]">7.2M Farmers</p>
              <p className="text-[11.5px] leading-snug">only 5,000 extension officers available nationwide.</p>
            </div>
            <div className="relative overflow-hidden rounded-[1.25rem] bg-[#2f8a38] p-4 text-white">
              <div className="absolute -bottom-4 -right-5 h-20 w-20 rounded-full border-8 border-[#6fb075] opacity-40" />
              <div className="mb-1 text-[22px]">🌱</div>
              <p className="text-[20px] font-extrabold">Up to 40%</p>
              <p className="text-[11.5px] leading-snug">crop loss prevented through early detection and rapid AI intervention.</p>
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-ink-soft">Interactive Scenarios</h2>
              <span className="text-[11px] font-medium text-ink-faint">Tap to try</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {features.map((f) => (
                <button
                  key={f.title}
                  onClick={() => navigate(f.to)}
                  className="card p-3.5 text-left transition-all active:scale-[0.97]"
                >
                  <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft">
                    <f.icon className="h-[18px] w-[18px] text-primary" />
                  </span>
                  <p className="text-[13.5px] font-bold text-ink">{f.title}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-ink-faint">{f.desc}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-5">
            <div className="overflow-hidden rounded-[1.25rem] border border-black/5">
              <div className="h-24 bg-[radial-gradient(circle_at_35%_20%,rgba(215,232,199,0.25),transparent_35%),linear-gradient(120deg,#667f39,#5b7632_35%,#516d2d)] p-3">
                <span className="text-[20px]">🌾</span>
              </div>
              <div className="bg-[#2d6e32] px-4 py-3 text-white">
                <p className="text-[12px] leading-relaxed">
                  "KilimoChat gave me the diagnosis I needed when no one else was around to visit my shamba." — M. Kariuki
                </p>
              </div>
            </div>
          </section>

          <section className="mt-6">
            <div className="grad-hero relative overflow-hidden rounded-[1.5rem] p-5 text-white shadow-lifted">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
              <div className="relative">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                    <Leaf className="h-4 w-4 text-white" />
                  </span>
                  <span className="text-[13px] font-semibold text-white/85">KilimoChat Assistant</span>
                </div>
                <h2 className="text-[22px] font-extrabold">Transform Your Farm with AI</h2>
                <p className="mt-1.5 text-[13px] text-white/85">
                  Instant crop diagnosis, weather alerts, market prices, and expert advice — all for free.
                </p>
                <button
                  onClick={() => navigate('/chat')}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-[14px] font-extrabold text-primary shadow-lg transition-all active:scale-95"
                >
                  <MessageCircle className="h-5 w-5" />
                  Start Chatting Now
                </button>
              </div>
            </div>
          </section>

          <section className="mt-5">
            <h3 className="mb-3 flex items-center gap-2 text-[16px] font-extrabold text-[#186d35]">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Why Farmers Love KilimoChat
            </h3>
            <div className="space-y-2.5">
              {accreditations.map((a) => (
                <div key={a.title} className="card flex items-start gap-3 p-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl grad-green text-white shadow-lifted">
                    <a.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[14px] font-extrabold text-[#186d35]">{a.title}</p>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">{a.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-5 rounded-[1.25rem] bg-black/[0.03] p-5 text-center">
            <p className="text-[13.5px] text-ink-soft">Ready to boost your harvest?</p>
            <div className="mt-3 flex justify-center gap-2.5">
              <button onClick={() => navigate('/chat')} className="btn-primary text-[13.5px]">Chat Now</button>
              <button onClick={() => navigate('/chat')} className="rounded-full border-2 border-primary px-5 py-2.5 text-[13.5px] font-bold text-primary active:scale-95">
                Expert Help
              </button>
            </div>
          </section>

          <footer className="mt-6 border-t border-black/5 pt-4 text-center">
            <div className="flex items-center justify-center gap-2 text-[#2f8a45]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2f8a45]">
                <Sprout className="h-3 w-3 text-white" />
              </span>
              <span className="text-[15px] font-extrabold">KilimoChat</span>
            </div>
            <p className="mt-1 text-[12.5px] text-ink-soft">Built for Kenya 🇰🇪</p>
            <div className="mt-2 flex justify-center gap-6 text-[12.5px] text-ink-faint">
              <span>About</span>
              <span>GitHub</span>
              <span>Privacy</span>
            </div>
          </footer>
        </div>
      </div>
      <DockNavigation />
    </div>
  )
}

export default AboutPage