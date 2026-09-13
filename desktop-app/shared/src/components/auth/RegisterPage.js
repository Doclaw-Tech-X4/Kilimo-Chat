import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Phone,
  Lock,
  Eye,
  EyeOff,
  Mail,
  UserRound,
  AlertCircle,
  CheckCircle2,
  Send,
} from 'lucide-react';
import { authAPI } from '../../services/api';
import AuthShell from './AuthShell';
import GoogleIcon from '../ui/GoogleIcon';

const initialForm = {
  full_name: '',
  phone_number: '',
  email: '',
  password: '',
  confirm_password: '',
};

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /\d/.test(p) },
  { label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuth();

  const [formData, setFormData] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [userId, setUserId] = useState(null);
  const [emailSent, setEmailSent] = useState(true);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: '' }));
    if (error) clearError();
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.full_name.trim()) errors.full_name = 'Full name is required';
    if (!formData.phone_number.trim()) {
      errors.phone_number = 'Phone number is required';
    } else {
      const phoneRegex = /^(\+2547\d{8}|07\d{8}|7\d{8})$/;
      if (!phoneRegex.test(formData.phone_number.replace(/\s/g, ''))) {
        errors.phone_number = 'Use +2547XXXXXXXX, 07XXXXXXXX or 7XXXXXXXX';
      }
    }
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      errors.email = 'Enter a valid email address';
    }

    const failedRule = PASSWORD_RULES.find((rule) => !rule.test(formData.password));
    if (failedRule) errors.password = `Password must have ${failedRule.label.toLowerCase()}`;
    if (formData.confirm_password !== formData.password) {
      errors.confirm_password = 'Passwords do not match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGoogleError('');
    if (!validateForm()) return;

    const { confirm_password, ...payload } = formData;
    const result = await register(payload);
    if (result.success) {
      setUserId(result.user_id);
      setEmailSent(result.email_sent !== false);
      setRegistrationSuccess(true);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendMsg('');
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
      setResendMsg(data.success ? 'Verification email sent!' : data.detail || 'Something went wrong.');
    } catch (err) {
      setResendMsg('Unable to resend. Try again in a moment.');
    } finally {
      setResending(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleError('');
    setGoogleLoading(true);
    try {
      if (window.desktopAPI?.googleLogin) {
        const token = await window.desktopAPI.googleLogin();
        if (!token) setGoogleError('Google sign in cancelled or failed.');
        else navigate('/home');
      } else {
        authAPI.googleAuth.initiate();
      }
    } catch (err) {
      setGoogleError('Unable to complete Google sign in.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell
      title={registrationSuccess ? 'Account created!' : 'Create your account'}
      subtitle={
        registrationSuccess
          ? 'One last step before you can start farming smarter.'
          : 'Join thousands of farmers getting expert AI advice.'
      }
      footer={
        registrationSuccess ? null : (
          <>
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign In
            </Link>
          </>
        )
      }
    >
      {registrationSuccess ? (
        <div className="kc-card animate-scale-in p-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#e6f5e9]">
            <CheckCircle2 className="h-9 w-9 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-[#1f2937]">Check your inbox 📮</h3>
          <p className="mt-2 text-sm text-[#8a938c]">
            {emailSent
              ? 'We sent a 6-digit verification code to your email. Verify it to activate your account.'
              : 'Verification email is on its way, or ask us to resend it.'}
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              className="kc-btn-primary"
              onClick={() => navigate('/verify-email', { state: { userId } })}
            >
              <Send className="h-4 w-4" />
              Enter Verification Code
            </button>
            <button type="button" className="kc-btn-outline" onClick={handleResend} disabled={resending}>
              {resending ? 'Resending…' : 'Resend Email'}
            </button>
          </div>

          {resendMsg && (
            <p className={`mt-3 text-sm ${resendMsg.includes('sent!') ? 'text-primary' : 'text-red-600'}`}>
              {resendMsg}
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {(error || googleError) && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error || googleError}</span>
            </div>
          )}

          <div>
            <label className="kc-label">Full Name</label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa39c]" />
              <input
                className="kc-input !pl-10"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="e.g. Mary Njeri"
              />
            </div>
            {formErrors.full_name && <p className="mt-1 text-xs text-red-500">{formErrors.full_name}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="kc-label">Phone Number</label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa39c]" />
                <input
                  className="kc-input !pl-10"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  placeholder="07XXXXXXXX"
                />
              </div>
              {formErrors.phone_number && (
                <p className="mt-1 text-xs text-red-500">{formErrors.phone_number}</p>
              )}
            </div>
            <div>
              <label className="kc-label">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa39c]" />
                <input
                  className="kc-input !pl-10"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                />
              </div>
              {formErrors.email && <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="kc-label">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa39c]" />
                <input
                  className="kc-input !pl-10 !pr-10"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa39c] hover:text-[#1f2937]"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formErrors.password && (
                <p className="mt-1 text-xs text-red-500">{formErrors.password}</p>
              )}
              <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                {PASSWORD_RULES.map((rule) => {
                  const passed = rule.test(formData.password);
                  return (
                    <li
                      key={rule.label}
                      className={`flex items-center gap-1.5 text-[11px] ${passed ? 'text-primary' : 'text-[#a2aca4]'
                        }`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <label className="kc-label">Confirm Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa39c]" />
                <input
                  className="kc-input !pl-10 !pr-10"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa39c] hover:text-[#1f2937]"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formErrors.confirm_password && (
                <p className="mt-1 text-xs text-red-500">{formErrors.confirm_password}</p>
              )}
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="kc-btn-primary w-full !py-3">
            {isLoading ? 'Creating account…' : 'Create Account'}
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[#e4eae5]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#a2aca4]">or</span>
            <div className="h-px flex-1 bg-[#e4eae5]" />
          </div>

          <button type="button" onClick={handleGoogleLogin} disabled={googleLoading} className="kc-btn-outline w-full !py-3">
            <GoogleIcon className="h-4 w-4" />
            {googleLoading ? 'Opening Google…' : 'Continue with Google'}
          </button>
        </form>
      )}
    </AuthShell>
  );
};

export default RegisterPage;