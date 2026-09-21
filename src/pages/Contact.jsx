import { useState, useEffect } from 'react'
import { Mail, Phone, MapPin, Clock, Send, CheckCircle } from 'lucide-react'

export default function Contact() {
  const [form, setForm]   = useState({ name: '', email: '', subject: '', message: '' })
  const [sent, setSent]   = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { document.title = 'Contact Us — HRK Jewellery'; return () => { document.title = 'HRK Jewellery' } }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Please fill in all required fields.'); return
    }
    // In production: send to your email API (Resend / SendGrid)
    setSent(true)
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white'

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
              { icon: Mail,    label: 'Email',    value: 'hello@hrkjewellery.com' },
              { icon: Phone,   label: 'Phone',    value: '+91 98765 43210' },
              { icon: MapPin,  label: 'Address',  value: 'Mumbai, Maharashtra, India' },
              { icon: Clock,   label: 'Hours',    value: 'Mon–Sat, 10am–6pm IST' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{label}</p>
                  <p className="text-gray-700 text-sm mt-0.5">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <p className="text-sm font-semibold text-amber-800 mb-1">Quick responses for order issues</p>
            <p className="text-xs text-amber-700">
              For order-related queries, please have your order number ready. We resolve most issues within 1 business day.
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Name *</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your name" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email *</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="your@email.com" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Subject</label>
                <input value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="How can we help?" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Message *</label>
                <textarea rows={5} value={form.message} onChange={e => set('message', e.target.value)}
                  placeholder="Tell us more…" className={`${inputCls} resize-none`} />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" className="btn-gold flex items-center gap-2 text-sm">
                <Send size={15} /> Send Message
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
