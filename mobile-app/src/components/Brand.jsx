import { Sprout } from 'lucide-react'

export default function Brand({ size = 'md', light = false, withName = true }) {
  const box = size === 'lg' ? 'h-11 w-11 rounded-2xl' : size === 'sm' ? 'h-7 w-7 rounded-xl' : 'h-9 w-9 rounded-xl'
  const icon = size === 'lg' ? 'h-6 w-6' : size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  return (
    <span className="flex items-center gap-2.5">
      <span className={`${box} grad-green flex items-center justify-center text-white shadow-lifted`}>
        <Sprout className={icon} />
      </span>
      {withName && (
        <span
          className={`text-[17px] font-bold tracking-tight ${
            light ? 'text-white' : 'text-primary'
          }`}
        >
          Kilimo<span className={light ? 'text-white/70' : 'text-ink-soft'}>Chat</span>
        </span>
      )}
    </span>
  )
}