import { useEffect, useState, useCallback } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { CheckCircle, Copy, Smartphone, Clock, AlertTriangle, Download, Loader2, ShieldCheck, Truck } from 'lucide-react'
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
  // Business (merchant) UPI ID: one-tap pay with the amount filled in.
  // Personal UPI ID: the amount is left out (apps block those links with it) and the customer types it.
  const business = order.payTo.business === true
  const pay = { upiId: order.payTo.upiId, payeeName: order.payTo.payeeName, note: orderNote(order.orderId), amount: business ? order.totalAmount : undefined }
  const amount = rupees(order.totalAmount)
  const link = upiLink(pay)
  const [qr, setQr] = useState('')

  useEffect(() => {
    QRCode.toDataURL(link, { width: 560, margin: 1, errorCorrectionLevel: 'M' }).then(setQr).catch(() => setQr(''))
  }, [link])

  // Scanning a QR works even when "open the app" links are blocked by the UPI app,
  // so on phones the QR comes first: save it, then scan it from the gallery.
  const qrImage = (
    <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
      {qr
        ? <img src={qr} alt={`UPI QR code to pay ${amount} to ${pay.payeeName}`} width="240" height="240" className="w-56 h-56 sm:w-60 sm:h-60" />
        : <div className="w-56 h-56 sm:w-60 sm:h-60 flex items-center justify-center"><Loader2 className="animate-spin text-gray-300" /></div>}
    </div>
  )
  const saveQr = qr && (
    <a href={qr} download={`HRK-Order-${order.orderId}-QR.png`}
      className="btn-gold w-full py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
      <Download size={17} /> Save QR to your phone
    </a>
  )

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-7 h-7 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">1</span>
        <h2 className="font-semibold text-gray-900">Pay {rupees(order.totalAmount)} by UPI</h2>
      </div>

      {/* The exact amount to type in the UPI app */}
      {!business && <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-amber-800">In your UPI app, type ₹{Number(order.totalAmount).toLocaleString('en-IN')} as the amount</p>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{amount}</p>
        </div>
        <CopyButton text={String(order.totalAmount)} label="Copy amount" />
      </div>}

      {business ? (
        <>
          {phone && (
            <div className="space-y-2.5 mb-5">
              <a href={link} className="btn-gold w-full py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2">
                <Smartphone size={18} aria-hidden="true" />Pay {amount}
              </a>
              <div className="grid grid-cols-3 gap-2">
                {UPI_APPS.map(app => (
                  <a key={app.name} href={app.link(pay)}
                    className="border border-gray-200 rounded-xl py-2.5 text-xs font-medium text-gray-700 text-center hover:border-amber-400 hover:bg-amber-50">
                    {app.name}
                  </a>
                ))}
              </div>
              <p className="text-xs text-gray-500 text-center">Your UPI app opens with {amount} filled in. Enter your UPI PIN, then come back and tap <strong>I have paid</strong>.</p>
            </div>
          )}
          <div className="flex flex-col items-center">
            {phone && <p className="text-xs text-gray-500 mb-2">Or scan this QR from another phone</p>}
            {qrImage}
            {!phone && <p className="text-sm text-gray-600 mt-3 text-center">Scan with <strong>GPay, PhonePe, Paytm, BHIM</strong> or any UPI app. {amount} fills in by itself.</p>}
            {qr && (
              <a href={qr} download={`HRK-Order-${order.orderId}-QR.png`} className="mt-2 inline-flex items-center gap-1 text-xs text-amber-700 hover:underline">
                <Download size={13} /> Save QR image
              </a>
            )}
          </div>
        </>
      ) : phone ? (
        <>
          <div className="flex flex-col items-center">{qrImage}</div>
          <div className="mt-4 space-y-3">
            {saveQr}
            <ol className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3 space-y-1.5 list-decimal pl-8">
              <li>Tap <strong>Save QR to your phone</strong> above{isIOS() ? ' (or press and hold the QR → Save to Photos)' : ''}, or take a screenshot.</li>
              <li>Open <strong>GPay, PhonePe, Paytm</strong> or any UPI app and tap <strong>Scan</strong>.</li>
              <li>Tap the <strong>gallery / photo</strong> icon (Upload from gallery) and pick the saved QR.</li>
              <li>Type <strong>{amount}</strong> and pay. Then come back here and tap <strong>I have paid</strong>.</li>
            </ol>
            <p className="text-xs text-gray-500 text-center pt-1">Or try opening your UPI app directly:</p>
            <a href={link} className="w-full border border-gray-300 rounded-xl py-3 text-sm font-medium text-gray-700 flex items-center justify-center gap-2 hover:border-amber-400 hover:bg-amber-50">
              <Smartphone size={16} /> Open UPI app to pay
            </a>
            <div className="grid grid-cols-3 gap-2">
              {UPI_APPS.map(app => (
                <a key={app.name} href={app.link(pay)}
                  className="border border-gray-200 rounded-xl py-2.5 text-xs font-medium text-gray-700 text-center hover:border-amber-400 hover:bg-amber-50">
                  {app.name}
                </a>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center">
          {qrImage}
          <p className="text-sm text-gray-600 mt-3 text-center">Scan with <strong>GPay, PhonePe, Paytm, BHIM</strong> or any UPI app</p>
          <p className="text-xs text-gray-500 mt-0.5 text-center">Then type {amount} as the amount</p>
          {qr && (
            <a href={qr} download={`HRK-Order-${order.orderId}-QR.png`} className="mt-2 inline-flex items-center gap-1 text-xs text-amber-700 hover:underline">
              <Download size={13} /> Save QR image
            </a>
          )}
        </div>
      )}

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
      <p className="text-xs text-gray-400 mt-1">Paying {pay.payeeName}. Your payment note says "{pay.note}".</p>
    </div>
  )
}

// ── Step 2: tell us you've paid ──────────────────────────────────────────────
// Temporary (until Razorpay): no transaction number to type. The shop finds the
// payment in its bank app by amount and the note "HRK Order XXXX".
function PaidButton({ order, phone, onDone }) {
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async e => {
    e.preventDefault(); setError(''); setSending(true)
    try {
      const res = await fetch(`${API}/orders/upi-ref`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.orderId, phone }),
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
        <h2 className="font-semibold text-gray-900">Paid? Tell us</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        When your UPI app shows the payment was successful, tap the button. We check it and confirm your order.
      </p>
      <button type="submit" disabled={sending} className="btn-gold w-full py-4 rounded-xl text-sm font-bold disabled:opacity-60 inline-flex items-center justify-center gap-2">
        {sending && <Loader2 size={15} className="animate-spin" />} I have paid {rupees(order.totalAmount)}
      </button>
      {error && <p role="alert" className="text-sm text-red-600 mt-2">{error}</p>}
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
          This order was cancelled{order.paymentStatus === 'paid' ? '' : ' because it was not paid in time'}. If you have already paid, please <Link to="/contact" className="underline">contact us</Link> with your Order ID.
        </div>
      )}

      {awaiting && order.payTo && (
        <>
          {order.paymentStatus === 'failed' && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm flex gap-2">
              <AlertTriangle size={17} className="shrink-0 mt-0.5" />
              <span>We couldn't find your payment of {rupees(order.totalAmount)} yet. If you haven't paid, please pay below. If you have, please <Link to="/contact" className="underline">contact us</Link> with your Order ID.</span>
            </div>
          )}
          <PayBox order={order} />
          <PaidButton order={order} phone={phone} onDone={setOrder} />
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

      {submitted && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={34} className="text-green-500" />
          </div>
          <h2 className="font-semibold text-gray-900 text-lg">Thank you! We're checking your payment</h2>
          <p className="text-sm text-gray-500 mt-1">
            {order.upiRef ? <>Transaction number <span className="font-mono text-gray-800">{order.upiRef}</span> · </> : null}{rupees(order.totalAmount)}
          </p>
          <p className="text-sm text-gray-600 mt-3">We'll confirm your order as soon as the payment shows in our account, usually within a few hours. Then we pack and ship your jewellery.</p>
        </div>
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
