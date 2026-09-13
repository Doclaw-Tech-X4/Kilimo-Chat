import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Brand from './Brand'

const AppHeader = ({ title, subtitle, onBack = null, right }) => {
  const navigate = useNavigate()
  return (
    <header className="safe-top app-header">
      <div className="app-header-inner">
        <div className="flex min-w-0 items-center gap-3">
          {onBack !== null && (
            <button
              onClick={onBack ?? (() => navigate(-1))}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow-card active:scale-95"
              aria-label="Back"
            >
              <ArrowLeft className="h-[18px] w-[18px]" />
            </button>
          )}
          {onBack === null && (
            <button onClick={() => navigate('/home')} aria-label="Home">
              <Brand />
            </button>
          )}
          {title && (
            <div className="min-w-0">
              <h1 className="truncate text-[17px] font-bold leading-tight text-ink">{title}</h1>
              {subtitle && <p className="truncate text-[12px] text-ink-soft">{subtitle}</p>}
            </div>
          )}
        </div>
        {right}
      </div>
    </header>
  )
}

export default AppHeader