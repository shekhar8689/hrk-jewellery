import usePageTitle from '../hooks/usePageTitle'
import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Package, Truck, Home, Clock, X, ShoppingBag, RefreshCw } from 'lucide-react'
import { useUserAuth } from '../context/UserAuthContext'
import { getImageUrl } from '../utils/image'
import { needsPayment } from '../utils/upi'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const STATUS_STEPS = ['pending', 'confirmed', 'shipped', 'delivered']

const STATUS_COLOR = {
  pending:   'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped:   'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const STATUS_ICON = {
  pending:   Clock,
  confirmed: Package,
  shipped:   Truck,
  delivered: Home,
  cancelled: X,
}

function StatusTracker({ status }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">
        <X size={16} />
        <span className="font-medium">This order was cancelled</span>
      </div>
    )
  }
  const currentIdx = STATUS_STEPS.indexOf(status)
  return (
    <div className="flex items-center justify-between relative px-2">
      <div className="absolute top-4 left-6 right-6 h-0.5 bg-gray-100" />
      <div
        className="absolute top-4 left-6 h-0.5 bg-amber-400 transition-all"
        style={{ width: `${(currentIdx / (STATUS_STEPS.length - 1)) * 100}%`, right: 'auto' }}
      />
      {STATUS_STEPS.map((step, i) => {
        const done    = i <= currentIdx
        const Icon    = STATUS_ICON[step]
        return (
          <div key={step} className="flex flex-col items-center gap-1.5 z-10">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              done ? 'bg-amber-500 text-white shadow-sm' : 'bg-gray-100 text-gray-300'
            }`}>
              <Icon size={15} />
            </div>
            <span className={`text-[10px] font-medium capitalize ${done ? 'text-amber-600' : 'text-gray-400'}`}>
              {step}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function OrderCard({ order, onCancel, cancelling }) {
  const [expanded, setExpanded] = useState(false)
  // Paid orders are refunded by the shop, so they are cancelled by contacting us
  const canCancel = ['pending', 'confirmed'].includes(order.status) && !['paid', 'submitted'].includes(order.paymentStatus)
  const orderId   = order._id?.slice(-8).toUpperCase()

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      {/* Header row */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-gray-50">
        <div>
          <p className="text-xs text-gray-400 font-mono mb-0.5">#{orderId}</p>
          <p className="text-xs text-gray-400">
            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLOR[order.status]}`}>
            {order.status}
          </span>
          <p className="text-sm font-bold text-gray-900">₹{order.totalAmount?.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Waiting for payment: shown right on the card */}
      {needsPayment(order) && (
        <div className="mx-5 mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm text-amber-900 flex-1">
            <strong>Waiting for payment.</strong>{' '}
            {order.paymentStatus === 'failed'
              ? "We couldn't find your UPI payment. Please check and send the transaction number again."
              : 'Pay by UPI within 24 hours of ordering, or the order is cancelled.'}
          </p>
          <Link to={`/pay?id=${orderId}`} state={{ phone: order.shippingAddress?.phone }}
            className="btn-gold text-center px-5 py-2.5 rounded-xl text-sm font-bold shrink-0">
            Pay ₹{order.totalAmount?.toLocaleString('en-IN')} now
          </Link>
        </div>
      )}
      {order.paymentStatus === 'submitted' && order.status === 'pending' && (
        <p className="mx-5 mt-4 text-sm bg-blue-50 border border-blue-100 text-blue-800 rounded-xl p-3">
          We're checking your UPI payment. Your order is confirmed as soon as it shows in our account.
        </p>
      )}

      {/* Status tracker */}
      <div className="px-5 py-5">
        <StatusTracker status={order.status} />
      </div>

      {/* Item thumbnails preview */}
      <div className="px-5 pb-4">
        <div className="flex gap-2 flex-wrap">
          {order.items?.slice(0, 4).map((item, i) => (
            <div key={i} className="w-12 h-14 rounded-lg overflow-hidden bg-gray-100 border border-gray-100 shrink-0">
              {item.image ? (
                <img src={getImageUrl(item.image, 200)} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 text-[9px]">IMG</div>
              )}
            </div>
          ))}
          {(order.items?.length || 0) > 4 && (
            <div className="w-12 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-500 font-medium border border-gray-100">
              +{order.items.length - 4}
            </div>
          )}
        </div>
      </div>

      {/* Expand / actions */}
      <div className="px-5 pb-4 flex items-center gap-3">
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-xs text-amber-600 hover:text-amber-700 font-medium"
        >
          {expanded ? 'Hide details ↑' : 'View details ↓'}
        </button>
        {canCancel && (
          <button
            onClick={() => onCancel(order._id)}
            disabled={cancelling === order._id}
            className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50 ml-auto"
          >
            {cancelling === order._id ? 'Cancelling…' : 'Cancel Order'}
          </button>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-50 px-5 py-4 space-y-4">
          {/* Items */}
          <div className="space-y-3">
            {order.items?.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-14 h-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-100 shrink-0">
                  {item.image ? (
                    <img src={getImageUrl(item.image, 200)} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-[10px]">No img</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Qty: {item.quantity}
                    {item.size  ? ` · Size: ${item.size}`   : ''}
                    {item.color ? ` · ${item.color}`         : ''}
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900 shrink-0">
                  ₹{(item.price * item.quantity)?.toLocaleString('en-IN')}
                </p>
              </div>
            ))}
          </div>

          {/* Delivery address */}
          <div className="bg-gray-50 rounded-xl p-4 text-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Delivering to</p>
            <p className="font-medium text-gray-900">{order.shippingAddress?.name}</p>
            <p className="text-gray-500 text-xs mt-0.5">{order.shippingAddress?.phone}</p>
            <p className="text-gray-500 text-xs mt-0.5">
              {[
                order.shippingAddress?.street,
                order.shippingAddress?.city,
                order.shippingAddress?.state,
                order.shippingAddress?.pincode,
              ].filter(Boolean).join(', ')}
            </p>
          </div>

          {/* Payment */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Payment</span>
            <span className="font-medium text-gray-900 capitalize">
              {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'UPI'}
              {' · '}
              <span className={order.paymentStatus === 'paid' ? 'text-green-600' : order.paymentStatus === 'failed' ? 'text-red-600' : 'text-amber-600'}>
                {{ pending: 'not paid yet', submitted: 'being checked', paid: 'paid', failed: 'not received' }[order.paymentStatus] || order.paymentStatus}
              </span>
            </span>
          </div>


          {/* Courier details, once the shop adds them */}
          {(order.courier || order.trackingNumber) && order.status !== 'cancelled' && (
            <div className="text-sm bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <span className="text-gray-500">Shipped with </span>
              <span className="font-medium text-gray-900">{order.courier || 'courier'}</span>
              {order.trackingNumber && <> · <span className="font-mono">{order.trackingNumber}</span></>}
              {order.trackingUrl && (
                <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="block text-amber-700 hover:underline mt-0.5">
                  Track on the courier's website →
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function MyOrders() {
  usePageTitle('My Orders')
  const { user, getToken, loading: authLoading } = useUserAuth()
  const navigate = useNavigate()

  const [orders, setOrders]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [cancelling, setCancelling] = useState(null)
  const [error, setError]           = useState('')

  const fetchOrders = useCallback(() => {
    setLoading(true)
    setError('')
    fetch(`${API}/orders/my`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(data => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setError('Could not load orders. Please try again.'))
      .finally(() => setLoading(false))
  }, [getToken])

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/login', { state: { from: '/my-orders' }, replace: true }); return }
    fetchOrders()
  }, [user, authLoading, fetchOrders])

  const handleCancel = async (orderId) => {
    if (!window.confirm('Cancel this order? Stock will be restored.')) return
    setCancelling(orderId)
    try {
      const res  = await fetch(`${API}/orders/${orderId}/cancel`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Could not cancel order')
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'cancelled' } : o))
    } catch (err) {
      alert(err.message)
    } finally {
      setCancelling(null)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    )
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-gray-900">My Orders</h1>
          <p className="text-sm text-gray-400 mt-1">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={fetchOrders}
          className="text-gray-400 hover:text-gray-600 p-2"
          aria-label="Refresh orders"
          title="Refresh"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-6">
          {error}
        </div>
      )}

      {orders.length === 0 && !error ? (
        <div className="text-center py-20">
          <ShoppingBag size={52} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-700 font-medium text-lg mb-1">No orders yet</p>
          <p className="text-gray-400 text-sm mb-6">Your order history will appear here once you shop with us</p>
          <Link to="/collections" className="btn-gold inline-block">Start Shopping</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <OrderCard
              key={order._id}
              order={order}
              onCancel={handleCancel}
              cancelling={cancelling}
            />
          ))}
        </div>
      )}
    </main>
  )
}
