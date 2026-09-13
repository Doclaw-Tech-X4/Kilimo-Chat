import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Phone, User, Mail, Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'
import Brand from '../Brand'

const passwordRules = [
  { key: 'length', label: 'at least 8 characters', test: (v) => v.length >= 8 },
  { key: 'upper', label: '1 uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { key: 'lower', label: '1 lowercase letter', test: (v) => /[a-z]/.test(v) },
  { key: 'number', label: '1 number', test: (v) => /\d/.test(v) },
  { key: 'special', label: '1 special character', test: (v) => /[!@#$%^&*(),.?":{}|<>]/.test(v) },
]

const RegisterPage = () => {
  const navigate = useNavigate()
  const { register, isLoading, error, clearError } = useAuth()

  const [form, setForm] = useState({
    phone_number: '',
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [success, setSuccess] = useState(null)

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

    if (!form.full_name.trim()) errors.full_name = 'Full name is required'
    else if (form.full_name.trim().length < 2) errors.full_name = 'Name must be at least 2 characters'

    if (!form.email) errors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Invalid email address'

    const missing = passwordRules.filter((r) => !r.test(form.password)).map((r) => r.label)
    if (missing.length) errors.password = `Password must contain ${missing.join(', ')}`
    if (form.password !== form.confirm_password) errors.confirm_password = 'Passwords do not match'

    setFieldErrors(errors)
    if (Object.keys(errors).length) return

    const result = await register(form)
    if (result.success) {
      setSuccess({ user_id: result.user_id, email: form.email })
    }
  }

  if (success) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-page px-6">
        <div className="w-full max-w-sm animate-fade-up rounded-[2rem] bg-white p-8 text-center shadow-card">
          <span className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </span>
          <h1 className="text-2xl font-extrabold text-ink">Account Created!</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
            We've sent a 6-digit verification code to <strong>{success.email}</strong>. Enter it to
            finish setting up your farm profile.
          </p>
          <button
            onClick={() => navigate('/verify-email', { state: { userId: success.user_id } })}
            className="btn-primary mt-6 w-full text-[16px]"
          >
            Verify Email
          </button>
          <button
            onClick={() => navigate('/login')}
            className="mt-3 w-full text-[14px] font-semibold text-primary"
          >
            Already verified? Sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-page px-5 pb-8">
      <header className="safe-top flex items-center justify-center py-5">
        <Brand />
      </header>

      <div className="mx-auto w-full max-w-sm animate-fade-up">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Create account</h1>
        <p className="mt-1 text-[14px] text-ink-soft">
          Join KilimoChat and get AI-powered farming assistance.
        </p>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="field-label" htmlFor="reg-phone">Phone Number</label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-faint" />
              <input
                id="reg-phone"
                name="phone_number"
                className={`field pl-11 ${fieldErrors.phone_number ? 'border-red-300' : ''}`}
                placeholder="+254712345678"
                inputMode="tel"
                value={form.phone_number}
                onChange={handleChange}
              />
            </div>
            {fieldErrors.phone_number && <p className="mt-1 pl-1 text-[12px] text-red-500">{fieldErrors.phone_number}</p>}
          </div>

          <div>
            <label className="field-label" htmlFor="reg-name">Full Name</label>
            <div className="relative">
              <User className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-faint" />
              <input
                id="reg-name"
                name="full_name"
                className={`field pl-11 ${fieldErrors.full_name ? 'border-red-300' : ''}`}
                placeholder="e.g. John Mwangi"
                value={form.full_name}
                onChange={handleChange}
              />
            </div>
            {fieldErrors.full_name && <p className="mt-1 pl-1 text-[12px] text-red-500">{fieldErrors.full_name}</p>}
          </div>

          <div>
            <label className="field-label" htmlFor="reg-email">Email Address</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-faint" />
              <input
                id="reg-email"
                name="email"
                type="email"
                className={`field pl-11 ${fieldErrors.email ? 'border-red-300' : ''}`}
                placeholder="you@example.com"
                inputMode="email"
                value={form.email}
                onChange={handleChange}
              />
            </div>
            {fieldErrors.email && <p className="mt-1 pl-1 text-[12px] text-red-500">{fieldErrors.email}</p>}
          </div>

          <div>
            <label className="field-label" htmlFor="reg-password">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-faint" />
              <input
                id="reg-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className={`field pl-11 pr-11 ${fieldErrors.password ? 'border-red-300' : ''}`}
                placeholder="Create a strong password"
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
            {fieldErrors.password && <p className="mt-1 pl-1 text-[12px] text-red-500">{fieldErrors.password}</p>}
          </div>

          <div className="rounded-2xl bg-black/[0.03] p-3.5">
            <p className="text-[12px] font-semibold text-ink-soft">Password must contain:</p>
            <ul className="mt-2 grid grid-cols-1 gap-1.5">
              {passwordRules.map((r) => {
                const ok = r.test(form.password)
                return (
                  <li key={r.key} className={`flex items-center gap-2 text-[12px] ${ok ? 'text-primary' : 'text-ink-faint'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-primary' : 'bg-black/20'}`} />
                    {r.label}
                  </li>
                )
              })}
            </ul>
          </div>

          <div>
            <label className="field-label" htmlFor="reg-confirm">Confirm Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-faint" />
              <input
                id="reg-confirm"
                name="confirm_password"
                type={showConfirm ? 'text' : 'password'}
                className={`field pl-11 pr-11 ${fieldErrors.confirm_password ? 'border-red-300' : ''}`}
                placeholder="Repeat your password"
                value={form.confirm_password}
                onChange={handleChange}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-ink-faint active:scale-95"
                aria-label="Toggle confirm password"
              >
                {showConfirm ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </div>
            {fieldErrors.confirm_password && <p className="mt-1 pl-1 text-[12px] text-red-500">{fieldErrors.confirm_password}</p>}
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full text-[16px]">
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-5 text-center text-[14px] text-ink-soft">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-primary">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}

export default RegisterPage