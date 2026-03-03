import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider, useAuth } from './context/AuthContext'
import Dashboard from './components/Dashboard'
import LoginPage from './components/LoginPage'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

function ProtectedRoute({ children }) {
  const { isLoggedIn, loading } = useAuth()
  if (loading) return (
    <div style={{
      minHeight: '100vh', background: '#050010',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#A855F7', fontSize: 18, fontFamily: "'DM Sans', sans-serif"
    }}>Loading...</div>
  )
  return isLoggedIn ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { isLoggedIn, loading } = useAuth()
  if (loading) return null
  return isLoggedIn ? <Navigate to="/search" replace /> : children
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1A003A', color: '#F0E6FF',
                border: '1px solid rgba(124,58,237,0.35)',
                fontFamily: "'DM Sans', sans-serif", fontSize: '14px',
              },
              success: { iconTheme: { primary: '#00ED64', secondary: '#050010' } },
              error:   { iconTheme: { primary: '#EF4444', secondary: '#050010' } },
            }}
          />
          <Routes>
            <Route path="/login" element={
              <PublicRoute><LoginPage /></PublicRoute>
            } />
            <Route path="/search"    element={<ProtectedRoute><Dashboard tab="search" /></ProtectedRoute>} />
            <Route path="/ai-chat"   element={<ProtectedRoute><Dashboard tab="chat" /></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute><Dashboard tab="documents" /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Dashboard tab="analytics" /></ProtectedRoute>} />
            <Route path="/" element={<Navigate to="/search" replace />} />
            <Route path="*" element={<Navigate to="/search" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}