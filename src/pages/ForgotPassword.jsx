import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react'

import useShop from '../hooks/useShop'
import { whatsappLink } from '../config/shop'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function ForgotPassword() {
  const SHOP = useShop()
  const [email,     setEmail]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [sent,      setSent]      = useState(false)
  const [error,     setError]     = useState('')
  const [devLink,   setDevLink]   = useState('')

  useEffect(() => { document.title = 'Forgot Password — HRK Jewellery'; return () => { document.title = 'HRK Jewellery' } }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Please enter your email address'); return }

    setLoading(true)
    try {
      const res  = await fetch(`${API}/auth/forgot-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Request failed')
      setSent(true)
      if (data._devResetUrl) setDevLink(data._devResetUrl)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-gray-800 mb-2">Forgot Password</h1>
          <p className="text-gray-500 text-sm">Enter your email and we'll send you a reset link.</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-green-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Check your inbox</h2>
              <p className="text-sm text-gray-500 mb-6">
                If <strong>{email}</strong> is registered, a password reset link has been sent. Check your spam folder if you don't see it.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                No email after 5 minutes?{' '}
                <a href={whatsappLink(`Hi ${SHOP.name}, I can't reset my password. My account email is ${email}`, SHOP)} target="_blank" rel="noopener noreferrer"
                  className="text-green-700 font-medium hover:underline">Message us on WhatsApp</a>{' '}
                and we'll send you a reset link.
              </p>

              {/* Dev-mode helper — remove in production */}
              {devLink && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Dev Mode — Reset Link</p>
                  <a href={devLink} className="text-xs text-amber-600 break-all hover:underline">{devLink}</a>
                </div>
              )}

              <Link to="/login" className="btn-gold inline-flex items-center gap-2 text-xs">
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    placeholder="your@email.com"
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl mb-4">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full btn-gold py-3 text-sm font-semibold disabled:opacity-60">
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>

              <p className="text-center text-sm text-gray-500 mt-5">
                Remember your password?{' '}
                <Link to="/login" className="text-amber-600 font-medium hover:underline">Sign in</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
