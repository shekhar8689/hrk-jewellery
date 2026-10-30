import { useState } from 'react'
import { KeyRound, Copy, CheckCircle, MessageCircle, X } from 'lucide-react'
import { api } from '../api'

/*
 * For a customer who can't reset their password by email: makes a one-hour
 * reset link to copy or send on WhatsApp.
 */
export default function ResetLinkButton({ user }) {
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const make = async () => {
    setBusy(true); setError('')
    try { setResult(await api.userResetLink(user._id)) } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const copy = async () => { try { await navigator.clipboard.writeText(result.link) } catch { /* ignore */ } setCopied(true); setTimeout(() => setCopied(false), 1500) }

  const digits = (result?.phone || '').replace(/\D/g, '').slice(-10)
  const text = `Hi ${user.name || ''}, here is your HRK Jewellery password reset link (works for 1 hour): ${result?.link || ''}`
  const wa = `https://wa.me/${digits ? '91' + digits : ''}?text=${encodeURIComponent(text)}`

  return (
    <span className="inline-block text-left">
      <button type="button" onClick={make} disabled={busy}
        className="text-xs text-gray-700 font-medium border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg inline-flex items-center gap-1 disabled:opacity-50">
        <KeyRound size={12} /> {busy ? 'Making…' : 'Reset link'}
      </button>
      {error && <span role="alert" className="block text-xs text-red-600 mt-1">{error}</span>}
      {result && (
        <span className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <span className="block bg-white rounded-xl shadow-xl w-full max-w-md p-5 space-y-3">
            <span className="flex items-center justify-between">
              <span className="font-semibold text-gray-900">Password reset link for {user.name}</span>
              <button type="button" onClick={() => setResult(null)} aria-label="Close" className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </span>
            <span className="block text-sm text-gray-600">Send this to the customer. It works once, for 1 hour. They open it and choose a new password.</span>
            <input readOnly value={result.link} onFocus={e => e.target.select()} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono" />
            <span className="flex gap-2">
              <a href={wa} target="_blank" rel="noopener noreferrer" className="flex-1 inline-flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 rounded-lg">
                <MessageCircle size={15} /> Send on WhatsApp
              </a>
              <button type="button" onClick={copy} className="flex-1 inline-flex items-center justify-center gap-1.5 border border-gray-200 text-sm py-2 rounded-lg hover:bg-gray-50">
                {copied ? <CheckCircle size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy link'}
              </button>
            </span>
          </span>
        </span>
      )}
    </span>
  )
}
