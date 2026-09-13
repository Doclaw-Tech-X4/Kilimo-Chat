import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react'
import { Sprout, Sparkles } from 'lucide-react'

const splashKey = 'kilimo_splash_shown'
const SplashContext = createContext(null)

export default function SplashProvider({ children }) {
  const [visible, setVisible] = useState(() => {
    try {
      return sessionStorage.getItem(splashKey) !== 'true'
    } catch {
      return true
    }
  })

  const done = useCallback(() => {
    try {
      sessionStorage.setItem(splashKey, 'true')
    } catch {
      /* noop */
    }
    setVisible(false)
  }, [])

  useEffect(() => {
    if (visible) {
      const t = setTimeout(done, 2400)
      return () => clearTimeout(t)
    }
  }, [visible, done])

  return <SplashContext.Provider value={{ done, visible }}>{children}</SplashContext.Provider>
}

const useSplash = () => useContext(SplashContext)

export function SplashScreen() {
  const { visible, done } = useSplash()
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    if (!visible) return
    const t1 = setTimeout(() => setPhase(1), 300)
    const t2 = setTimeout(() => setPhase(2), 1800)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [visible])

  const running = visible && phase < 2

  return (
    <div
      onClick={() => running && done()}
      className={`
        fixed inset-0 z-[100] flex flex-col items-center justify-center transition-all duration-1000
        ${running ? 'grad-hero opacity-100' : 'pointer-events-none opacity-0'}
      `}
    >
      <div
        className={`relative flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-2xl transition-all duration-700 ${
          phase >= 1 ? 'scale-110 -rotate-3' : 'scale-90'
        }`}
      >
        <Sprout className="h-11 w-11 text-[#0f7e39]" />
        <Sparkles className="absolute -right-2 -top-2 h-6 w-6 text-yellow-300" />
        <div className="absolute inset-0 -m-3 animate-pulse-ring rounded-[2rem] border-2 border-white/40" />
      </div>

      <h1
        className={`mt-6 text-4xl font-extrabold tracking-tight text-white transition-all duration-700 ${
          phase >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        Kilimo<span className="text-white/70">Chat</span>
      </h1>
      <p
        className={`mt-2 text-sm font-medium text-white/80 transition-all delay-100 duration-700 ${
          phase >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        Your Smart Farming Companion
      </p>

      <div className={`mt-8 flex gap-2 transition-all duration-500 ${phase >= 1 ? 'opacity-100' : 'opacity-0'}`}>
        <span className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:300ms]" />
      </div>
    </div>
  )
}