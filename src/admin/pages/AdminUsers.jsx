import React, { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import Pagination from '../components/Pagination'
import { api } from '../api'
import ResetLinkButton from './ResetLinkButton'

function UserDetail({ user, orders, onClose, onToggle }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">User Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-xl font-bold text-amber-600">
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user.name}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
              {user.phone && <p className="text-sm text-gray-500">{user.phone}</p>}
              <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-sm text-gray-700 mb-3">Order History ({orders?.length || 0})</h3>
            {orders?.length === 0 ? (
              <p className="text-sm text-gray-400">No orders yet</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {orders.map(order => (
                  <div key={order._id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                    <div>
                      <p className="text-xs font-mono text-gray-500">#{order._id?.slice(-8).toUpperCase()}</p>
                      <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">₹{order.totalAmount?.toLocaleString('en-IN')}</p>
                      <span className={`text-xs capitalize ${
                        order.status === 'delivered' ? 'text-green-600' :
                        order.status === 'cancelled' ? 'text-red-500' : 'text-blue-500'
                      }`}>{order.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">
              Close
            </button>
            <button
              onClick={() => { onToggle(user._id); onClose() }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold ${
                user.isActive
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              {user.isActive ? 'Deactivate User' : 'Activate User'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminUsers() {
  const [data, setData] = useState({ users: [], total: 0, pages: 1, page: 1 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [userDetail, setUserDetail] = useState(null)
  const [page, setPage] = useState(1)

  const load = () => {
    setLoading(true)
    const params = { page }
    if (search) params.search = search
    api.getUsers(params)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page, search])

  const handleView = async (id) => {
    const detail = await api.getUser(id)
    setUserDetail(detail)
    setSelected(detail.user)
  }

  const handleToggle = async (id) => {
    await api.toggleUser(id)
    load()
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500">{data.total} users registered</p>
        </div>

        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
            </div>
          ) : data.users.length === 0 ? (
            <p className="text-center text-gray-400 py-16 text-sm">No users found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Joined</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.users.map(user => (
                    <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-600">
                            {user.name?.[0]?.toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{user.email}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{new Date(user.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                        <ResetLinkButton user={user} />
                        <button
                          onClick={() => handleView(user._id)}
                          className="text-xs text-amber-600 hover:text-amber-700 font-medium bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg"
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

        <Pagination page={data.page} pages={data.pages} onChange={setPage} />
      </div>

      {selected && userDetail && (
        <UserDetail
          user={selected}
          orders={userDetail.orders}
          onClose={() => { setSelected(null); setUserDetail(null) }}
          onToggle={handleToggle}
        />
      )}
    </AdminLayout>
  )
}
