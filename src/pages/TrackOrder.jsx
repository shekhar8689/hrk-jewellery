import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Package, CheckCircle, Truck, Home, XCircle, Search, ExternalLink, Copy } from 'lucide-react'
import { getImageUrl } from '../utils/image'
import { rememberPhone, needsPayment } from '../utils/upi'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const STEPS = [
  { status: 'pending',   label: 'Order placed', icon: Package },
  { status: 'confirmed', label: 'Confirmed',    icon: CheckCircle },
  { status: 'shipped',   label: 'Shipped',      icon: Truck },
  { status: 'delivered', label: 'Delivered',    icon: Home },
]

const MESSAGES = {
  pending:   'We have received your order. We confirm it once the payment is received.',
  confirmed: 'Your order is confirmed and being packed.',
  shipped:   'Your order is on its way.',
  delivered: 'Your order has been delivered. Enjoy your jewellery!',
  cancelled: 'This order was cancelled.',
}

const fmtDate = d => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
const rupees = n => `₹${Number(n || 0).toLocaleString('en-IN')}`

function Timeline({ order }) {
  const reachedAt = Object.fromEntries((order.statusHistory || []).map(h => [h.status, h.at]))
  if (order.status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3">
        <XCircle size={20} className="shrink-0" />
        <div>
          <p className="font-medium text-sm">Order cancelled</p>
          {reachedAt.cancelled && <p className="text-xs text-red-500">{fmtDate(reachedAt.cancelled)}</p>}
        </div>
      </div>
    )
  }
  const current = STEPS.findIndex(s => s.status === order.status)
  return (
    <ol className="relative grid grid-cols-4 gap-1">
      {STEPS.map((step, i) => {
        const done = i <= current
        const Icon = step.icon
        return (
          <li key={step.status} className="flex flex-col items-center text-center relative">
            {i > 0 && (
              <span className={`absolute top-4 right-1/2 w-full h-0.5 -z-0 ${i <= current ? 'bg-gold-500' : 'bg-gray-200'}`} aria-hidden="true" />
            )}
            <span className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${
              done ? 'bg-gold-500 text-white' : 'bg-gray-100 text-gray-400'} ${i === current ? 'ring-4 ring-gold-500/20' : ''}`}>
              <Icon size={15} />
            </span>
            <span className={`mt-2 text-[11px] sm:text-xs font-medium ${done ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</span>
            {reachedAt[step.status] && <span className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5">{fmtDate(reachedAt[step.status])}</span>}
          </li>
        )
      })}
    </ol>
  )
}

export default function TrackOrder() {
  const [params] = useSearchParams()
  const [orderId, setOrderId] = useState((params.get('id') || '').toUpperCase())
  const [phone, setPhone]     = useState('')
  const [order, setOrder]     = useState(null)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied]   = useState(false)

  useEffect(() => {
    document.title = 'Track Your Order — HRK Jewellery'
    return () => { document.title = 'HRK Jewellery' }
  }, [])

  const submit = async e => {
    e.preventDefault()
    setError(''); setOrder(null)
    const id = orderId.trim().replace(/^#/, '')
    if (!/^[0-9a-fA-F]{8}$|^[0-9a-fA-F]{24}$/.test(id)) return setError('Enter the 8-character Order ID, e.g. 94E7178C')
    if (!/^[6-9][0-9]{9}$/.test(phone)) return setError('Enter the 10-digit mobile number used for the order')
    setLoading(true)
    try {
      const res  = await fetch(`${API}/orders/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id, phone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Could not find that order')
      setOrder(data)
      rememberPhone(data.orderId, phone)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copyTracking = async () => {
    await navigator.clipboard?.writeText(order.trackingNumber).catch(() => {})
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <div className="text-center mb-6 md:mb-8">
        <p className="section-subtitle">Order status</p>
        <h1 className="font-serif text-[1.9rem] sm:text-4xl text-gray-900 font-light">Track Your Order</h1>
        <p className="text-sm text-gray-500 mt-2">Enter the Order ID from your order confirmation and the mobile number you ordered with.</p>
      </div>

      <form onSubmit={submit} className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 sm:items-end">
        <div>
          <label htmlFor="track-id" className="block text-xs uppercase tracking-wider text-gray-500 mb-1.5">Order ID</label>
          <input id="track-id" value={orderId} onChange={e => setOrderId(e.target.value.toUpperCase().replace(/[^#0-9A-F]/g, '').slice(0, 25))}
            placeholder="e.g. 94E7178C" autoComplete="off" spellCheck={false}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <div>
          <label htmlFor="track-phone" className="block text-xs uppercase tracking-wider text-gray-500 mb-1.5">Mobile number</label>
          <input id="track-phone" type="tel" inputMode="numeric" autoComplete="tel-national" value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(-10))}
            placeholder="10-digit mobile number"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <button type="submit" disabled={loading}
          className="btn-gold flex items-center justify-center gap-2 py-3 rounded-xl disabled:opacity-60">
          <Search size={15} /> {loading ? 'Searching…' : 'Track'}
        </button>
      </form>

      {error && (
        <div role="alert" className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {order && (
        <section className="mt-6 space-y-4" aria-live="polite">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-5">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Order</p>
                <p className="font-mono font-semibold text-gray-900">#{order.orderId}</p>
              </div>
              <p className="text-xs text-gray-500">Placed {fmtDate(order.placedAt)}</p>
            </div>
            <Timeline order={order} />
            <p className="text-sm text-gray-600 mt-5">{MESSAGES[order.status]}</p>

            {needsPayment(order) && order.payTo && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm flex flex-col sm:flex-row sm:items-center gap-3">
                <p className="text-amber-900 flex-1">
                  {order.paymentStatus === 'failed'
                    ? <>We couldn't find your payment for transaction number <span className="font-mono">{order.upiRef}</span>. Please check and send it again.</>
                    : <>Payment of <strong>{rupees(order.totalAmount)}</strong> is pending. Pay by UPI to confirm your order.</>}
                </p>
                <Link to={`/pay?id=${order.orderId}`} className="btn-gold px-5 py-2.5 rounded-xl text-sm font-bold text-center shrink-0">Pay now</Link>
              </div>
            )}
            {order.paymentStatus === 'submitted' && order.status === 'pending' && (
              <p className="mt-4 bg-blue-50 border border-blue-100 text-blue-800 rounded-xl px-4 py-3 text-sm">
                We're checking your UPI payment (transaction no. <span className="font-mono">{order.upiRef}</span>). Your order is confirmed as soon as it shows in our account.
              </p>
            )}

            {(order.courier || order.trackingNumber) && order.status !== 'cancelled' && (
              <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm">
                <p className="text-gray-700">
                  {order.courier && <>Shipped with <strong>{order.courier}</strong></>}
                  {order.courier && order.trackingNumber && ' · '}
                  {order.trackingNumber && (
                    <>Tracking no. <span className="font-mono font-semibold">{order.trackingNumber}</span>
                      <button type="button" onClick={copyTracking} className="ml-2 inline-flex items-center gap-1 text-xs text-amber-700 hover:underline">
                        <Copy size={12} /> {copied ? 'Copied' : 'Copy'}
                      </button>
                    </>
                  )}
                </p>
                {order.trackingUrl && (
                  <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-amber-700 font-medium hover:underline">
                    Track on the courier's website <ExternalLink size={13} />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6">
            <h2 className="font-medium text-gray-900 mb-3">Items</h2>
            <ul className="divide-y divide-gray-50">
              {order.items.map((item, i) => (
                <li key={i} className="flex items-center gap-3 py-3">
                  <div className="w-14 h-16 shrink-0 bg-gray-50 overflow-hidden rounded-lg">
                    {item.image && <img src={getImageUrl(item.image, 160)} alt="" loading="lazy" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      Qty {item.quantity}{item.size ? ` · Size ${item.size}` : ''}{item.color ? ` · ${item.color}` : ''}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-gray-900 shrink-0">{rupees(item.price * item.quantity)}</p>
                </li>
              ))}
            </ul>
            <div className="border-t border-gray-100 pt-3 mt-1 space-y-1 text-sm text-gray-600">
              {order.subtotal > 0 && <div className="flex justify-between"><span>Subtotal</span><span>{rupees(order.subtotal)}</span></div>}
              {order.subtotal > 0 && <div className="flex justify-between"><span>Shipping</span><span>{order.shippingFee ? rupees(order.shippingFee) : 'Free'}</span></div>}
              {order.discount > 0 && <div className="flex justify-between text-green-700"><span>Coupon {order.couponCode}</span><span>−{rupees(order.discount)}</span></div>}
              <div className="flex justify-between font-semibold text-gray-900 text-base pt-1"><span>Total</span><span>{rupees(order.totalAmount)}</span></div>
              <p className="text-xs text-gray-500 pt-1">
                {order.paymentMethod === 'cod'
                  ? (order.paymentStatus === 'paid' ? 'Paid in cash on delivery' : 'Pay in cash when it arrives')
                  : order.paymentStatus === 'paid' ? 'Paid by UPI'
                  : order.paymentStatus === 'submitted' ? 'UPI payment being checked'
                  : 'UPI payment pending'}
              </p>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6 text-sm">
            <h2 className="font-medium text-gray-900 mb-1">Delivering to</h2>
            <p className="text-gray-600">{order.deliverTo.name} · {order.deliverTo.city}, {order.deliverTo.state} {order.deliverTo.pincode}</p>
          </div>

          <p className="text-center text-sm text-gray-500">
            Questions about this order? <Link to="/contact" className="text-gold-600 hover:underline">Contact us</Link>
          </p>
        </section>
      )}
    </main>
  )
}
