import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, EyeOff, Phone, Lock, AlertCircle } from 'lucide-react'
import Brand from '../Brand'

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isLoading, error, clearError } = useAuth()

  const [form, setForm] = useState({ phone_number: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const from = location.state?.from?.pathname || '/home'

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
    if (fieldErrors[name]) setFieldErrors((p) => ({ ...p, [name]: '' }))
    if (error) clearError()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errors = {}
    if (!form.phone_number.trim()) errors.phone_number = 'Phone number is required'
    else if (!/^(\+2547\d{8}|07\d{8}|7\d{8})$/.test(form.phone_number.replace(/\s/g, '')))
      errors.phone_number = 'Use +2547XXXXXXXX or 07XXXXXXXX'
    if (!form.password) errors.password = 'Password is required'
    setFieldErrors(errors)
    if (Object.keys(errors).length) return

    const result = await login(form.phone_number, form.password)
    if (result.success) navigate(from, { replace: true })
  }

  return (
    <div className="relative flex min-h-dvh flex-col grad-hero px-5 pb-8">
      <div className="safe-top absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 top-24 h-56 w-56 animate-pulse rounded-full bg-white/10" />
        <div className="absolute -right-20 top-10 h-72 w-72 animate-pulse rounded-full bg-white/5 [animation-delay:500ms]" />
        <div className="absolute bottom-32 right-10 h-40 w-40 rounded-full bg-yellow-300/10 blur-2xl" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col justify-end">
        <div className="mb-8 animate-fade-up">
          <div className="mb-5 flex justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-2xl">
              <Brand size="lg" withName={false} />
            </span>
          </div>
          <h1 className="text-balance text-center text-3xl font-extrabold tracking-tight text-white">
            Welcome back, Mkulima!
          </h1>
          <p className="mt-2 text-center text-[15px] text-white/80">
            Sign in to your KilimoChat account and keep growing.
          </p>
        </div>

        <div className="animate-fade-up rounded-[2rem] bg-white p-6 shadow-2xl [animation-delay:120ms]">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="phone_number">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-faint" />
              <input
                id="phone_number"
                name="phone_number"
                className={`field pl-11 ${fieldErrors.phone_number ? 'border-red-300' : ''}`}
                placeholder="+254712345678"
                inputMode="tel"
                autoComplete="tel"
                value={form.phone_number}
                onChange={handleChange}
              />
            </div>
            {fieldErrors.phone_number && (
              <p className="mt-1 pl-1 text-[12px] text-red-500">{fieldErrors.phone_number}</p>
            )}

            <label className="field-label mt-4" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-faint" />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className={`field pl-11 pr-11 ${fieldErrors.password ? 'border-red-300' : ''}`}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-ink-faint active:scale-95"
                aria-label="Toggle password"
              >
                {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1 pl-1 text-[12px] text-red-500">{fieldErrors.password}</p>
            )}

            <div className="mt-3 flex justify-end">
              <Link to="/register" className="text-[13px] font-semibold text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary mt-4 w-full text-[16px]">
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-black/10" />
            <span className="text-[12px] font-medium text-ink-faint">OR</span>
            <span className="h-px flex-1 bg-black/10" />
          </div>

          <p className="text-center text-[14px] text-ink-soft">
            New to KilimoChat?{' '}
            <Link to="/register" className="font-bold text-primary">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage