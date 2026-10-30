import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, MessageCircle, Phone, Mail } from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import { api } from '../api'
import { whatsappLink, telLink } from '../../config/shop'

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400'

function Field({ id, label, hint, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input id={id} className={inputCls} {...props} />
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  )
}

export default function ShopSettings() {
  const [form, setForm]     = useState(null)
  const [saved, setSaved]   = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    api.getShop().then(s => { setSaved(s); setForm(s) }).catch(e => setError(e.message))
  }, [])

  // Password-reset email: send a test and show Brevo's problem in plain words
  const [mailTest, setMailTest] = useState(null)
  const [testing, setTesting] = useState(false)
  const testEmail = async () => {
    setTesting(true); setMailTest(null)
    try { setMailTest(await api.testEmail()) } catch (e) { setMailTest({ sent: false, problem: e.message }) } finally { setTesting(false) }
  }

  const set = k => e => { setForm(f => ({ ...f, [k]: e.target.value })); setNotice(''); setError('') }

  const submit = async e => {
    e.preventDefault()
    setSaving(true); setError(''); setNotice('')
    try {
      const { name, phone, whatsapp, email, address, supportDays, supportTime, instagram, facebook, youtube } = form
      const s = await api.updateShop({ name, phone, whatsapp: whatsapp === saved?.whatsapp && phone !== saved?.phone ? '' : whatsapp, email, address, supportDays, supportTime, instagram, facebook, youtube })
      setSaved(s); setForm(s)
      setNotice('Saved. The website shows the new details within a minute.')
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  return (
    <AdminLayout>
      <div className="max-w-3xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shop Settings</h1>
          <p className="text-sm text-gray-500">Your contact details on the Contact page, Help Center, chat button, footer and packing slips.</p>
        </div>

        {!form ? (
          error ? <p className="text-sm text-red-600">{error}</p> : <div className="h-40 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" /></div>
        ) : (
          <form onSubmit={submit} className="bg-white rounded-xl border border-gray-100 p-5 space-y-6">
            <section className="space-y-4">
              <h2 className="font-semibold text-gray-900">Contact</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field id="s-phone" label="Phone number" value={form.phone} onChange={set('phone')} inputMode="tel" placeholder="e.g. 8689814335" hint="Customers call this number." />
                <Field id="s-whatsapp" label="WhatsApp number" value={(form.whatsapp || '').replace(/^91(?=\d{10}$)/, '')} onChange={set('whatsapp')} inputMode="tel" placeholder="Same as phone" hint="Leave empty to use the phone number." />
                <Field id="s-email" label="Email" type="email" value={form.email} onChange={set('email')} />
                <Field id="s-name" label="Shop name" value={form.name} onChange={set('name')} maxLength={60} />
              </div>
              <Field id="s-address" label="Address" value={form.address} onChange={set('address')} maxLength={200} hint="Shown on the Contact page and as the sender on packing slips." />
              <div className="flex flex-wrap gap-2">
                <a href={whatsappLink('', saved)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"><MessageCircle size={13} /> Test WhatsApp</a>
                <a href={telLink(saved)} className="inline-flex items-center gap-1.5 text-xs border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"><Phone size={13} /> Test call</a>
                <span className="text-xs text-gray-400 self-center">(tests the saved number)</span>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="font-semibold text-gray-900">Support hours</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field id="s-days" label="Days" value={form.supportDays} onChange={set('supportDays')} maxLength={60} placeholder="Monday – Saturday" />
                <Field id="s-time" label="Time" value={form.supportTime} onChange={set('supportTime')} maxLength={60} placeholder="10:00 AM – 6:00 PM" />
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="font-semibold text-gray-900">Social links <span className="font-normal text-gray-400 text-sm">(optional; empty = icon hidden)</span></h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <Field id="s-ig" label="Instagram" value={form.instagram} onChange={set('instagram')} placeholder="https://www.instagram.com/…" />
                <Field id="s-fb" label="Facebook" value={form.facebook} onChange={set('facebook')} placeholder="https://www.facebook.com/…" />
                <Field id="s-yt" label="YouTube" value={form.youtube} onChange={set('youtube')} placeholder="https://www.youtube.com/@…" />
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-semibold text-gray-900">Password-reset emails</h2>
              <p className="text-sm text-gray-500">Sent from your Gmail (set GMAIL_SCRIPT_URL and EMAIL_SECRET on Render), or through Brevo. Check it works:</p>
              <button type="button" onClick={testEmail} disabled={testing}
                className="inline-flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 disabled:opacity-50">
                <Mail size={15} /> {testing ? 'Sending…' : 'Send test email to me'}
              </button>
              {mailTest?.sent && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">Sent to {mailTest.to}. Check that inbox (and spam). If it arrived, customers' reset emails work.</p>}
              {mailTest && !mailTest.sent && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"><strong>Not sent.</strong> {mailTest.problem}</p>}
            </section>

            {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg"><AlertTriangle size={15} /> {error}</div>}
            {notice && <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-lg"><CheckCircle size={15} /> {notice}</div>}

            <button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </form>
        )}
      </div>
    </AdminLayout>
  )
}
