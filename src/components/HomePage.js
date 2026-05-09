import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Sprout, ScanLine, BadgeCheck, Repeat2, Mic, Sun, ShoppingBag, MessageCircle, ChevronRight, Sparkles } from 'lucide-react';
import DockNavigation from './DockNavigation';

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Check if splash was already shown in this session
  const hasSeenSplash = sessionStorage.getItem('kilimoSplashShown') === 'true';
  
  const [showSplash, setShowSplash] = useState(!hasSeenSplash);
  const [splashPhase, setSplashPhase] = useState(0);
  const [typedText, setTypedText] = useState('');

  // Welcome message for typewriter effect
  const welcomeMessage = user 
    ? `Karibu ${user.full_name?.split(' ')[0] || ''}! Welcome to KilimoChat 🌾`
    : "Karibu! Welcome to KilimoChat 🌾";

  // Flash screen animation sequence - 3 seconds total
  useEffect(() => {
    // Only run splash animation if it hasn't been shown this session
    if (!hasSeenSplash) {
      // Mark splash as shown immediately
      sessionStorage.setItem('kilimoSplashShown', 'true');
      
      const timer1 = setTimeout(() => setSplashPhase(1), 500);      // Start animations
      const timer2 = setTimeout(() => setSplashPhase(2), 2000);    // Begin fade out
      const timer3 = setTimeout(() => setShowSplash(false), 3000); // Remove splash after 3 seconds

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [hasSeenSplash]);

  // Typewriter effect for welcome text
  useEffect(() => {
    if (!showSplash && typedText.length < welcomeMessage.length) {
      const timer = setTimeout(() => {
        setTypedText(welcomeMessage.slice(0, typedText.length + 1));
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showSplash, typedText, welcomeMessage]);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Splash/Flash Screen */}
      {showSplash && (
        <div 
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-all duration-1000 ${
            splashPhase === 0 ? 'bg-[#0f7e39]' : 
            splashPhase === 1 ? 'bg-gradient-to-br from-[#0f7e39] via-[#16813a] to-[#2b8b3a]' : 
            'bg-white opacity-0'
          }`}
        >
          {/* Animated Logo */}
          <div className={`transition-all duration-700 ${splashPhase >= 1 ? 'scale-110' : 'scale-100'}`}>
            <div className="relative">
              {/* Pulsing rings */}
              <div className="absolute inset-0 animate-ping rounded-full bg-white/20 w-24 h-24 -m-4" />
              <div className="absolute inset-0 animate-pulse rounded-full bg-white/10 w-32 h-32 -m-8 delay-150" />
              
              {/* Main logo */}
              <div className="relative h-16 w-16 rounded-2xl bg-white flex items-center justify-center shadow-2xl animate-bounce">
                <Sprout className="h-10 w-10 text-[#0f7e39]" />
              </div>
              
              {/* Sparkles */}
              <Sparkles className={`absolute -top-2 -right-2 h-6 w-6 text-yellow-300 transition-all duration-500 ${splashPhase >= 1 ? 'opacity-100 rotate-12' : 'opacity-0'}`} />
              <Sparkles className={`absolute -bottom-2 -left-2 h-5 w-5 text-yellow-200 transition-all duration-700 delay-200 ${splashPhase >= 1 ? 'opacity-100 -rotate-12' : 'opacity-0'}`} />
            </div>
          </div>
          
          {/* App name with fade */}
          <h1 className={`mt-6 text-3xl font-bold text-white transition-all duration-700 ${splashPhase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            KilimoChat
          </h1>
          
          {/* Tagline */}
          <p className={`mt-2 text-white/80 text-sm transition-all duration-700 delay-150 ${splashPhase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Your Smart Farming Companion
          </p>
          
          {/* Loading dots */}
          <div className={`mt-8 flex gap-2 transition-all duration-500 ${splashPhase >= 1 ? 'opacity-100' : 'opacity-0'}`}>
            <div className="w-2 h-2 rounded-full bg-white animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-white animate-bounce delay-100" />
            <div className="w-2 h-2 rounded-full bg-white animate-bounce delay-200" />
          </div>
        </div>
      )}

      <div className="mx-auto min-h-screen w-full max-w-[420px] bg-[#f5f5f5] border-x border-[#e6e6e6]">
        <header className="flex items-center justify-between px-4 pb-3 pt-2 animate-fade-in">
          <div className="flex items-center gap-2 animate-pulse">
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#0f7e39] to-[#16813a] flex items-center justify-center shadow-lg">
              <Sprout className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-small font-semibold text-[#0f7e39]">KilimoChat</span>
          </div>
          <div 
            onClick={() => navigate('/profile')}
            className="h-6 w-6 rounded-full border border-[#cbcbcb] text-[#7d7d7d] flex items-center justify-center text-xs hover:bg-[#0f7e39] hover:text-white hover:border-[#0f7e39] transition-all duration-300 cursor-pointer"
          >
            👤
          </div>
        </header>
        <main className="px-4 pb-28">
          {/* Animated Welcome Banner */}
          <section className="mb-6 animate-fade-in-up">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f7e39] via-[#16813a] to-[#2b8b3a] p-5 text-white shadow-xl">
              {/* Animated background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-20 h-20 bg-white rounded-full -translate-x-10 -translate-y-10 animate-pulse" />
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full translate-x-10 translate-y-10 animate-pulse delay-300" />
                <div className="absolute top-1/2 left-1/2 w-16 h-16 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 animate-ping" />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" />
                  <span className="text-xs font-medium text-white/80 uppercase tracking-wider">Welcome</span>
                </div>
                <h1 className="text-2xl font-bold mb-1">
                  {typedText}
                  <span className="animate-pulse">|</span>
                </h1>
                <p className="text-white/90 text-sm">
                  The smart farming companion that speaks your language
                </p>
                
                {/* Quick action buttons */}
                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={() => navigate('/expertchat')}
                    className="flex items-center gap-1 bg-white text-[#0f7e39] px-4 py-2 rounded-full text-sm font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Start Chat
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => navigate('/record')}
                    className="flex items-center gap-1 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-white/30 hover:shadow-lg transition-all duration-300"
                  >
                    <Mic className="h-4 w-4" />
                    Voice
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="text-center mb-5 animate-fade-in delay-200">
            <h2 className="text-display font-semibold text-[#196d35]">Nurturing Your Growth</h2>
            <p className="mt-2 text-body text-[#404040]">
              Get expert advice on crops, pests, weather, and market prices
            </p>
          </section>

          <section className="mb-5">
            <h2 className="text-title font-semibold text-[#3f3f3f] mb-3 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-[#0f7e39] animate-pulse" />
              Powerful Features
              <Sparkles className="h-4 w-4 text-[#0f7e39] animate-pulse" />
            </h2>
            <div className="space-y-3">
              <div className="group rounded-xl border border-[#e2e2e2] bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-lg hover:border-[#0f7e39]/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#c8ffcb] to-[#a8f0ac] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Sprout className="h-4 w-4 text-[#127a37] group-hover:rotate-12 transition-transform duration-300" />
                  </div>
                  <div>
                    <h3 className="text-subtitle text-[#2d2d2d]">Crop Diagnosis</h3>
                    <p className="text-small text-[#666]">
                      Upload a photo to identify pests and diseases instantly with expert AI analysis.
                    </p>
                  </div>
                </div>
              </div>

              <div className="group rounded-xl border border-[#e2e2e2] bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-lg hover:border-[#0f7e39]/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#ffe2d8] to-[#ffd0c0] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Mic className="h-4 w-4 text-[#a57a6b] group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div>
                    <h3 className="text-subtitle text-[#2d2d2d]">Voice Support</h3>
                    <p className="text-small text-[#666]">
                      Communicate naturally in Swahili or English using voice notes for ease of use.
                    </p>
                  </div>
                </div>
              </div>

              <div className="group rounded-xl border border-[#e2e2e2] bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-lg hover:border-[#0f7e39]/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#e0ffe2] to-[#c0f0c5] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Sun className="h-4 w-4 text-[#357c40] group-hover:rotate-45 transition-transform duration-500" />
                  </div>
                  <div>
                    <h3 className="text-subtitle text-[#2d2d2d]">Weather Advice</h3>
                    <p className="text-small text-[#666]">
                      Get localized forecasts and hyper-specific planting tips based on your climate.
                    </p>
                  </div>
                </div>
              </div>

              <div className="group rounded-xl border border-[#e2e2e2] bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-lg hover:border-[#0f7e39]/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#c8ffcb] to-[#a8f0ac] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <ShoppingBag className="h-4 w-4 text-[#127a37] group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div>
                    <h3 className="text-subtitle text-[#2d2d2d]">Market Prices</h3>
                    <p className="text-small text-[#666]">
                      Stay updated with the latest real-time prices from markets across Kenya.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-5">
            <h2 className="text-display font-semibold text-[#3f3f3f] flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-[#0f7e39] animate-pulse" />
              How It Works
            </h2>
            <div className="mt-3 rounded-2xl bg-gradient-to-br from-[#f1f1f1] to-[#e8e8e8] p-4 shadow-inner">
              <div className="space-y-4">
                <div className="group flex items-start gap-3 hover:bg-white/50 p-2 rounded-xl transition-all duration-300">
                  <div className="mt-0.5 h-6 w-6 rounded-full bg-gradient-to-br from-[#16813a] to-[#0f7e39] text-white text-xs flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">1</div>
                  <div className="flex-1">
                    <p className="text-caption font-semibold text-[#1f7c39]">Send WhatsApp message</p>
                    <p className="text-xs text-[#666]">
                      Simply open whatsapp and text or send a voice note to our dedicated number.
                    </p>
                  </div>
                  <MessageCircle className="h-4 w-4 text-[#17823b]" />
                </div>

                <div className="group flex items-start gap-3 hover:bg-white/50 p-2 rounded-xl transition-all duration-300">
                  <div className="mt-0.5 h-6 w-6 rounded-full bg-gradient-to-br from-[#16813a] to-[#0f7e39] text-white text-xs flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">2</div>
                  <div className="flex-1">
                    <p className="text-caption font-semibold text-[#1f7c39]">AI Analysis</p>
                    <p className="text-xs text-[#666]">
                      Our advanced AI processes your query, whether it&apos;s a photo, text, or audio.
                    </p>
                  </div>
                  <ScanLine className="h-4 w-4 text-[#17823b]" />
                </div>

                <div className="group flex items-start gap-3 hover:bg-white/50 p-2 rounded-xl transition-all duration-300">
                  <div className="mt-0.5 h-6 w-6 rounded-full bg-gradient-to-br from-[#16813a] to-[#0f7e39] text-white text-xs flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">3</div>
                  <div className="flex-1">
                    <p className="text-caption font-semibold text-[#1f7c39]">Verified Data</p>
                    <p className="text-xs text-[#666]">
                      We cross-reference local agricultural databases to ensure 100% accurate advice.
                    </p>
                  </div>
                  <BadgeCheck className="h-4 w-4 text-[#17823b]" />
                </div>

                <div className="group flex items-start gap-3 hover:bg-white/50 p-2 rounded-xl transition-all duration-300">
                  <div className="mt-0.5 h-6 w-6 rounded-full bg-gradient-to-br from-[#16813a] to-[#0f7e39] text-white text-xs flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">4</div>
                  <div className="flex-1">
                    <p className="text-caption font-semibold text-[#1f7c39]">Instant Response</p>
                    <p className="text-xs text-[#666]">
                      Receive a clear, actionable response within seconds to take immediate action.
                    </p>
                  </div>
                  <Repeat2 className="h-4 w-4 text-[#17823b]" />
                </div>
              </div>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2b8b3a] via-[#16813a] to-[#0f7e39] px-4 py-5 text-center text-white shadow-xl">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full -translate-x-20 -translate-y-20 animate-pulse" />
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-10 translate-y-10 animate-pulse delay-500" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sprout className="h-5 w-5 text-white animate-bounce" />
                <h2 className="text-display font-bold">Ready to Start?</h2>
                <Sprout className="h-5 w-5 text-white animate-bounce delay-100" />
              </div>
              <p className="mt-1 text-body text-white/90">
                Join over 50,000 farmers using KilimoChat to grow better
              </p>
              <a
                href="https://wa.me/+14155238886?text=join%20why-accident"
                target="_blank"
                rel="noopener noreferrer"
                className="group mx-auto mt-4 flex w-full max-w-[330px] items-center justify-center gap-2 rounded-full bg-white py-3 text-title font-semibold text-[#0f7e39] shadow-lg hover:shadow-xl hover:scale-105 hover:bg-[#f0f0f0] transition-all duration-300"
              >
                <MessageCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
                Chat WhatsApp
                <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </section>
        </main>

        <footer className="border-t border-[#e5e5e5] px-4 pt-5 pb-24 text-center">
          <div className="flex items-center justify-center gap-2 text-[#2f8a45] animate-pulse">
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#2f8a45] to-[#0f7e39] flex items-center justify-center shadow-md">
              <Sprout className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-title font-bold">KilimoChat</span>
          </div>
          <p className="mt-2 text-xs text-[#999]">Empowering Kenyan Farmers with AI</p>
          <div className="mt-3 flex justify-center gap-4 text-xs text-[#777]">
            <span className="hover:text-[#0f7e39] cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-[#0f7e39] cursor-pointer transition-colors">Terms</span>
            <span className="hover:text-[#0f7e39] cursor-pointer transition-colors">Contact</span>
          </div>
        </footer>

        <DockNavigation />
      </div>
      
      {/* CSS Animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fade-in-up {
          from { 
            opacity: 0; 
            transform: translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
        
        .delay-200 {
          animation-delay: 200ms;
        }
      `}</style>
    </div>
  );
};

export default HomePage;
