import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Mail, ShieldCheck, RefreshCw, ArrowLeft, AlertCircle } from 'lucide-react'
import Brand from '../Brand'
import { authAPI } from '../../services/api'

const EmailVerificationPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { verifyEmail, isLoading, error, clearError } = useAuth()

  const [code, setCode] = useState('')
  const [formError, setFormError] = useState('')
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState('')
  const [countdown, setCountdown] = useState(0)

  const userId = location.state?.userId || localStorage.getItem('pending_verification_user_id')

  useEffect(() => {
    if (!userId) {
      navigate('/register', { replace: true })
      return
    }
    localStorage.setItem('pending_verification_user_id', userId)
    return () => localStorage.removeItem('pending_verification_user_id')
  }, [userId, navigate])

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [countdown])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (code.length !== 6) {
      setFormError('Please enter the 6-digit code')
      return
    }
    const result = await verifyEmail(userId, code)
    if (result.success) navigate('/login')
  }

  const handleResend = async () => {
    setResending(true)
    setResendMsg('')
    try {
      const result = await authAPI.resendVerification(userId)
      if (result.success) {
        setCountdown(30)
        setResendMsg('Verification code sent!')
        setTimeout(() => setResendMsg(''), 5000)
      } else {
        setFormError(result.detail || 'Failed to resend code')
      }
    } catch {
      setFormError('Failed to resend code')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-page px-5 pb-8">
      <header className="safe-top flex items-center py-5">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-card active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-[18px] w-[18px]" />
        </button>
        <span className="ml-4"><Brand size="sm" /></span>
      </header>

      <div className="mx-auto w-full max-w-sm animate-fade-up">
        <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-soft">
          <Mail className="h-8 w-8 text-primary" />
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Verify your email</h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">
          We've sent a <strong>6-digit code</strong> to your inbox. Enter it below to activate your account.
        </p>

        {resendMsg && (
          <div className="mt-4 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-[13px] text-green-700">
            {resendMsg}
          </div>
        )}
        {(error || formError) && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error || formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6">
          <label className="field-label" htmlFor="vcode">Verification Code</label>
          <input
            id="vcode"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, ''))
              setFormError('')
              if (error) clearError()
            }}
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            className="field text-center text-2xl font-bold tracking-[0.5em]"
          />
          <button
            type="submit"
            disabled={isLoading || code.length !== 6}
            className="btn-primary mt-5 w-full text-[16px]"
          >
            {isLoading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            onClick={handleResend}
            disabled={resending || countdown > 0}
            className="flex items-center gap-2 text-[14px] font-semibold text-primary disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${resending ? 'animate-spin' : ''}`} />
            {resending ? 'Sending...' : countdown > 0 ? `Resend (${countdown}s)` : 'Resend code'}
          </button>
        </div>

        <div className="mt-6 flex items-start gap-2.5 rounded-2xl bg-black/[0.03] p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="text-[12.5px] leading-relaxed text-ink-soft">
            <strong className="text-ink">Didn't receive it?</strong> Check your spam/junk folder, make
            sure the email address is correct, and wait a few minutes before requesting a new code.
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmailVerificationPage