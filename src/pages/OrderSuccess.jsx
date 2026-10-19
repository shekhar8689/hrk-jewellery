import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle, Package, Truck, Home, ShoppingBag, Clock } from 'lucide-react'

export default function OrderSuccess() {
  const location = useLocation()
  const navigate  = useNavigate()

  /* State passed from Checkout via navigate('/order-success', { state }) */
  const order = location.state?.order
  const paid  = location.state?.paid   // true = online payment succeeded

  /* If someone opens /order-success directly with no order data, redirect home */
  useEffect(() => {
    if (!order) navigate('/', { replace: true })
  }, [order, navigate])

  if (!order) return null

  const orderId = order._id?.slice(-8).toUpperCase() ?? '—'

  return (
    <main className="max-w-2xl mx-auto px-4 py-16">

      {/* ── Success hero ──────────────────────────────────────────── */}
      <div className="text-center mb-10">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={42} className="text-green-500" />
        </div>
        <h1 className="font-serif text-4xl text-gray-900 mb-2">Thank You!</h1>
        <p className="text-gray-500">Your order has been placed successfully.</p>
        <p className="text-sm text-gray-400 mt-1">
          Order ID:&nbsp;
          <span className="font-mono font-semibold text-gray-700">#{orderId}</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Save this Order ID — with your mobile number it lets you track the order anytime.
        </p>

        {/* Payment badge */}
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
          {paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}
        ">
          {paid ? (
            <span className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
              <CheckCircle size={16} /> Payment Successful
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-full text-sm font-medium">
              <Package size={16} /> Cash on Delivery
            </span>
          )}
        </div>
      </div>

      {/* ── Order status tracker ───────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-6">Order Status</h2>

        {/* Steps */}
        <div className="flex items-start justify-between relative">
          {/* Connecting line */}
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-100 mx-10" />
          <div className="absolute top-4 left-0 h-0.5 bg-amber-400 mx-10" style={{ width: '5%' }} />

          {[
            { icon: CheckCircle, label: 'Placed',    active: true },
            { icon: Package,     label: 'Confirmed', active: false },
            { icon: Truck,       label: 'Shipped',   active: false },
            { icon: Home,        label: 'Delivered', active: false },
          ].map(({ icon: Icon, label, active }) => (
            <div key={label} className="flex flex-col items-center gap-2 z-10">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                active ? 'bg-amber-500 text-white shadow-md shadow-amber-200' : 'bg-gray-100 text-gray-300'
              }`}>
                <Icon size={17} />
              </div>
              <span className={`text-xs font-medium ${active ? 'text-amber-600' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* ETA */}
        <div className="flex items-center gap-2 mt-6 text-sm text-gray-500 bg-gray-50 px-4 py-3 rounded-xl">
          <Clock size={16} className="text-amber-500 shrink-0" />
          <span>Expected delivery in <strong className="text-gray-800">3 – 5 business days</strong></span>
        </div>
      </div>

      {/* ── Delivery address ───────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">Delivery Address</h2>
        <p className="font-medium text-gray-800">{order.shippingAddress?.name}</p>
        <p className="text-sm text-gray-500 mt-0.5">{order.shippingAddress?.phone}</p>
        <p className="text-sm text-gray-500 mt-1">
          {[
            order.shippingAddress?.street,
            order.shippingAddress?.city,
            order.shippingAddress?.state,
            order.shippingAddress?.pincode,
          ].filter(Boolean).join(', ')}
        </p>
      </div>

      {/* ── What happens next ─────────────────────────────────────── */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-8">
        <p className="font-semibold text-amber-900 mb-2 text-sm">What happens next?</p>
        <ul className="space-y-1.5 text-sm text-amber-800">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-amber-500">•</span>
            We'll confirm your order within 24 hours
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-amber-500">•</span>
            Your jewellery will be carefully packed and shipped
          </li>
          {!paid && (
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-amber-500">•</span>
              Please keep <strong>₹{order.totalAmount?.toLocaleString('en-IN')}</strong> ready to pay on delivery
            </li>
          )}
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-amber-500">•</span>
            30-day easy returns — we've got you covered
          </li>
        </ul>
      </div>

      {/* ── Actions ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to={`/track-order?id=${orderId}`}
          className="flex-1 border border-gold-500 text-gold-600 hover:bg-gold-500 hover:text-white transition-colors py-4 text-sm font-semibold text-center inline-flex items-center justify-center gap-2"
        >
          <Truck size={16} />
          Track Order
        </Link>
        <Link
          to="/collections"
          className="flex-1 btn-gold py-4 text-sm font-semibold text-center inline-flex items-center justify-center gap-2"
        >
          <ShoppingBag size={16} />
          Continue Shopping
        </Link>
        <Link
          to="/"
          className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors py-4 text-sm font-medium text-center inline-flex items-center justify-center gap-2 rounded-sm"
        >
          <Home size={16} />
          Back to Home
        </Link>
      </div>
    </main>
  )
}
