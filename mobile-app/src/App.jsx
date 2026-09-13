import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { detectBackend } from './services/api'
import { getApiUrl, setApiUrl } from './services/api'
import ProtectedRoute from './components/ProtectedRoute'
import SplashProvider, { SplashScreen } from './components/SplashScreen'

import LoginPage from './components/auth/LoginPage'
import RegisterPage from './components/auth/RegisterPage'
import EmailVerificationPage from './components/auth/EmailVerificationPage'
import HomePage from './components/HomePage'
import AboutPage from './components/AboutPage'
import UserProfilePage from './components/UserProfilePage'
import ChatPage from './components/ChatPage'
import RecordPage from './components/RecordPage'
import WeatherPage from './components/WeatherPage'
import MarketPage from './components/MarketPage'

function App() {
  const [backendReady, setBackendReady] = useState(false)
  const [backendChecked, setBackendChecked] = useState(false)
  const [backendUrl, setBackendUrl] = useState(getApiUrl())

  useEffect(() => {
    detectBackend().then((result) => {
      setBackendReady(Boolean(result.ok))
      setBackendChecked(true)
      if (result.ok) setBackendUrl(result.url)
    })
  }, [])

  const retryBackend = async () => {
    setBackendChecked(false)
    const result = await detectBackend()
    setBackendReady(Boolean(result.ok))
    setBackendChecked(true)
    if (result.ok) setBackendUrl(result.url)
  }

  const useManualBackend = async (url) => {
    const normalized = url.trim().replace(/\/$/, '')
    setApiUrl(normalized)
    setBackendUrl(normalized)
    await retryBackend()
  }

  return (
    <AuthProvider>
      <SplashProvider>
        <Router>
          <SplashScreen />
          {backendReady && (
            <div className="app-shell">
              <Routes>
                <Route path="/" element={<LoginPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-email" element={<EmailVerificationPage />} />

                <Route
                  path="/home"
                  element={
                    <ProtectedRoute>
                      <HomePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/chat"
                  element={
                    <ProtectedRoute>
                      <ChatPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/record"
                  element={
                    <ProtectedRoute>
                      <RecordPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/weather"
                  element={
                    <ProtectedRoute>
                      <WeatherPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/market"
                  element={
                    <ProtectedRoute>
                      <MarketPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/help"
                  element={
                    <ProtectedRoute>
                      <AboutPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <UserProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          )}
          {!backendReady && backendChecked && (
            <BackendConnectionScreen
              url={backendUrl}
              onRetry={retryBackend}
              onUseUrl={useManualBackend}
            />
          )}
        </Router>
      </SplashProvider>
    </AuthProvider>
  )
}

function BackendConnectionScreen({ url, onRetry, onUseUrl }) {
  const [value, setValue] = useState(url)

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#f5f5f5] px-5 py-8">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-card">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl grad-green text-2xl text-white">!</div>
        <h1 className="text-xl font-extrabold text-ink">Backend connection needed</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          KilimoChat cannot reach the backend from this phone. Check that the backend is running
          on the same Wi-Fi network, or use USB reverse debugging.
        </p>
        <label className="field-label mt-5" htmlFor="backend-url">Backend URL</label>
        <input
          id="backend-url"
          className="field"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="http://192.168.0.109:8000"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
        />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" className="btn-ghost" onClick={onRetry}>Retry</button>
          <button type="button" className="btn-primary" onClick={() => onUseUrl(value)}>Test URL</button>
        </div>
        <div className="mt-5 rounded-2xl bg-[#f3f6f3] p-4 text-xs leading-relaxed text-ink-soft">
          <strong className="text-ink">Wi-Fi:</strong> start the backend with host
          <code className="mx-1 rounded bg-white px-1">0.0.0.0</code> and use your computer&apos;s
          LAN IP.
          <br />
          <strong className="text-ink">USB:</strong> run
          <code className="mx-1 rounded bg-white px-1">adb reverse tcp:8000 tcp:8000</code> and use
          <code className="mx-1 rounded bg-white px-1">http://127.0.0.1:8000</code>.
        </div>
      </div>
    </div>
  )
}

function AuthCallback() {
  const [status, setStatus] = useState('Processing...')
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    const success = urlParams.get('success')
    if (success === 'true' && token) {
      localStorage.setItem('token', token)
      setStatus('Login successful! Redirecting...')
      setTimeout(() => (window.location.href = '/'), 1500)
    } else {
      setStatus('Login failed. Redirecting to login page...')
      setTimeout(() => (window.location.href = '/login?error=google_auth_failed'), 1500)
    }
  }, [])
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f7e39 0%, #148d42 100%)',
        color: 'white',
        fontSize: '1.2rem',
      }}
    >
      {status}
    </div>
  )
}

export default App