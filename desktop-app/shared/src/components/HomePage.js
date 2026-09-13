import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Sprout,
  MessageCircle,
  Mic,
  Sun,
  ShoppingBag,
  ChevronRight,
  Sparkles,
  CloudSun,
  TrendingUp,
  Languages,
  Leaf,
  MapPin,
  ScanLine,
  BadgeCheck,
} from 'lucide-react';
import { getUserLocation, getWeatherForLocation, getWeatherByName } from '../services/api';

const QUICK_ACTIONS = [
  {
    path: '/chat',
    icon: MessageCircle,
    title: 'AI Expert Chat',
    desc: 'Ask crops, pests, fertilizer & planting questions.',
    gradient: 'from-[#c8ffcb] to-[#a8f0ac]',
    iconColor: 'text-[#127a37]',
  },
  {
    path: '/record',
    icon: Mic,
    title: 'Voice Record',
    desc: 'Speak in Swahili or English — we transcribe & reply.',
    gradient: 'from-[#ffe2d8] to-[#ffd0c0]',
    iconColor: 'text-[#a57a6b]',
  },
  {
    path: '/weather',
    icon: Sun,
    title: 'Weather Advice',
    desc: 'Local forecasts and planting tips for your climate.',
    gradient: 'from-[#e0ffe2] to-[#c0f0c5]',
    iconColor: 'text-[#357c40]',
  },
  {
    path: '/market',
    icon: ShoppingBag,
    title: 'Market Prices',
    desc: 'Real-time prices and verified dealers across Kenya.',
    gradient: 'from-[#dbeafe] to-[#bfdbfe]',
    iconColor: 'text-[#2563eb]',
  },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [location, setLocation] = useState(null);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  const firstName = user?.full_name?.split(' ')[0] || 'Mkulima';

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const loc = await getUserLocation();
        if (mounted) setLocation(loc);
        const res = await getWeatherForLocation(loc.lat, loc.lon, user?.id || 'web_user');
        if (mounted) setWeather(res.weather || null);
      } catch (err) {
        try {
          const res = await getWeatherByName('nairobi');
          if (mounted) {
            setLocation({ city: 'Nairobi', lat: -1.2921, lon: 36.8219 });
            setWeather(res.weather || null);
          }
        } catch (e2) {
          if (mounted) setWeather(null);
        }
      } finally {
        if (mounted) setWeatherLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6 kc-fade-in">
      {/* Hero banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-light to-primary-soft p-6 text-white shadow-soft md:p-8">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-10 -top-10 h-52 w-52 rounded-full bg-white" />
          <div className="absolute bottom-0 right-10 h-40 w-40 rounded-full bg-white" />
        </div>
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-yellow-300">
              <Sparkles className="h-4 w-4" />
              {greeting()}, {firstName}
            </div>
            <h1 className="text-2xl font-extrabold md:text-3xl">
              Karibu to KilimoChat 🌾
            </h1>
            <p className="mt-1 max-w-xl text-sm text-white/90 md:text-[15px]">
              Your smart farming companion — expert advice on crops, pests, weather and
              market prices, in English and Swahili.
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => navigate('/chat')}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-primary shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <MessageCircle className="h-4 w-4" />
                Start Chat
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/record')}
                className="inline-flex items-center gap-2 rounded-full bg-white/20 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition-all duration-300 hover:bg-white/30"
              >
                <Mic className="h-4 w-4" />
                Voice
              </button>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="flex h-36 w-36 items-center justify-center rounded-3xl bg-white/15 backdrop-blur">
              <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-white shadow-2xl">
                <Sprout className="h-14 w-14 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { icon: Leaf, label: 'Crops supported', value: '12+' },
          { icon: TrendingUp, label: 'Market updates', value: 'Live' },
          { icon: CloudSun, label: 'Weather', value: weatherLoading ? '…' : weather ? 'Ready' : 'Offline' },
          { icon: Languages, label: 'Languages', value: 'EN · SW' },
        ].map((stat) => (
          <div key={stat.label} className="kc-card kc-scale-in flex items-center gap-3 p-4 transition-shadow duration-300 hover:shadow-card-hover">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#e6f5e9]">
              <stat.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-extrabold text-[#1f2937]">{stat.value}</div>
              <div className="truncate text-xs text-[#8a938c]">{stat.label}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Main grid */}
      <section className="grid gap-6 xl:grid-cols-3">
        {/* Quick actions */}
        <div className="xl:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse-ring" />
            <h2 className="text-lg font-bold text-[#1f2937]">Quick Actions</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {QUICK_ACTIONS.map((action, i) => (
              <button
                key={action.path}
                type="button"
                onClick={() => navigate(action.path)}
                className="kc-card group cursor-pointer p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-card-hover kc-fade-in-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${action.gradient} transition-transform duration-300 group-hover:scale-110`}
                  >
                    <action.icon className={`h-5 w-5 ${action.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-bold text-[#1f2937]">{action.title}</h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#8a938c]">{action.desc}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-all duration-200 group-hover:opacity-100">
                  Open <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Today at a glance */}
        <div className="space-y-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse-ring" />
            <h2 className="text-lg font-bold text-[#1f2937]">Today at a glance</h2>
          </div>

          <div className="kc-card overflow-hidden">
            <div className="bg-gradient-to-br from-[#2b8b3a] to-[#16813a] px-5 py-4 text-white">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/80">
                <MapPin className="h-3.5 w-3.5" />
                {location?.city || 'Detecting location…'}
              </div>
            </div>
            <div className="p-5">
              {weatherLoading ? (
                <div className="h-16 w-full rounded-xl kc-shimmer" />
              ) : weather ? (
                <div>
                  <div className="flex items-center justify-between">
                    <div className="text-4xl font-extrabold text-[#1f2937]">
                      {Math.round(weather.temperature ?? 0)}°C
                    </div>
                    <CloudSun className="h-10 w-10 text-primary" />
                  </div>
                  <div className="mt-1 text-sm font-medium capitalize text-[#5d6a60]">
                    {weather.description || 'Clear conditions'}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-[#f3f6f3] p-2">
                      <div className="font-bold text-[#1f2937]">{weather.humidity ?? '—'}%</div>
                      <div className="text-[#8a938c]">Humidity</div>
                    </div>
                    <div className="rounded-xl bg-[#f3f6f3] p-2">
                      <div className="font-bold text-[#1f2937]">{weather.wind_speed ?? '—'}</div>
                      <div className="text-[#8a938c]">Wind (m/s)</div>
                    </div>
                    <div className="rounded-xl bg-[#f3f6f3] p-2">
                      <div className="font-bold text-[#1f2937]">{weather.visibility ?? '—'}</div>
                      <div className="text-[#8a938c]">Visibility</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/weather')}
                    className="kc-btn-outline mt-4 w-full !py-2 text-xs"
                  >
                    Full weather & farming calendar
                  </button>
                </div>
              ) : (
                <div className="py-4 text-center text-sm text-[#8a938c]">
                  Weather unavailable.
                  <button type="button" onClick={() => navigate('/weather')} className="ml-1 font-semibold text-primary hover:underline">
                    Open Weather →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* How it works mini */}
          <div className="kc-card p-5">
            <h3 className="mb-3 text-sm font-bold text-[#1f2937]">How it works</h3>
            <div className="space-y-3">
              {[
                { icon: MessageCircle, text: 'Ask any farming question in a chat or voice note' },
                { icon: ScanLine, text: 'AI analyses your query using verified agri-data' },
                { icon: BadgeCheck, text: 'Get clear, actionable advice within seconds' },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-light to-primary text-[11px] font-bold text-white">
                    {i + 1}
                  </div>
                  <step.icon className="mt-1 h-4 w-4 flex-shrink-0 text-primary" />
                  <p className="text-xs leading-relaxed text-[#5d6a60]">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;