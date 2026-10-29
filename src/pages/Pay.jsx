import { useEffect, useState, useCallback } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { CheckCircle, Copy, Smartphone, Clock, AlertTriangle, Download, Loader2, ShieldCheck, Truck, QrCode } from 'lucide-react'
import { checkUtr } from '../utils/utr'
import { upiLink, UPI_APPS, isPhone, isIOS, orderNote, rememberPhone, recallPhone, needsPayment } from '../utils/upi'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const rupees = n => `₹${Number(n || 0).toLocaleString('en-IN')}`
const fmtDate = d => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

function CopyButton({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text) } catch { /* older browsers */ }
    setDone(true); setTimeout(() => setDone(false), 1500)
  }
  return (
    <button type="button" onClick={copy} className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:underline shrink-0">
      {done ? <CheckCircle size={13} /> : <Copy size={13} />} {done ? 'Copied' : label}
    </button>
  )
}

// ── Step 1: pay ──────────────────────────────────────────────────────────────
function PayBox({ order }) {
  const phone = isPhone()
  const pay = { upiId: order.payTo.upiId, payeeName: order.payTo.payeeName, amount: order.totalAmount, note: orderNote(order.orderId) }
  const link = upiLink(pay)
  const [qr, setQr] = useState('')
  const [showQr, setShowQr] = useState(!phone)

  useEffect(() => {
    QRCode.toDataURL(link, { width: 560, margin: 1, errorCorrectionLevel: 'M' }).then(setQr).catch(() => setQr(''))
  }, [link])

  const qrBlock = (
    <div className="flex flex-col items-center">
      <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
        {qr
          ? <img src={qr} alt={`UPI QR code to pay ${rupees(order.totalAmount)} to ${pay.payeeName}`} width="240" height="240" className="w-56 h-56 sm:w-60 sm:h-60" />
          : <div className="w-56 h-56 sm:w-60 sm:h-60 flex items-center justify-center"><Loader2 className="animate-spin text-gray-300" /></div>}
      </div>
      <p className="text-sm text-gray-600 mt-3 text-center">Scan with <strong>GPay, PhonePe, Paytm, BHIM</strong> or any UPI app</p>
      <p className="text-xs text-gray-400 mt-0.5 text-center">The amount {rupees(order.totalAmount)} fills in by itself</p>
      {qr && (
        <a href={qr} download={`HRK-Order-${order.orderId}-QR.png`} className="mt-2 inline-flex items-center gap-1 text-xs text-amber-700 hover:underline">
          <Download size={13} /> Save QR image
        </a>
      )}
    </div>
  )

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-7 h-7 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">1</span>
        <h2 className="font-semibold text-gray-900">Pay {rupees(order.totalAmount)} by UPI</h2>
      </div>

      {phone && (
        <div className="space-y-2.5 mb-4">
          <a href={link} className="btn-gold w-full py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
            <Smartphone size={17} /> Pay {rupees(order.totalAmount)} with UPI app
          </a>
          <div className="grid grid-cols-3 gap-2">
            {UPI_APPS.map(app => (
              <a key={app.name} href={app.link(pay)}
                className="border border-gray-200 rounded-xl py-2.5 text-xs font-medium text-gray-700 text-center hover:border-amber-400 hover:bg-amber-50">
                {app.name}
              </a>
            ))}
          </div>
          {isIOS() && <p className="text-xs text-gray-400 text-center">On iPhone, tap the app you have installed.</p>}
          <button type="button" onClick={() => setShowQr(s => !s)}
            className="w-full inline-flex items-center justify-center gap-1.5 text-sm text-gray-600 py-2 hover:text-gray-900">
            <QrCode size={15} /> {showQr ? 'Hide QR code' : 'Paying from another phone? Show QR code'}
          </button>
        </div>
      )}

      {showQr && qrBlock}

      <div className="mt-5 bg-gray-50 rounded-xl px-4 py-3 text-sm space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-gray-500 shrink-0">UPI ID</span>
          <span className="font-mono text-gray-900 truncate">{pay.upiId}</span>
          <CopyButton text={pay.upiId} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-gray-500">Name</span>
          <span className="text-gray-900 flex-1 text-right truncate">{pay.payeeName}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-gray-500">Amount</span>
          <span className="font-semibold text-gray-900 flex-1 text-right">{rupees(order.totalAmount)}</span>
          <CopyButton text={String(order.totalAmount)} />
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-2">Please pay the exact amount, so we can match your payment quickly.</p>
    </div>
  )
}

// ── Step 2: send the transaction number ──────────────────────────────────────
function RefForm({ order, phone, onDone, onCancelEdit }) {
  const [utr, setUtr] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async e => {
    e.preventDefault(); setError('')
    const checked = checkUtr(utr)
    if (checked.error) return setError(checked.error)
    setSending(true)
    try {
      const res = await fetch(`${API}/orders/upi-ref`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.orderId, phone, utr: checked.utr }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Could not send. Please try again.')
      onDone(data)
    } catch (err) { setError(err.message) }
    finally { setSending(false) }
  }

  return (
    <form onSubmit={submit} className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-7 h-7 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">2</span>
        <h2 className="font-semibold text-gray-900">After paying, enter the transaction number</h2>
      </div>
      <p className="text-sm text-gray-500 mb-3">
        Open the payment in your UPI app (History → this payment) and copy the <strong>12-digit number</strong>. It is the same number your bank and ours show.
      </p>
      <ul className="text-xs text-gray-600 bg-gray-50 rounded-xl px-4 py-3 mb-4 space-y-1">
        <li><strong>Google Pay:</strong> "UPI transaction ID" (not the Google transaction ID)</li>
        <li><strong>PhonePe:</strong> "UTR" (not the Transaction ID starting with T)</li>
        <li><strong>Paytm:</strong> "UPI Ref No."</li>
        <li><strong>BHIM / bank apps:</strong> "UPI Ref No." or "RRN"</li>
      </ul>
      <label htmlFor="utr" className="block text-xs uppercase tracking-wider text-gray-500 mb-1.5">UPI transaction number</label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input id="utr" inputMode="numeric" autoComplete="off" value={utr} placeholder="12 digits, e.g. 412345678901" maxLength={40}
          onChange={e => { setUtr(e.target.value); setError('') }}
          className="flex-1 min-w-0 border border-gray-200 rounded-xl px-4 py-3 text-base font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-400" />
        <button type="submit" disabled={sending} className="btn-gold px-6 py-3 rounded-xl text-sm font-bold disabled:opacity-60 inline-flex items-center justify-center gap-2">
          {sending && <Loader2 size={15} className="animate-spin" />} I have paid
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-600 mt-2">{error}</p>}
      {onCancelEdit && <button type="button" onClick={onCancelEdit} className="text-xs text-gray-500 hover:underline mt-3">Keep the number I sent before</button>}
    </form>
  )
}

export default function Pay() {
  const [params] = useSearchParams()
  const location = useLocation()
  const orderId = (params.get('id') || '').toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 24)
  const justPlaced = !!location.state?.justPlaced

  const [phone, setPhone]     = useState(location.state?.phone || recallPhone(orderId))
  const [phoneInput, setPhoneInput] = useState('')
  const [order, setOrder]     = useState(null)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => { document.title = 'Complete Payment — HRK Jewellery'; return () => { document.title = 'HRK Jewellery' } }, [])

  const load = useCallback(async ph => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/orders/track`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, phone: ph }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Could not load the order')
      setOrder(data); setPhone(ph); rememberPhone(orderId, ph)
    } catch (err) { setError(err.message); setOrder(null) }
    finally { setLoading(false) }
  }, [orderId])

  useEffect(() => { if (orderId && phone) load(phone) }, [orderId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!orderId) {
    return (
      <main className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-600 mb-4">Open this page from your order, or track it with your Order ID.</p>
        <Link to="/track-order" className="btn-gold">Track Order</Link>
      </main>
    )
  }

  const header = (
    <div className="text-center mb-6">
      {justPlaced && (!order || needsPayment(order)) && <p className="text-sm font-medium text-green-700 mb-1 inline-flex items-center gap-1.5"><CheckCircle size={16} /> Order placed</p>}
      <h1 className="font-serif text-[1.9rem] sm:text-4xl text-gray-900 font-light">
        {order && !needsPayment(order) ? 'Your Order' : 'Complete Your Payment'}
      </h1>
      <p className="text-sm text-gray-500 mt-1">
        Order ID <span className="font-mono font-semibold text-gray-800">#{orderId.slice(-8)}</span>
        {' · '}save it to track your order
      </p>
    </div>
  )

  // No phone number yet (page opened from another device or a new tab)
  if (!order) {
    return (
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        {header}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-amber-500" size={28} /></div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); if (/^[6-9][0-9]{9}$/.test(phoneInput)) load(phoneInput); else setError('Enter the 10-digit mobile number used for the order') }}
            className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6">
            <label htmlFor="pay-phone" className="block text-sm text-gray-700 mb-2">Enter the mobile number you ordered with</label>
            <div className="flex gap-2">
              <input id="pay-phone" type="tel" inputMode="numeric" value={phoneInput} placeholder="10-digit mobile number"
                onChange={e => setPhoneInput(e.target.value.replace(/\D/g, '').slice(-10))}
                className="flex-1 min-w-0 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              <button type="submit" className="btn-gold px-5 rounded-xl">Continue</button>
            </div>
            {error && <p role="alert" className="text-sm text-red-600 mt-2">{error}</p>}
          </form>
        )}
      </main>
    )
  }

  const awaiting  = needsPayment(order)
  const submitted = order.paymentMethod === 'upi' && order.paymentStatus === 'submitted' && order.status === 'pending'
  const paid      = order.paymentStatus === 'paid'
  const trackLink = `/track-order?id=${order.orderId}`

  return (
    <main className="max-w-xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-4">
      {header}

      {order.status === 'cancelled' && (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-sm">
          This order was cancelled{order.paymentStatus === 'paid' ? '' : ' because it was not paid in time'}. If you have already paid, please <Link to="/contact" className="underline">contact us</Link> with your Order ID and UPI transaction number.
        </div>
      )}

      {awaiting && order.payTo && (
        <>
          {order.paymentStatus === 'failed' && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm flex gap-2">
              <AlertTriangle size={17} className="shrink-0 mt-0.5" />
              <span>We couldn't find a payment with transaction number <span className="font-mono">{order.upiRef}</span>. Please check the number and send it again, or pay below if you haven't yet.</span>
            </div>
          )}
          <PayBox order={order} />
          <RefForm order={order} phone={phone} onDone={setOrder} />
          {order.payBy && (
            <p className="text-xs text-gray-500 flex items-center justify-center gap-1.5 text-center">
              <Clock size={13} /> Please pay by {fmtDate(order.payBy)}. Unpaid orders are cancelled after that.
            </p>
          )}
        </>
      )}

      {awaiting && !order.payTo && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-800">
          Online payment is being set up. Please <Link to="/contact" className="underline">contact us</Link> to pay for this order.
        </div>
      )}

      {submitted && !editing && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={34} className="text-green-500" />
          </div>
          <h2 className="font-semibold text-gray-900 text-lg">Thank you! We're checking your payment</h2>
          <p className="text-sm text-gray-500 mt-1">
            Transaction number <span className="font-mono text-gray-800">{order.upiRef}</span> · {rupees(order.totalAmount)}
          </p>
          <p className="text-sm text-gray-600 mt-3">We'll confirm your order as soon as the payment shows in our account, usually within a few hours. Then we pack and ship your jewellery.</p>
          <button type="button" onClick={() => setEditing(true)} className="text-xs text-gray-500 hover:underline mt-3">Typed the wrong number? Change it</button>
        </div>
      )}
      {submitted && editing && (
        <RefForm order={order} phone={phone} onDone={o => { setOrder(o); setEditing(false) }} onCancelEdit={() => setEditing(false)} />
      )}

      {paid && order.status !== 'cancelled' && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck size={34} className="text-green-500" />
          </div>
          <h2 className="font-semibold text-gray-900 text-lg">Payment received</h2>
          <p className="text-sm text-gray-600 mt-1">Thank you! {rupees(order.totalAmount)} has been received for this order.</p>
        </div>
      )}

      {/* Order summary */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6 text-sm">
        <h2 className="font-medium text-gray-900 mb-2">Order summary</h2>
        <ul className="divide-y divide-gray-50">
          {order.items.map((it, i) => (
            <li key={i} className="flex justify-between gap-3 py-2">
              <span className="text-gray-700 min-w-0 truncate">{it.name} <span className="text-gray-400">× {it.quantity}</span></span>
              <span className="text-gray-900 shrink-0">{rupees(it.price * it.quantity)}</span>
            </li>
          ))}
        </ul>
        {order.discount > 0 && <div className="flex justify-between text-green-700 pt-2"><span>Coupon {order.couponCode}</span><span>−{rupees(order.discount)}</span></div>}
        {order.shippingFee > 0 && <div className="flex justify-between text-gray-600 pt-1"><span>Shipping</span><span>{rupees(order.shippingFee)}</span></div>}
        <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-100 mt-2 pt-2"><span>Total</span><span>{rupees(order.totalAmount)}</span></div>
        <p className="text-gray-500 mt-3">Delivering to {order.deliverTo.name}, {order.deliverTo.city} {order.deliverTo.pincode}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link to={trackLink} className="flex-1 border border-gold-500 text-gold-600 hover:bg-gold-500 hover:text-white transition-colors py-3.5 text-sm font-semibold text-center inline-flex items-center justify-center gap-2">
          <Truck size={16} /> Track Order
        </Link>
        <Link to="/collections" className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors py-3.5 text-sm font-medium text-center">
          Continue Shopping
        </Link>
      </div>
    </main>
  )
}
