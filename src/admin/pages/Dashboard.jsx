import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag, Package, Users, IndianRupee, Clock, CheckCircle, Truck, Star, AlertTriangle, MessageSquare, PartyPopper } from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import { api } from '../api'

const STATUS_COLOR = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const StatCard = ({ icon: Icon, label, value, color, to }) => (
  <Link to={to} className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
      <Icon size={22} className="text-white" />
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </Link>
)

// What needs doing today
function TodoPanel({ todo }) {
  if (!todo) return null
  const items = [
    todo.paymentsToCheck > 0 && { to: '/admin/orders?payment=submitted', icon: IndianRupee, cls: 'bg-orange-50 border-orange-200 text-orange-800',
      text: `${todo.paymentsToCheck} payment${todo.paymentsToCheck > 1 ? 's' : ''} to check`, hint: 'Find the transaction number in your bank / UPI app, then mark received' },
    todo.paidToConfirm > 0 && { to: '/admin/orders?payment=paid&status=pending', icon: Package, cls: 'bg-blue-50 border-blue-200 text-blue-800',
      text: `${todo.paidToConfirm} paid order${todo.paidToConfirm > 1 ? 's' : ''} to confirm & pack`, hint: 'Confirm, pack, then ship with the courier details' },
    todo.messages > 0 && { to: '/admin/messages', icon: MessageSquare, cls: 'bg-purple-50 border-purple-200 text-purple-800',
      text: `${todo.messages} message${todo.messages > 1 ? 's' : ''} to reply to`, hint: 'From the Contact page' },
  ].filter(Boolean)
  const low = todo.lowStock || []
  const nothing = items.length === 0 && low.length === 0

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h2 className="font-semibold text-gray-900 mb-3">To do today</h2>
      {nothing ? (
        <p className="text-sm text-green-700 flex items-center gap-2"><PartyPopper size={16} /> All caught up — nothing waiting for you.</p>
      ) : (
        <div className="space-y-2">
          {items.map(({ to, icon: Icon, cls, text, hint }) => (
            <Link key={to} to={to} className={`flex items-center gap-3 border rounded-lg px-4 py-3 hover:shadow-sm ${cls}`}>
              <Icon size={18} className="shrink-0" />
              <span className="flex-1 min-w-0"><span className="font-semibold">{text}</span><span className="block text-xs opacity-80">{hint}</span></span>
              <span aria-hidden="true">→</span>
            </Link>
          ))}
          {low.length > 0 && (
            <div className="border border-red-200 bg-red-50 rounded-lg px-4 py-3">
              <p className="text-sm font-semibold text-red-800 flex items-center gap-2"><AlertTriangle size={16} /> Low stock — add more in Products</p>
              <ul className="mt-2 text-sm text-red-900 space-y-1">
                {low.map(p => (
                  <li key={p._id} className="flex justify-between gap-3">
                    <Link to="/admin/products" className="hover:underline truncate">{p.name}</Link>
                    <span className="shrink-0 font-medium">{p.stock === 0 ? 'Sold out' : `${p.stock} left`}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {todo.unpaid > 0 && <p className="text-xs text-gray-500 mt-3">{todo.unpaid} order{todo.unpaid > 1 ? 's are' : ' is'} waiting for the customer to pay (cancelled automatically after 24 hours).</p>}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.stats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    </AdminLayout>
  )

  const statusCounts = {}
  stats?.ordersByStatus?.forEach(({ _id, count }) => { statusCounts[_id] = count })

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Overview of your store</p>
        </div>

        <TodoPanel todo={stats?.todo} />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={ShoppingBag} label="Total Orders" value={stats?.totalOrders || 0} color="bg-blue-500" to="/admin/orders" />
          <StatCard icon={IndianRupee} label="Revenue" value={`₹${(stats?.totalRevenue || 0).toLocaleString('en-IN')}`} color="bg-green-500" to="/admin/orders" />
          <StatCard icon={Package} label="Products" value={stats?.totalProducts || 0} color="bg-amber-500" to="/admin/products" />
          <StatCard icon={Users} label="Users" value={stats?.totalUsers || 0} color="bg-purple-500" to="/admin/users" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {['pending', 'confirmed', 'shipped', 'delivered'].map(s => (
            <div key={s} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{statusCounts[s] || 0}</p>
              <p className={`text-xs font-medium mt-1 px-2 py-0.5 rounded-full inline-block capitalize ${STATUS_COLOR[s]}`}>{s}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Orders</h2>
            <Link to="/admin/orders" className="text-sm text-amber-600 hover:text-amber-700 font-medium">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats?.recentOrders?.length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm">No orders yet</p>
            )}
            {stats?.recentOrders?.map(order => (
              <Link
                key={order._id}
                to={`/admin/orders?id=${order._id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {order.shippingAddress?.name || order.guestInfo?.name || 'Guest'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {order.items?.length} item{order.items?.length !== 1 ? 's' : ''} ·{' '}
                    {new Date(order.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">₹{order.totalAmount?.toLocaleString('en-IN')}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLOR[order.status]}`}>
                    {order.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
