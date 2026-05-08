import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Auth Pages
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import EmailVerificationPage from './components/auth/EmailVerificationPage';

// App Pages
import HomePage from './components/HomePage';
import AboutPage from './components/AboutPage';
import UserProfilePage from './components/UserProfilePage';
import ExpertChatPage from './components/ExpertChatPage';
import RecordPage from './components/RecordPage';
import WeatherPage from './components/WeatherPage';
import MarketPage from './components/MarketPage';
import AdminDashboard from './components/AdminDashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Authentication Routes - Public */}
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<EmailVerificationPage />} />
            
            {/* Protected App Routes - Require Authentication */}
            <Route path="/home" element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            } />
            <Route path="/expertchat" element={
              <ProtectedRoute>
                <ExpertChatPage />
              </ProtectedRoute>
            } />
            <Route path="/record" element={
              <ProtectedRoute>
                <RecordPage />
              </ProtectedRoute>
            } />
            <Route path="/weather" element={
              <ProtectedRoute>
                <WeatherPage />
              </ProtectedRoute>
            } />
            <Route path="/market" element={
              <ProtectedRoute>
                <MarketPage />
              </ProtectedRoute>
            } />
            <Route path="/help" element={
              <ProtectedRoute>
                <AboutPage />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <UserProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            {/* OAuth Callback Route */}
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* Default redirect to login */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

// OAuth Callback Component
function AuthCallback() {
  const [status, setStatus] = React.useState('Processing...');
  
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const success = urlParams.get('success');
    
    if (success === 'true' && token) {
      localStorage.setItem('token', token);
      setStatus('Login successful! Redirecting...');
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } else {
      setStatus('Login failed. Redirecting to login page...');
      setTimeout(() => {
        window.location.href = '/login?error=google_auth_failed';
      }, 1500);
    }
  }, []);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #2c5f2d 0%, #4a8c52 100%)',
      color: 'white',
      fontSize: '1.2rem'
    }}>
      {status}
    </div>
  );
}

export default App;
