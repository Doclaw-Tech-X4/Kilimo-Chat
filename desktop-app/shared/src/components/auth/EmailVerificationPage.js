import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { MailCheck, RefreshCw, ArrowLeft, AlertCircle, Verified } from 'lucide-react';
import AuthShell from './AuthShell';

const EmailVerificationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyEmail, isLoading, error, clearError } = useAuth();

  const [userId, setUserId] = useState(() => location.state?.userId || null);
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [resendMsg, setResendMsg] = useState({ ok: false, text: '' });
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('pending_verification_user_id');
    if (!userId && saved) setUserId(saved);
    if (userId) localStorage.setItem('pending_verification_user_id', userId);
    return () => localStorage.removeItem('pending_verification_user_id');
  }, [userId]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    if (!userId) navigate('/register', { replace: true });
  }, [userId, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    if (code.length !== 6) return;
    const result = await verifyEmail(userId, code);
    if (result.success) {
      navigate('/login');
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendMsg({ ok: false, text: '' });
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/auth/resend-verification`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setResendMsg({ ok: true, text: 'Verification code sent!' });
        setCountdown(30);
      } else {
        setResendMsg({ ok: false, text: data.detail || 'Failed to resend code.' });
      }
    } catch (err) {
      setResendMsg({ ok: false, text: 'Network error. Please try again.' });
    } finally {
      setResending(false);
    }
  };

  if (userId === null) return null;

  return (
    <AuthShell
      title="Verify your email"
      subtitle="Enter the 6-digit code we sent to your inbox."
      footer={
        <Link to="/login" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Sign In
        </Link>
      }
    >
      <div className="kc-card p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e6f5e9]">
            <MailCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[#1f2937]">Verification Code</div>
            <div className="text-xs text-[#8a938c]">
              6-digit code · sent via email
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {resendMsg.text && (
          <div
            className={`mb-4 rounded-xl border p-3 text-sm ${
              resendMsg.ok
                ? 'border-primary/30 bg-[#e6f5e9] text-primary'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {resendMsg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="kc-label">6-digit code</label>
            <input
              className="kc-input text-center !text-lg !font-bold tracking-[0.6em]"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                clearError();
              }}
              inputMode="numeric"
              placeholder="______"
              maxLength={6}
              autoFocus
            />
          </div>

          <button type="submit" disabled={isLoading || code.length !== 6} className="kc-btn-primary w-full !py-3">
            <Verified className="h-4 w-4" />
            {isLoading ? 'Verifying…' : 'Verify Email'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending || countdown > 0}
          className="kc-btn-ghost mt-3 w-full"
        >
          <RefreshCw className={`h-4 w-4 ${resending ? 'animate-spin' : ''}`} />
          {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend Code'}
        </button>

        <p className="mt-4 rounded-xl bg-[#f3f6f3] p-3 text-xs text-[#8a938c]">
          💡 Tip: Check your spam folder. The code is valid for a limited time only.
        </p>
      </div>
    </AuthShell>
  );
};

export default EmailVerificationPage;