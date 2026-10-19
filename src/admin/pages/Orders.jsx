import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, X, AlertTriangle } from 'lucide-react'
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

// Only valid forward transitions — mirrors the backend enforcement
const NEXT_STATUSES = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['shipped',   'cancelled'],
  shipped:   ['delivered'],
  delivered: [],
  cancelled: [],
}

// ── Order Detail Modal ────────────────────────────────────────────────────────
function OrderDetail({ order, onClose, onStatusChange }) {
  const [status,  setStatus]  = useState(order.status)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const validNext   = NEXT_STATUSES[order.status] || []
  const canSave     = validNext.length > 0 && status !== order.status

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    setError('')
    try {
      await onStatusChange(order._id, status)
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
                  <option key={s} value={s} className="capitalize">{s}</option>
                ))}
              </select>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              {validNext.length === 0 ? 'Close' : 'Cancel'}
            </button>
            {validNext.length > 0 && (
              <button
                onClick={save}
                disabled={saving || !canSave}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 transition-colors"
              >
                {saving ? 'Saving…' : 'Update Status'}
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
  const [statusFilter, setStatusFilter] = useState('')
  const [selected,     setSelected]     = useState(null)
  const [page,         setPage]         = useState(1)
  const [toast,        setToast]        = useState(null)   // { message, type }

  const load = useCallback(() => {
    setLoading(true)
    const params = { page }
    if (search)       params.search = search
    if (statusFilter) params.status = statusFilter
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
  }, [page, search, statusFilter, searchParams])

  useEffect(() => { load() }, [load])

  // Optimistic update: change status in local list immediately, no full reload needed
  const handleStatusChange = async (id, newStatus) => {
    await api.updateOrderStatus(id, newStatus)   // throws on error → caught in modal
    setData(prev => ({
      ...prev,
      orders: prev.orders.map(o => o._id === id ? { ...o, status: newStatus } : o),
    }))
    setToast({ message: `Order status updated to "${newStatus}"`, type: 'success' })
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
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </AdminLayout>
  )
}
