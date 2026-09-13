import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import EmailVerificationPage from './components/auth/EmailVerificationPage';
import AuthCallback from './components/auth/AuthCallback';
import AppLayout from './components/layout/AppLayout';

import HomePage from './components/HomePage';
import ChatPage from './components/ChatPage';
import RecordPage from './components/RecordPage';
import WeatherPage from './components/WeatherPage';
import MarketPage from './components/MarketPage';
import ProfilePage from './components/ProfilePage';
import AboutPage from './components/AboutPage';
import AdminDashboard from './components/AdminDashboard';

function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f3f6f3]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-2xl bg-primary/20" />
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-light to-primary text-2xl shadow-soft">
              🌱
            </div>
          </div>
          <div className="text-sm font-semibold text-[#8a938c]">Loading KilimoChat…</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return <Navigate to={isAuthenticated ? '/home' : '/login'} replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App" style={{ height: '100vh', overflow: 'hidden' }}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<EmailVerificationPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            <Route element={<ProtectedLayout />}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/record" element={<RecordPage />} />
              <Route path="/weather" element={<WeatherPage />} />
              <Route path="/market" element={<MarketPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/help" element={<AboutPage />} />
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;