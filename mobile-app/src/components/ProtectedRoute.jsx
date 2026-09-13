import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Sprout } from 'lucide-react'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-page">
        <div className="flex flex-col items-center gap-4">
          <span className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl grad-green text-white shadow-lifted">
            <Sprout className="h-7 w-7" />
          </span>
          <p className="text-sm font-medium text-ink-soft">Loading your space...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  return children
}

export default ProtectedRoute