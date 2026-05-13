import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanSearch, Mic, Sun, ShoppingBag, Sprout, ArrowLeft, Sparkles, Zap, Shield, Globe, Heart, Award, Leaf } from 'lucide-react';
import DockNavigation from './DockNavigation';

const AboutPage = () => {
  const navigate = useNavigate();
  
  // Fancy adverts data
  const adverts = [
    {
      icon: Sparkles,
      title: "AI-Powered Insights",
      subtitle: "Smart farming at your fingertips",
      gradient: "from-[#667eea] to-[#764ba2]",
      description: "Get instant AI analysis for crop diseases, pests, and soil health using just your phone camera!"
    },
    {
      icon: Globe,
      title: "Multilingual Support",
      subtitle: "Speak your language",
      gradient: "from-[#f093fb] to-[#f5576c]",
      description: "Chat in Swahili, English, or local dialects. No language barrier in farming!"
    },
    {
      icon: Zap,
      title: "Real-Time Weather",
      subtitle: "Never miss the forecast",
      gradient: "from-[#4facfe] to-[#00f2fe]",
      description: "Hyper-local weather updates with crop-specific farming calendar alerts."
    },
    {
      icon: Shield,
      title: "Trusted by 10,000+ Farmers",
      subtitle: "Your farming companion",
      gradient: "from-[#43e97b] to-[#38f9d7]",
      description: "Join thousands of Kenyan farmers already transforming their harvests with KilimoAssistant."
    },
    {
      icon: Heart,
      title: "Free Forever",
      subtitle: "No hidden costs",
      gradient: "from-[#fa709a] to-[#fee140]",
      description: "All features completely free, supported by partners who believe in empowering farmers."
    },
    {
      icon: Award,
      title: "Expert Advice",
      subtitle: "Certified agronomists",
      gradient: "from-[#a8edea] to-[#fed6e3]",
      description: "Access certified agricultural experts and AI-trained on thousands of crop scenarios."
    }
  ];
  
  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="mx-auto min-h-screen w-full max-w-[420px] bg-[#f5f5f5] border-x border-[#e6e6e6]">
        <header className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/')} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
              <ArrowLeft className="h-5 w-5 text-[#2f2f2f]" />
            </button>
            <div className="h-6 w-6 rounded-full bg-[#0f7e39] flex items-center justify-center">
              <Sprout className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-small font-semibold text-[#0f7e39]">KilimoChat</span>
          </div>
          <div className="h-6 w-6 rounded-full border border-[#cbcbcb] text-[#7d7d7d] flex items-center justify-center text-xs">
            👤
          </div>
        </header>
        <main className="px-4 pb-28">
          <section className="text-center">
            <h1 className="text-display font-semibold text-[#186d35]">Bridging the Agricultural Gap</h1>
            <p className="mt-2 text-body text-[#454545]">
              Empowering Kenyan farmers with AI-driven expertise where extension services are scarce.
            </p>
          </section>

          <section className="mt-5">
            <h2 className="text-caption tracking-[0.18em] text-[#3f3f3f]">REAL-WORLD IMPACT</h2>
            <div className="mt-2 space-y-3">
              <div className="rounded-2xl bg-[#f0c5b8] px-4 py-4 text-[#6b4c41] relative overflow-hidden">
                <div className="absolute -bottom-4 -right-5 h-20 w-20 rounded-full border-8 border-[#e7b2a2] opacity-45" />
                <div className="text-[24px] mb-1">🧑‍🌾</div>
                <p className="text-title text-[#6f615a]">7.2M Farmers</p>
                <p className="text-caption leading-[20px]">only 5,000 extension officers available nationwide.</p>
              </div>

              <div className="rounded-2xl bg-[#2f8a38] px-4 py-4 text-white relative overflow-hidden">
                <div className="absolute -bottom-4 -right-5 h-20 w-20 rounded-full border-8 border-[#6fb075] opacity-40" />
                <div className="text-[24px] mb-1">🌱</div>
                <p className="text-title">Up to 40%</p>
                <p className="text-body">crop loss prevented through early detection and rapid AI intervention.</p>
              </div>
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-caption tracking-[0.18em] text-[#3f3f3f]">INTERACTIVE SCENARIOS</h2>
              <span className="text-xs tracking-wide text-[#6d6d6d]">TAP TO TEST</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => navigate('/expert-chat')}
                className="rounded-2xl border border-[#dedede] bg-[#f6f6f6] p-3 text-left hover:bg-[#ebefeb] transition-colors"
              >
                <div className="mb-2 h-10 w-10 rounded-xl bg-[#ebefeb] flex items-center justify-center">
                  <ScanSearch className="h-4 w-4 text-[#373737]" />
                </div>
                <p className="text-caption text-[#3f3f3f]">Disease diagnosis</p>
              </button>

              <button 
                onClick={() => navigate('/record')}
                className="rounded-2xl border border-[#dedede] bg-[#f6f6f6] p-3 text-left hover:bg-[#ebefeb] transition-colors"
              >
                <div className="mb-2 h-10 w-10 rounded-xl bg-[#ebefeb] flex items-center justify-center">
                  <Mic className="h-4 w-4 text-[#373737]" />
                </div>
                <p className="text-caption text-[#3f3f3f]">Voice query</p>
              </button>

              <button 
                onClick={() => navigate('/weather')}
                className="rounded-2xl border border-[#dedede] bg-[#f6f6f6] p-3 text-left hover:bg-[#ebefeb] transition-colors"
              >
                <div className="mb-2 h-10 w-10 rounded-xl bg-[#ebefeb] flex items-center justify-center">
                  <Sun className="h-4 w-4 text-[#373737]" />
                </div>
                <p className="text-caption text-[#3f3f3f]">Weather Report</p>
              </button>

              <button 
                onClick={() => navigate('/expert-chat')}
                className="rounded-2xl border border-[#dedede] bg-[#f6f6f6] p-3 text-left hover:bg-[#ebefeb] transition-colors"
              >
                <div className="mb-2 h-10 w-10 rounded-xl bg-[#ebefeb] flex items-center justify-center">
                  <ShoppingBag className="h-4 w-4 text-[#373737]" />
                </div>
                <p className="text-caption text-[#3f3f3f]">Market price query</p>
              </button>
            </div>
          </section>

          <section className="mt-5">
            <div className="overflow-hidden rounded-2xl border border-[#d8d8d8]">
              <div className="h-28 bg-[radial-gradient(circle_at_35%_20%,rgba(215,232,199,0.25),transparent_35%),linear-gradient(120deg,#667f39,#5b7632_35%,#516d2d)] p-3 flex items-end">
                <div className="text-[20px] text-white">🌾</div>
              </div>
              <div className="bg-[#2d6e32] px-4 py-3 text-white">
                <p className="text-caption leading-[20px]">
                  &quot;KilimoChat gave me the diagnosis I needed when no one else was around to visit my shamba.&quot; - M. Kariuki
                </p>
              </div>
            </div>
          </section>
        </main>

        

        {/* Beautiful KilimoAssistant Advert Section */}
        <section className="px-4 pb-8 mt-4">
          {/* Hero Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#148d42] via-[#1a6b3a] to-[#0f4a28] p-6 mb-6 shadow-[0_8px_30px_rgba(20,141,66,0.3)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <Leaf className="h-5 w-5 text-white" />
                </div>
                <span className="text-white/80 text-sm font-medium">KilimoAssistant</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Transform Your Farm with AI
              </h2>
              <p className="text-white/80 text-sm mb-4">
                The future of farming is here. Get instant crop diagnosis, weather alerts, and expert advice - all for free.
              </p>
              <button 
                onClick={() => navigate('/chat')}
                className="bg-white text-[#148d42] px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-white/90 transition-all hover:scale-105 active:scale-95 shadow-lg"
              >
                Start Chatting Now
              </button>
            </div>
          </div>
          
          {/* Features Grid */}
          <h3 className="text-lg font-semibold text-[#186d35] mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Why Farmers Love KilimoAssistant
          </h3>
          
          <div className="grid grid-cols-2 gap-3 mb-6">
            {adverts.map((ad, index) => (
              <div 
                key={index}
                className="group relative overflow-hidden rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              >
                {/* Gradient background on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${ad.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                
                <div className="relative z-10">
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${ad.gradient} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <ad.icon className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="font-semibold text-[#186d35] text-sm mb-1">{ad.title}</h4>
                  <p className="text-xs text-[#656565] mb-2">{ad.subtitle}</p>
                  <p className="text-[10px] text-[#888] leading-relaxed">{ad.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* CTA Section */}
          <div className="bg-gradient-to-r from-[#f8f9fa] to-[#e9ecef] rounded-2xl p-5 text-center">
            <p className="text-[#454545] text-sm mb-3">
              Ready to boost your harvest?
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => navigate('/chat')}
                className="bg-[#148d42] text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-[#0f7e39] transition-all hover:scale-105 active:scale-95"
              >
                Chat Now
              </button>
              <button 
                onClick={() => navigate('/expert-chat')}
                className="bg-white text-[#148d42] border border-[#148d42] px-5 py-2 rounded-full text-sm font-medium hover:bg-[#148d42]/5 transition-all"
              >
                Expert Help
              </button>
            </div>
          </div>
        </section>
        <footer className="border-t border-[#e5e5e5] px-4 pt-4 pb-20 text-center">
          <div className="flex items-center justify-center gap-2 text-[#2f8a45]">
            <div className="h-5 w-5 rounded-full bg-[#2f8a45] flex items-center justify-center">
              <Sprout className="h-3 w-3 text-white" />
            </div>
            <span className="text-title font-semibold">KilimoChat</span>
          </div>
          <p className="mt-1 text-body text-[#767676]">Built for Kenya 🇰🇪</p>
          <div className="mt-2 flex justify-center gap-7 text-body text-[#777]">
            <span>About</span>
            <span>GitHub</span>
            <span>Privacy</span>
          </div>
        </footer>

        <DockNavigation />
      </div>
    </div>
  );
};

export default AboutPage;
