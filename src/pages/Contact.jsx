import { useState, useEffect } from 'react'
import { Mail, Phone, MapPin, Clock, Send, CheckCircle, Loader2 } from 'lucide-react'

import useShop from '../hooks/useShop'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Contact() {
  const SHOP = useShop()
  const [form, setForm]   = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [sent, setSent]   = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError('') }

  useEffect(() => { document.title = 'Contact Us — HRK Jewellery'; return () => { document.title = 'HRK Jewellery' } }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.name.trim().length < 2) return setError('Please enter your name.')
    if (!form.email.trim() && !form.phone.trim()) return setError('Please give an email or mobile number so we can reply.')
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) return setError('Please enter a valid email address.')
    if (form.phone.trim() && !/^[6-9][0-9]{9}$/.test(form.phone)) return setError('Please enter a valid 10-digit mobile number.')
    if (form.message.trim().length < 10) return setError('Your message must be at least 10 characters.')
    setSending(true)
    try {
      const res = await fetch(`${API}/contact`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Could not send your message. Please call or email us.')
      setSent(true)
    } catch (err) {
      setError(err.message || 'Could not send your message. Please call or email us.')
    } finally {
      setSending(false)
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white'
  const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5'

  return (
    <main>
      <section className="bg-gray-900 text-white py-16 px-4 text-center">
        <h1 className="font-serif text-4xl font-light mb-3">Get in Touch</h1>
        <p className="text-gray-400 text-sm">We'd love to hear from you. Our team replies within 24 hours.</p>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-12">
        {/* Info */}
        <div>
          <h2 className="font-serif text-2xl text-gray-800 mb-6">Contact Information</h2>
          <div className="space-y-5">
            {[
              { icon: Mail,    label: 'Email',    value: SHOP.email,   href: `mailto:${SHOP.email}` },
              { icon: Phone,   label: 'Phone',    value: SHOP.phone,   href: `tel:${SHOP.phone.replace(/\s/g, '')}` },
              { icon: MapPin,  label: 'Address',  value: SHOP.address },
              { icon: Clock,   label: 'Hours',    value: `${SHOP.supportDays}, ${SHOP.supportTime}` },
            ].map(({ icon: Icon, label, value, href }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{label}</p>
                  {href
                    ? <a href={href} className="text-gray-700 text-sm mt-0.5 inline-block hover:text-amber-700 underline-offset-2 hover:underline">{value}</a>
                    : <p className="text-gray-700 text-sm mt-0.5">{value}</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <p className="text-sm font-semibold text-amber-800 mb-1">Quick responses for order issues</p>
            <p className="text-xs text-amber-700">
              For order-related queries, please include your Order ID (and UPI transaction number if you have paid). We resolve most issues within 1 business day.
            </p>
          </div>
        </div>

        {/* Form */}
        <div>
          {sent ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Message Sent!</h3>
              <p className="text-sm text-gray-500">Thank you for reaching out. We'll get back to you within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="c-name" className={labelCls}>Name *</label>
                  <input id="c-name" value={form.name} maxLength={80} autoComplete="name" onChange={e => set('name', e.target.value)} placeholder="Your name" className={inputCls} />
                </div>
                <div>
                  <label htmlFor="c-phone" className={labelCls}>Mobile number</label>
                  <input id="c-phone" type="tel" inputMode="numeric" autoComplete="tel-national" value={form.phone}
                    onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(-10))} placeholder="10-digit mobile number" className={inputCls} />
                </div>
              </div>
              <div>
                <label htmlFor="c-email" className={labelCls}>Email</label>
                <input id="c-email" type="email" autoComplete="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="your@email.com" className={inputCls} />
                <p className="text-xs text-gray-400 mt-1">Give an email or a mobile number (or both) so we can reply.</p>
              </div>
              <div>
                <label htmlFor="c-subject" className={labelCls}>Subject</label>
                <input id="c-subject" value={form.subject} maxLength={120} onChange={e => set('subject', e.target.value)} placeholder="e.g. Order 94E7178C" className={inputCls} />
              </div>
              <div>
                <label htmlFor="c-message" className={labelCls}>Message *</label>
                <textarea id="c-message" rows={5} maxLength={2000} value={form.message} onChange={e => set('message', e.target.value)}
                  placeholder="Tell us more…" className={`${inputCls} resize-none`} />
              </div>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={sending} className="btn-gold flex items-center gap-2 text-sm disabled:opacity-60">
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send Message
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
