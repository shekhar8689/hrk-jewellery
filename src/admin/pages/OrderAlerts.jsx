import { useEffect, useState } from 'react'
import { Bell, CheckCircle, AlertTriangle, Mail } from 'lucide-react'
import { api } from '../api'

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400'

// Admin → Shop Settings: where "new order" and "payment to check" emails go.
// The address stays private (it is never shown on the website).
export default function OrderAlerts() {
  const [saved, setSaved] = useState(null)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)        // { ok, text }

  useEffect(() => {
    api.getAlerts().then(r => { setSaved(r.alertEmail); setValue(r.alertEmail) }).catch(e => setMsg({ ok: false, text: e.message }))
  }, [])

  const save = async () => {
    setBusy(true); setMsg(null)
    try {
      const r = await api.updateAlerts({ alertEmail: value.trim() })
      setSaved(r.alertEmail); setValue(r.alertEmail)
      setMsg({ ok: true, text: r.alertEmail ? `Saved. Order alerts go to ${r.alertEmail}.` : 'Saved. Order alerts are off.' })
    } catch (e) { setMsg({ ok: false, text: e.message }) } finally { setBusy(false) }
  }
  const test = async () => {
    setBusy(true); setMsg(null)
    try {
      const r = await api.testAlert()
      setMsg(r.sent ? { ok: true, text: `Test alert sent to ${r.to}. Check that inbox (and spam the first time).` } : { ok: false, text: r.problem })
    } catch (e) { setMsg({ ok: false, text: e.message }) } finally { setBusy(false) }
  }

  if (saved === null && !msg) return null
  return (
    <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
      <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Bell size={16} /> Order alerts</h2>
      <p className="text-sm text-gray-500">
        Get an email for every <strong>new order</strong> and when a customer sends their <strong>UPI transaction number</strong> (payment to check).
        {saved ? <> Alerts go to <strong>{saved}</strong>.</> : <> Alerts are off. Add an email to turn them on.</>}
      </p>
      <div>
        <label htmlFor="alert-email" className="block text-sm font-medium text-gray-700 mb-1">Email for order alerts</label>
        <input id="alert-email" type="email" value={value} onChange={e => { setValue(e.target.value); setMsg(null) }}
          placeholder="e.g. hello.hrkjewellery@gmail.com" autoComplete="email" className={inputCls} />
        <p className="text-xs text-gray-500 mt-1">Only you see this. Leave it empty to turn alerts off.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={save} disabled={busy}
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">Save alert email</button>
        <button type="button" onClick={test} disabled={busy || !saved}
          className="inline-flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 disabled:opacity-50"><Mail size={15} /> Send test alert</button>
      </div>
      {msg && (msg.ok
        ? <p className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2"><CheckCircle size={15} /> {msg.text}</p>
        : <p role="alert" className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"><AlertTriangle size={15} /> {msg.text}</p>)}
    </section>
  )
}
