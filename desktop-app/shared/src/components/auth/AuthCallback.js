import React, { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle2, XCircle } from 'lucide-react';
import { authAPI } from '../../services/api';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const [state, setState] = useState({ status: 'processing', message: 'Processing…' });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const success = params.get('success');

    const run = async () => {
      if (success === 'true' && token) {
        const result = await loginWithToken(token);
        if (result.success) {
          setState({ status: 'ok', message: 'Login successful! Redirecting…' });
          setTimeout(() => navigate('/home', { replace: true }), 1200);
        } else {
          setState({ status: 'error', message: result.error || 'Could not verify login.' });
          setTimeout(() => navigate('/login', { replace: true }), 2000);
        }
      } else {
        setState({ status: 'error', message: 'Login failed. Redirecting to login…' });
        setTimeout(() => navigate('/login?error=google_auth_failed', { replace: true }), 1500);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Support direct token handling as in the original web app
  if (state.status === 'pending') {
    return <Navigate to="/login" replace />;
  }

  const Icon = state.status === 'ok' ? CheckCircle2 : XCircle;

  return (
    <div className="kc-leaf-bg flex h-screen w-full items-center justify-center">
      <div className="kc-card flex w-full max-w-sm flex-col items-center gap-3 p-8 text-center kc-scale-in">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full ${
            state.status === 'ok' ? 'bg-[#e6f5e9]' : 'bg-red-50'
          }`}
        >
          <Icon className={`h-8 w-8 ${state.status === 'ok' ? 'text-primary' : 'text-red-500'}`} />
        </div>
        <div className="text-[15px] font-semibold text-[#1f2937]">{state.message}</div>
        <div className="text-xs text-[#8a938c]">KilimoChat Desktop</div>
      </div>
    </div>
  );
};

export default AuthCallback;