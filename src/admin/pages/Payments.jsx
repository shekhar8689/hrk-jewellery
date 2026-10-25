import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, Info } from 'lucide-react'
import QRCode from 'qrcode'
import AdminLayout from '../components/AdminLayout'
import { api } from '../api'
import { upiLink } from '../../utils/upi'

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400'
const UPI_ID_RE = /^[a-z0-9][a-z0-9.\-_]{1,99}@[a-z][a-z0-9]{1,63}$/

export default function Payments() {
  const [form, setForm]     = useState(null)
  const [saved, setSaved]   = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [notice, setNotice] = useState('')
  const [qr, setQr]         = useState('')

  useEffect(() => {
    api.getPaymentSettings()
      .then(s => { setSaved(s); setForm({ upiId: s.upiId, payeeName: s.payeeName }) })
      .catch(err => setError(err.message))
  }, [])

  const upiId = (form?.upiId || '').trim().toLowerCase()
  const valid = UPI_ID_RE.test(upiId)

  // Test QR for ₹1 so the admin can check the UPI ID before customers use it
  useEffect(() => {
    if (!valid) { setQr(''); return }
    QRCode.toDataURL(upiLink({ upiId, payeeName: form.payeeName, amount: 1, note: 'HRK test payment' }), { width: 360, margin: 1 })
      .then(setQr).catch(() => setQr(''))
  }, [valid, upiId, form?.payeeName])

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setNotice(''); setError('') }

  const submit = async e => {
    e.preventDefault()
    setSaving(true); setError(''); setNotice('')
    try {
      const s = await api.updatePaymentSettings({ upiId, payeeName: form.payeeName })
      setSaved(s); setForm({ upiId: s.upiId, payeeName: s.payeeName })
      setNotice('Saved. Customers now pay to this UPI ID.')
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  return (
    <AdminLayout>
      <div className="max-w-3xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments (UPI)</h1>
          <p className="text-sm text-gray-500">Customers pay to this UPI ID by scanning a QR code or tapping their UPI app. The amount and Order ID fill in by themselves.</p>
        </div>

        {saved && !saved.ready && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span><strong>Customers can't order yet.</strong> Add your UPI ID below to switch on online payment.</span>
          </div>
        )}

        {!form ? (
          error ? <p className="text-sm text-red-600">{error}</p> : <div className="h-40 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" /></div>
        ) : (
          <form onSubmit={submit} className="bg-white rounded-xl border border-gray-100 p-5 grid md:grid-cols-[1fr_auto] gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
                <input value={form.upiId} onChange={e => set('upiId', e.target.value.replace(/\s/g, ''))} placeholder="e.g. hrkjewellery@okaxis" autoComplete="off" spellCheck={false} className={`${inputCls} font-mono`} />
                {form.upiId && !valid && <p className="text-xs text-red-600 mt-1">That doesn't look like a UPI ID. It looks like name@bank, e.g. hrkjewellery@ybl</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name shown to customers</label>
                <input value={form.payeeName} maxLength={50} onChange={e => set('payeeName', e.target.value)} placeholder="HRK Jewellery" className={inputCls} />
                <p className="text-xs text-gray-500 mt-1">Use the same name as the bank account, so customers trust the payment screen.</p>
              </div>

              {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg"><AlertTriangle size={15} /> {error}</div>}
              {notice && <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-lg"><CheckCircle size={15} /> {notice}</div>}

              <button type="submit" disabled={saving || !valid} className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50">
                {saving ? 'Saving…' : 'Save UPI ID'}
              </button>
            </div>

            <div className="flex flex-col items-center md:w-52">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Test it: pay ₹1</p>
              <div className="w-44 h-44 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
                {qr ? <img src={qr} alt="Test UPI QR code for ₹1" className="w-full h-full" /> : <span className="text-xs text-gray-400 px-4 text-center">Enter a UPI ID to see the QR</span>}
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">Scan with your own phone. It should show your name and ₹1.</p>
            </div>
          </form>
        )}

        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-900 space-y-2">
          <p className="font-semibold flex items-center gap-1.5"><Info size={15} /> How orders are paid</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>The customer places the order and sees a QR code for the exact amount (on a phone: a "Pay with UPI app" button).</li>
            <li>After paying, they type the 12-digit UPI transaction number. The order shows <strong>Payment to check</strong> in Orders.</li>
            <li>Open your bank or UPI app and find that number and amount. Then click <strong>Payment received</strong> on the order, and confirm and ship it.</li>
            <li>If the money isn't there, click <strong>Not received</strong>. The customer is asked to check and send the number again.</li>
          </ol>
          <p>Orders nobody pays for are cancelled after 24 hours and their stock goes back.</p>
          <p><strong>Tip:</strong> use a free business UPI ID (PhonePe Business, Paytm for Business or Google Pay for Business). Personal UPI IDs have daily limits, and some apps block payments to them from website buttons.</p>
        </div>
      </div>
    </AdminLayout>
  )
}
