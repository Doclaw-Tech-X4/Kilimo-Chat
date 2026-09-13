import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Phone, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { authAPI } from '../../services/api';
import AuthShell from './AuthShell';
import GoogleIcon from '../ui/GoogleIcon';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithToken, isLoading, error, clearError } = useAuth();

  const [formData, setFormData] = useState({ phone_number: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  const from = location.state?.from || '/home';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: '' }));
    if (error) clearError();
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.phone_number.trim()) {
      errors.phone_number = 'Phone number is required';
    } else {
      const phoneRegex = /^(\+2547\d{8}|07\d{8}|7\d{8})$/;
      if (!phoneRegex.test(formData.phone_number.replace(/\s/g, ''))) {
        errors.phone_number = 'Use +2547XXXXXXXX, 07XXXXXXXX or 7XXXXXXXX';
      }
    }
    if (!formData.password) errors.password = 'Password is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGoogleError('');
    if (!validateForm()) return;
    const result = await login(formData.phone_number, formData.password);
    if (result.success) navigate(from, { replace: true });
  };

  const handleGoogleLogin = async () => {
    setGoogleError('');
    setGoogleLoading(true);
    try {
      const desktopApi = window.desktopAPI;
      if (desktopApi?.googleLogin) {
        // Electron: open a dedicated OAuth window, token returned via IPC.
        const token = await desktopApi.googleLogin();
        if (token) {
          const result = await loginWithToken(token);
          if (result.success) navigate(from, { replace: true });
          else setGoogleError(result.error || 'Google login failed');
        } else {
          setGoogleError('Google login was cancelled or failed.');
        }
      } else {
        // Browser fallback: redirect (unchanged behaviour).
        authAPI.googleAuth.initiate();
      }
    } catch (err) {
      console.error('Google login error', err);
      setGoogleError('Unable to complete Google login.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome Back"
      subtitle="Sign in to your KilimoChat account"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Sign Up
          </Link>
        </>
      }
    >
      {(error || googleError) && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error || googleError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="kc-label">Phone Number</label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa39c]" />
            <input
              className={`kc-input !pl-10 ${formErrors.phone_number ? '!border-red-300' : ''}`}
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              placeholder="+254712345678"
              autoComplete="username"
            />
          </div>
          {formErrors.phone_number && (
            <p className="mt-1 text-xs text-red-500">{formErrors.phone_number}</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="kc-label">Password</label>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="mb-1.5 text-xs font-semibold text-primary hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa39c]" />
            <input
              className={`kc-input !pl-10 !pr-10 ${formErrors.password ? '!border-red-300' : ''}`}
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa39c] hover:text-[#1f2937]"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {formErrors.password && <p className="mt-1 text-xs text-red-500">{formErrors.password}</p>}
        </div>

        <button type="submit" disabled={isLoading} className="kc-btn-primary w-full !py-3">
          {isLoading ? 'Signing in…' : 'Sign In'}
          {!isLoading && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#e4eae5]" />
        <span className="text-xs font-semibold uppercase tracking-wider text-[#a2aca4]">or</span>
        <div className="h-px flex-1 bg-[#e4eae5]" />
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleLoading}
        className="kc-btn-outline w-full !py-3"
      >
        <GoogleIcon className="h-4 w-4" />
        {googleLoading ? 'Opening Google…' : 'Continue with Google'}
      </button>
    </AuthShell>
  );
};

export default LoginPage;