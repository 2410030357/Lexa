import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function LoginPage() {
  const { login } = useAuth()
  const [mode, setMode]         = useState('login')
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error('Please fill in all fields')
      return
    }
    if (mode === 'signup' && !name.trim()) {
      toast.error('Please enter your name')
      return
    }
    setLoading(true)
    try {
      const endpoint = mode === 'signup' ? '/auth/signup' : '/auth/login'
      const payload  = mode === 'signup'
        ? { name, email, password }
        : { email, password }

      const res = await axios.post(`${API}${endpoint}`, payload)
      login(res.data.token, res.data.user)
      toast.success(mode === 'signup'
        ? `Welcome to Lexa, ${res.data.user.name}!`
        : `Welcome back, ${res.data.user.name}!`)
    } catch(err) {
      toast.error(err.response?.data?.error || 'Something went wrong')
    } finally { setLoading(false) }
  }

  const handleGoogle = async (credentialResponse) => {
    try {
      const res = await axios.post(`${API}/auth/google`, {
        credential: credentialResponse.credential
      })
      login(res.data.token, res.data.user)
      toast.success(`Welcome, ${res.data.user.name}!`)
    } catch(err) {
      toast.error(err.response?.data?.error || 'Google login failed')
    }
  }

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(20,184,166,0.4)',
    borderRadius: 10,
    padding: '12px 16px',
    color: '#FFFFFF',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border 0.2s'
  }

  const labelStyle = {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: 500,
    display: 'block',
    marginBottom: 6
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #041A1A 0%, #0B0015 60%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
      padding: 16
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(20,184,166,0.35)',
        borderRadius: 24,
        padding: '44px 40px',
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)'
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56,
            height: 56,
            background: 'linear-gradient(135deg,#14B8A6,#7C3AED)',
            borderRadius: 14,
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            fontWeight: 800,
            color: '#FFFFFF'
          }}>
            L
          </div>
          <div style={{ color: '#FFFFFF', fontSize: 24, fontWeight: 800 }}>
            LEXA
          </div>
          <div style={{
            color: '#6EE7B7',
            fontSize: 12,
            marginTop: 4,
            letterSpacing: '0.08em'
          }}>
            SEMANTIC INTELLIGENCE ENGINE
          </div>
        </div>

        {/* Tab */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 10,
          padding: 4,
          marginBottom: 28
        }}>
          {['login','signup'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: '9px 0',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'inherit',
                transition: 'all 0.2s',
                background: mode === m
                  ? 'linear-gradient(135deg,#14B8A6,#7C3AED)'
                  : 'transparent',
                color: mode === m ? '#FFFFFF' : '#6EE7B7'
              }}
            >
              {m === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {mode === 'signup' && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Full Name</label>
            <input
              style={inputStyle}
              placeholder="Your full name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Email</label>
          <input
            style={inputStyle}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              style={{ ...inputStyle, paddingRight: 48 }}
              type={showPass ? 'text' : 'password'}
              placeholder={mode === 'signup' ? 'Min 6 characters' : 'Your password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            <button
              onClick={() => setShowPass(s => !s)}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#14B8A6',
                cursor: 'pointer',
                fontSize: 16
              }}
            >
              {showPass ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%',
            padding: '13px',
            background: loading
              ? 'rgba(20,184,166,0.4)'
              : 'linear-gradient(135deg,#14B8A6,#7C3AED)',
            border: 'none',
            borderRadius: 10,
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            marginBottom: 20,
            transition: 'all 0.2s'
          }}
        >
          {loading
            ? 'Please wait...'
            : mode === 'login' ? 'Log In' : 'Create Account'}
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20
        }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ color: '#6B7280', fontSize: 12 }}>
            or continue with
          </span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={handleGoogle}
            onError={() => toast.error('Google login failed')}
            theme="filled_black"
            size="large"
            shape="rectangular"
            text={mode === 'signup' ? 'signup_with' : 'signin_with'}
            width="340"
          />
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: 24,
          color: '#6B7280',
          fontSize: 13
        }}>
          {mode === 'login'
            ? <>Don't have an account?{' '}
                <button
                  onClick={() => setMode('signup')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#14B8A6',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600
                  }}>
                  Sign Up
                </button>
              </>
            : <>Already have an account?{' '}
                <button
                  onClick={() => setMode('login')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#14B8A6',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600
                  }}>
                  Log In
                </button>
              </>
          }
        </div>
      </div>
    </div>
  )
}