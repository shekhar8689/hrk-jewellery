import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, X, AlertTriangle, CheckCircle, Copy, Printer } from 'lucide-react'
import { openPackingSlip } from '../utils/packingSlip'
import { SHOP } from '../../config/shop'
import AdminLayout from '../components/AdminLayout'
import Pagination from '../components/Pagination'
import Toast from '../../components/Toast'
import { api } from '../api'
import { getImageUrl } from '../../utils/image'

const STATUS_COLOR = {
  pending:   'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped:   'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

// Payment badge for each order
const PAYMENT = {
  pending:   { label: 'Not paid',         cls: 'bg-gray-100 text-gray-600' },
  submitted: { label: 'Payment to check', cls: 'bg-orange-100 text-orange-700' },
  paid:      { label: 'Paid',             cls: 'bg-green-100 text-green-700' },
  failed:    { label: 'Not received',     cls: 'bg-red-100 text-red-700' },
}
const paymentBadge = o => o.paymentMethod === 'cod'
  ? { label: o.paymentStatus === 'paid' ? 'COD · paid' : 'COD', cls: 'bg-gray-100 text-gray-600' }
  : PAYMENT[o.paymentStatus] || PAYMENT.pending

// Payment check for UPI orders
function PaymentPanel({ order, onPayment }) {
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  if (order.paymentMethod !== 'upi') return null
  const badge = paymentBadge(order)
  const mark = async received => {
    if (!received && !window.confirm('Mark this payment as NOT received? The customer will be asked to check and send the transaction number again.')) return
    setBusy(true); setError('')
    try { await onPayment(order._id, received) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const copy = async () => { try { await navigator.clipboard.writeText(order.upiRef) } catch { /* ignore */ } setCopied(true); setTimeout(() => setCopied(false), 1500) }
  const fmt = d => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''
  return (
    <div className="rounded-xl border border-gray-100 p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium text-sm text-gray-700">UPI Payment</h3>
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>
      </div>
      <p className="text-sm text-gray-600">{order.paymentStatus === 'paid' ? 'Amount received:' : 'Amount to receive:'} <strong className="text-gray-900">₹{order.totalAmount?.toLocaleString('en-IN')}</strong>{order.payTo?.upiId ? <> to <span className="font-mono">{order.payTo.upiId}</span></> : null}</p>
      {order.upiRef ? (
        <p className="text-sm text-gray-600 flex items-center gap-2 flex-wrap">
          Transaction no. <span className="font-mono font-semibold text-gray-900">{order.upiRef}</span>
          <button type="button" onClick={copy} className="inline-flex items-center gap-1 text-xs text-amber-700 hover:underline">
            {copied ? <CheckCircle size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
          </button>
          {order.paymentSubmittedAt && <span className="text-xs text-gray-400">sent {fmt(order.paymentSubmittedAt)}</span>}
        </p>
      ) : order.paymentStatus !== 'paid' && (
        <p className="text-sm text-gray-500">The customer hasn't sent a transaction number yet.</p>
      )}
      {order.paymentStatus === 'paid' && order.paidAt && <p className="text-xs text-green-700">Marked as received {fmt(order.paidAt)}</p>}
      {order.paymentStatus === 'submitted' && (
        <p className="text-xs text-gray-500">Check your bank or UPI app for this transaction number and amount before shipping.</p>
      )}
      {order.paymentStatus === 'paid' && order.status === 'cancelled' && (
        <p className="text-xs text-red-600">This order is cancelled but was paid. Please refund ₹{order.totalAmount?.toLocaleString('en-IN')} to the customer.</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {order.paymentStatus !== 'paid' && (
        <div className="flex gap-2 pt-1">
          <button type="button" disabled={busy} onClick={() => mark(true)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50">Payment received</button>
          {order.paymentStatus === 'submitted' && order.status !== 'cancelled' && (
            <button type="button" disabled={busy} onClick={() => mark(false)}
              className="flex-1 border border-red-200 text-red-700 hover:bg-red-50 py-2 rounded-lg text-sm font-medium disabled:opacity-50">Not received</button>
          )}
        </div>
      )}
    </div>
  )
}

// Only valid forward transitions — mirrors the backend enforcement
const NEXT_STATUSES = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['shipped',   'cancelled'],
  shipped:   ['delivered'],
  delivered: [],
  cancelled: [],
}

// ── Order Detail Modal ────────────────────────────────────────────────────────
function OrderDetail({ order, onClose, onStatusChange, onPayment }) {
  const [status,  setStatus]  = useState(order.status)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  // Courier details shown to the customer on the Track Order page
  const [tracking, setTracking] = useState({
    courier:        order.courier || '',
    trackingNumber: order.trackingNumber || '',
    trackingUrl:    order.trackingUrl || '',
  })
  const trackingChanged = ['courier', 'trackingNumber', 'trackingUrl']
    .some(k => (tracking[k] || '').trim() !== (order[k] || ''))
  const showTracking = ['confirmed', 'shipped', 'delivered'].includes(order.status) || status === 'shipped'

  const validNext   = NEXT_STATUSES[order.status] || []
  // UPI orders are confirmed only after the money has arrived
  const unpaid      = order.paymentMethod === 'upi' && order.paymentStatus !== 'paid'
  const canSave     = (validNext.length > 0 && status !== order.status) || trackingChanged

  const save = async () => {
    if (!canSave) return
    if (tracking.trackingUrl.trim() && !/^https?:\/\//i.test(tracking.trackingUrl.trim()))
      return setError('Tracking link must start with https://')
    setSaving(true)
    setError('')
    try {
      await onStatusChange(order._id, status, tracking)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to update status. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold">Order Details</h2>
            <p className="text-xs text-gray-400 mt-0.5">#{order._id?.slice(-8).toUpperCase()}</p>
          </div>
          <button type="button" onClick={() => openPackingSlip(order, { shopName: SHOP.name, shopPhone: SHOP.phone, shopAddress: SHOP.address })}
            className="ml-auto mr-3 inline-flex items-center gap-1.5 text-xs font-medium border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
            <Printer size={14} /> Packing slip
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Customer info */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
            <h3 className="font-medium text-sm text-gray-700 mb-2">Customer Info</h3>
            <p className="text-sm"><span className="text-gray-500">Name:</span> {order.shippingAddress?.name}</p>
            <p className="text-sm"><span className="text-gray-500">Phone:</span> {order.shippingAddress?.phone}</p>
            <p className="text-sm">
              <span className="text-gray-500">Address:</span>{' '}
              {[
                order.shippingAddress?.street,
                order.shippingAddress?.city,
                order.shippingAddress?.state,
                order.shippingAddress?.pincode,
              ].filter(Boolean).join(', ')}
            </p>
          </div>

          {/* Items */}
          <div>
            <h3 className="font-medium text-sm text-gray-700 mb-3">Items</h3>
            <div className="space-y-3">
              {order.items?.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  {item.image && (
                    <img
                      src={getImageUrl(item.image, 120)}
                      loading="lazy" decoding="async"
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded-lg border border-gray-100"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      Qty: {item.quantity}
                      {item.size  ? ` · Size: ${item.size}`  : ''}
                      {item.color ? ` · ${item.color}`        : ''}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 shrink-0">
                    ₹{(item.price * item.quantity)?.toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
            {/* Price breakdown (orders placed after the server-side price check) */}
            {order.subtotal > 0 && (
              <div className="border-t border-gray-100 mt-3 pt-3 space-y-1 text-sm text-gray-600">
                <div className="flex justify-between"><span>Subtotal</span><span>₹{order.subtotal.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span>Shipping</span><span>{order.shippingFee ? `₹${order.shippingFee.toLocaleString('en-IN')}` : 'Free'}</span></div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Coupon {order.couponCode}</span><span>−₹{order.discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            )}
            <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-bold text-gray-900">₹{order.totalAmount?.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <PaymentPanel order={order} onPayment={onPayment} />

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              <AlertTriangle size={15} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Status update */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Update Status
              <span className={`ml-2 text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${STATUS_COLOR[order.status]}`}>
                Current: {order.status}
              </span>
            </label>

            {validNext.length === 0 ? (
              <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-500">
                {order.status === 'delivered'
                  ? 'Order delivered — no further updates possible.'
                  : 'This order has been cancelled — no further updates possible.'}
              </div>
            ) : (
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                disabled={saving}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 capitalize disabled:opacity-50"
              >
                <option value={order.status} className="capitalize">{order.status} (current)</option>
                {validNext.map(s => (
                  <option key={s} value={s} className="capitalize" disabled={s === 'confirmed' && unpaid}>
                    {s}{s === 'confirmed' && unpaid ? ' (after payment is received)' : ''}
                  </option>
                ))}
              </select>
            )}
            {order.status === 'pending' && unpaid && (
              <p className="text-xs text-gray-500 mt-1.5">Confirm the order after you mark the payment as received.</p>
            )}
          </div>

          {/* Courier details */}
          {showTracking && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Courier details <span className="text-gray-400 font-normal">(shown on the customer's Track Order page)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input value={tracking.courier} maxLength={60} placeholder="Courier, e.g. Delhivery"
                  onChange={e => setTracking(t => ({ ...t, courier: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                <input value={tracking.trackingNumber} maxLength={80} placeholder="Tracking number"
                  onChange={e => setTracking(t => ({ ...t, trackingNumber: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <input value={tracking.trackingUrl} maxLength={300} type="url" placeholder="Tracking link (optional), https://…"
                onChange={e => setTracking(t => ({ ...t, trackingUrl: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              {validNext.length === 0 ? 'Close' : 'Cancel'}
            </button>
            {(validNext.length > 0 || showTracking) && (
              <button
                onClick={save}
                disabled={saving || !canSave}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 transition-colors"
              >
                {saving ? 'Saving…' : status !== order.status ? 'Update Status' : 'Save Details'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Orders Page ───────────────────────────────────────────────────────────────
const STATUS_LIST = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']

export default function Orders() {
  const [searchParams] = useSearchParams()

  const [data,         setData]         = useState({ orders: [], total: 0, pages: 1, page: 1 })
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [paymentFilter, setPaymentFilter] = useState(searchParams.get('payment') || '')
  const [selected,     setSelected]     = useState(null)
  const [page,         setPage]         = useState(1)
  const [toast,        setToast]        = useState(null)   // { message, type }

  const load = useCallback(() => {
    setLoading(true)
    const params = { page }
    if (search)       params.search = search
    if (statusFilter) params.status = statusFilter
    if (paymentFilter) params.payment = paymentFilter
    api.getOrders(params)
      .then(res => {
        setData(res)

        // If ?id= is in the URL, open that order's modal once data arrives
        const targetId = searchParams.get('id')
        if (targetId) {
          const found = res.orders.find(o => o._id === targetId)
          if (found) setSelected(found)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, search, statusFilter, paymentFilter, searchParams])

  useEffect(() => { load() }, [load])

  // Optimistic update: change status in local list immediately, no full reload needed
  const handleStatusChange = async (id, newStatus, tracking) => {
    const updated = await api.updateOrderStatus(id, newStatus, tracking)   // throws on error → caught in modal
    setData(prev => ({
      ...prev,
      orders: prev.orders.map(o => o._id === id ? { ...o, ...updated } : o),
    }))
    setToast({ message: `Order ${updated.status === newStatus ? `status updated to "${newStatus}"` : 'details saved'}`, type: 'success' })
  }

  const handlePayment = async (id, received) => {
    const updated = await api.setOrderPayment(id, received)
    setData(prev => ({ ...prev, orders: prev.orders.map(o => o._id === id ? { ...o, ...updated } : o) }))
    setSelected(s => s && s._id === id ? { ...s, ...updated } : s)
    setToast({ message: received ? 'Payment marked as received. You can confirm the order now.' : 'Marked as not received. The customer is asked to check.', type: 'success' })
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500">{data.total} orders total</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by name, phone…"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 capitalize"
          >
            <option value="">All Status</option>
            {STATUS_LIST.map(s => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>
          <select
            value={paymentFilter}
            onChange={e => { setPaymentFilter(e.target.value); setPage(1) }}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">All Payments</option>
            {Object.entries(PAYMENT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
            </div>
          ) : data.orders.length === 0 ? (
            <p className="text-center text-gray-400 py-16 text-sm">No orders found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Order ID</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Items</th>
                    <th className="px-4 py-3 text-left">Total</th>
                    <th className="px-4 py-3 text-left">Payment</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.orders.map(order => (
                    <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">
                        #{order._id?.slice(-8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{order.shippingAddress?.name || '—'}</p>
                        <p className="text-xs text-gray-400">{order.shippingAddress?.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        ₹{order.totalAmount?.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap ${paymentBadge(order).cls}`}>
                          {paymentBadge(order).label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {/* Badge reflects optimistic local state immediately */}
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${STATUS_COLOR[order.status]}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelected(order)}
                          className="text-xs text-amber-600 hover:text-amber-700 font-medium bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Pagination page={data.page} pages={data.pages} onChange={p => { setPage(p); setSelected(null) }} />
      </div>

      {/* Detail modal — keyed to order._id so state resets when a different order is opened */}
      {selected && (
        <OrderDetail
          key={selected._id}
          order={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          onPayment={handlePayment}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </AdminLayout>
  )
}
