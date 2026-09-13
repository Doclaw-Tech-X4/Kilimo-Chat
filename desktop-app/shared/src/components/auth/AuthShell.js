import React from 'react';
import { Sprout, MessageCircle, ShoppingBag, Sun } from 'lucide-react';

const AuthShell = ({ title, subtitle, children, footer }) => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f3f6f3]">
      {/* Marketing panel */}
      <div className="kc-leaf-bg relative hidden flex-1 items-center justify-center overflow-hidden p-10 text-white lg:flex">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 max-w-md">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/95 text-[#0f7e39] shadow-2xl">
            <Sprout className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-extrabold leading-tight drop-shadow-sm">
            Empowering Kenyan Farmers with AI
          </h1>
          <p className="mt-3 text-white/90">
            Crop diagnosis, market prices, weather, and expert advice — in English and Swahili.
          </p>

          <div className="mt-8 space-y-3">
            {[
              { icon: MessageCircle, text: 'Ask any farming question, anytime' },
              { icon: ShoppingBag, text: 'Live market prices across Kenya' },
              { icon: Sun, text: 'Location-aware planting recommendations' },
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
                <feat.icon className="h-5 w-5 flex-shrink-0 text-yellow-300" />
                <span className="text-sm font-medium text-white/95">{feat.text}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl bg-white/10 p-4 text-sm text-white/85 backdrop-blur-sm">
            "KilimoChat helped me identify a tomato blight in minutes — my whole crop survived."
            <div className="mt-2 text-xs font-semibold text-yellow-300">— Grace W., Tomato Farmer, Kiambu</div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col items-center justify-center overflow-y-auto bg-[#f3f6f3] px-6 py-10 lg:w-[46rem] lg:max-w-[46rem] xl:max-w-[50rem]">
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="mb-3 flex items-center gap-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-light to-primary shadow-soft">
              <Sprout className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-extrabold text-[#0f7e39]">KilimoChat</span>
          </div>

          <h2 className="text-2xl font-extrabold text-[#1f2937]">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-[#8a938c]">{subtitle}</p>}
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-5 text-center text-sm text-[#8a938c]">{footer}</div>}
        </div>
      </div>
    </div>
  );
};

export default AuthShell;