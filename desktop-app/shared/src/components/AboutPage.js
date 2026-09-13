import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sprout,
  MessageCircle,
  Mic,
  Sun,
  ShoppingBag,
  BookOpen,
  LifeBuoy,
  Mail,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Globe2,
  Headset,
  CircleHelp,
} from 'lucide-react';

const FEATURES = [
  { icon: MessageCircle, title: 'AI Expert Chat', desc: 'Real-time answers about crops, pests, fertilizer and soil from our agricultural AI, in English or Swahili.' },
  { icon: Mic, title: 'Voice Support', desc: 'Speak a question in Swahili or English — we transcribe it with Whisper and reply instantaneously.' },
  { icon: Sun, title: 'Weather & Calendar', desc: 'Location-aware forecasts with per-crop planting, top-dressing, weeding and harvesting calendars.' },
  { icon: ShoppingBag, title: 'Market Prices', desc: 'Current produce prices, price history and verified dealers with directions near your farm.' },
  { icon: BookOpen, title: 'Knowledge Base', desc: 'Ground truth from KALRO, FAO and ministry sources so the advice you get is dependable.' },
  { icon: Globe2, title: 'Bilingual', desc: 'Seamlessly switch between English and Swahili — KilimoChat detects your language automatically.' },
];

const FAQS = [
  { q: 'What can I ask KilimoChat?', a: 'Anything about farming: disease diagnosis, pest control, fertilizer rates, planting calendars, weather, and market prices for crops you grow.' },
  { q: 'Which crops does it support?', a: 'Maize, beans, tomatoes, potatoes, cabbages, onions, rice, coffee, tea, bananas and more — across all 47 counties.' },
  { q: 'Does it work in Swahili?', a: 'Ndiyo! Speak or type in Swahili and we answer in Swahili. English works too, plus mixed Sheng.' },
  { q: 'Where does the advice come from?', a: 'Advice is grounded in a curated agricultural knowledge base (KALRO, FAO, ministry materials) and enhanced with live web search.' },
];

const STEPS = [
  { title: 'Start a chat', desc: 'Open AI Expert Chat and type any farming question.', to: '/chat' },
  { title: 'Or just speak', desc: 'Use Voice Record to ask hands-free while you inspect the farm.', to: '/record' },
  { title: 'Plan with data', desc: 'Check Weather & Market pages before planting or selling.', to: '/weather' },
];

const AboutPage = () => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-5xl space-y-8 kc-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f7e39] via-[#16813a] to-[#2b8b3a] p-8 text-center text-white shadow-soft md:p-10">
        <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-white/10" />
        <div className="relative z-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/95 shadow-2xl">
            <Sprout className="h-9 w-9 text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold md:text-4xl">About KilimoChat</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-white/85 md:text-base">
            An AI-powered farming companion for Kenyan farmers — bridging the agricultural
            extension gap with instant, verified advice in English and Swahili.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => navigate('/chat')} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-primary shadow-lg transition-transform hover:scale-105">
              <MessageCircle className="h-4 w-4" /> Start Chatting
            </button>
            <button type="button" onClick={() => navigate('/record')} className="inline-flex items-center gap-2 rounded-full bg-white/20 px-5 py-2.5 text-sm font-semibold backdrop-blur transition-colors hover:bg-white/30">
              <Mic className="h-4 w-4" /> Use Voice
            </button>
          </div>
        </div>
      </section>

      {/* Impact stats */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { value: '50k+', label: 'Farmers reached' },
          { value: '12+', label: 'Crops supported' },
          { value: '47', label: 'Counties covered' },
          { value: '2', label: 'Languages (EN / SW)' },
        ].map((stat) => (
          <div key={stat.label} className="kc-card p-5 text-center">
            <div className="kc-gradient-text text-3xl font-extrabold">{stat.value}</div>
            <div className="mt-1 text-xs text-[#8a938c]">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* How to use */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-[#1f2937]">
          <Sparkles className="h-5 w-5 text-primary" /> Get started in 3 steps
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <button
              key={i}
              type="button"
              onClick={() => navigate(step.to)}
              className="kc-card group p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-light to-primary text-sm font-extrabold text-white">
                {i + 1}
              </div>
              <h3 className="mt-3 font-bold text-[#1f2937]">{step.title}</h3>
              <p className="mt-1 text-xs text-[#8a938c]">{step.desc}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Open <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Features */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-[#1f2937]">
          <ShieldCheck className="h-5 w-5 text-primary" /> What you get
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="kc-card p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e6f5e9]">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-[#1f2937]">{feature.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#8a938c]">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="kc-card p-6 md:p-8">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-[#1f2937]">
          <CircleHelp className="h-5 w-5 text-primary" /> Frequently asked questions
        </h2>
        <div className="space-y-3">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group rounded-2xl border border-[#e4eae5] bg-white transition-shadow hover:shadow-card">
              <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 text-sm font-bold text-[#1f2937]">
                {faq.q}
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-[#a2aca4] transition-transform group-open:rotate-90" />
              </summary>
              <p className="px-4 pb-4 text-sm leading-relaxed text-[#5d6a60]">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Support */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-gradient-to-br from-[#2b8b3a] to-[#16813a] p-6 text-white">
          <Headset className="h-8 w-8 text-yellow-300" />
          <h3 className="mt-2 text-lg font-extrabold">Need help?</h3>
          <p className="mt-1 text-sm text-white/85">
            Reach our support team for help with your account or farming questions.
          </p>
          <a
            href="mailto:support@kilimochat.example.com"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-primary hover:scale-105 transition-transform"
          >
            <Mail className="h-4 w-4" /> support@kilimochat.example.com
          </a>
        </div>
        <div className="kc-card p-6">
          <LifeBuoy className="h-8 w-8 text-primary" />
          <h3 className="mt-2 text-lg font-extrabold text-[#1f2937]">Tips for best results</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-[#5d6a60]">
            <li>• Describe symptoms clearly — yellow leaves, pests, soil conditions.</li>
            <li>• Attach a clear photo of the affected crop for better diagnosis.</li>
            <li>• Allow location so weather & market advice is local to you.</li>
          </ul>
        </div>
      </section>

      <p className="pb-4 text-center text-xs text-[#a2aca4]">
        KilimoChat Desktop · Empowering Kenyan Farmers with AI · Mit License
      </p>
    </div>
  );
};

export default AboutPage;