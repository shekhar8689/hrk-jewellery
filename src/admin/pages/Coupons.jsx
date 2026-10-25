import { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, X, Tag, AlertTriangle } from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import Toast from '../../components/Toast'
import { api } from '../api'

const EMPTY_FORM = {
  code: '', type: 'percentage', value: '', minOrderAmount: '', maxDiscount: '',
  maxUses: '', expiresAt: '', description: '', oncePerCustomer: false,
}

function CouponForm({ initial, onSave, onClose }) {
  const [form, setForm]   = useState(initial || EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [err, setErr]     = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.code.trim()) { setErr('Coupon code is required'); return }
    if (!form.value || Number(form.value) <= 0) { setErr('Value must be a positive number'); return }
    if (form.type === 'percentage' && Number(form.value) > 100) { setErr('Percentage cannot exceed 100'); return }
    setSaving(true); setErr('')
    try {
      await onSave({
        code:           form.code.toUpperCase().trim(),
        type:           form.type,
        value:          Number(form.value),
        minOrderAmount: Number(form.minOrderAmount) || 0,
        maxDiscount:    Number(form.maxDiscount)    || 0,
        maxUses:        Number(form.maxUses)        || 0,
        expiresAt:      form.expiresAt || undefined,
        description:    form.description.trim(),
        oncePerCustomer: !!form.oncePerCustomer,
      })
      onClose()
    } catch (e) {
      setErr(e.message || 'Could not save coupon')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">{initial ? 'Edit Coupon' : 'Create Coupon'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Code *</label>
              <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase().replace(/\s/g,''))}
                placeholder="e.g. SAVE20" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Type *</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} className={inputCls}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Value * {form.type === 'percentage' ? '(%)' : '(₹)'}
              </label>
              <input type="number" min="1" max={form.type === 'percentage' ? '100' : undefined}
                value={form.value} onChange={e => set('value', e.target.value)} placeholder="20" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Min Order (₹)</label>
              <input type="number" min="0" value={form.minOrderAmount} onChange={e => set('minOrderAmount', e.target.value)}
                placeholder="0 = no minimum" className={inputCls} />
            </div>
          </div>

          {form.type === 'percentage' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Max Discount Cap (₹)</label>
              <input type="number" min="0" value={form.maxDiscount} onChange={e => set('maxDiscount', e.target.value)}
                placeholder="0 = no cap" className={inputCls} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Max Uses</label>
              <input type="number" min="0" value={form.maxUses} onChange={e => set('maxUses', e.target.value)}
                placeholder="0 = unlimited" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Expires At</label>
              <input type="date" value={form.expiresAt} onChange={e => set('expiresAt', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
            <input value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Internal note about this coupon" className={inputCls} />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={!!form.oncePerCustomer} onChange={e => set('oncePerCustomer', e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-amber-500 focus:ring-amber-400" />
            <span>
              <span className="text-sm font-medium text-gray-800">Once per customer</span>
              <span className="block text-xs text-gray-500">Each phone number / account can use it only once. Turn on for first-order coupons like FIRST10.</span>
            </span>
          </label>

          {err && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded-xl">
              <AlertTriangle size={14} /> {err}
            </div>
          )}
        </form>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : initial ? 'Save Changes' : 'Create Coupon'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminCoupons() {
  const [coupons,    setCoupons]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget,setDeleteTarget]= useState(null)
  const [toast,      setToast]      = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setCoupons(await api.getCoupons()) }
    catch (e) { setToast({ message: e.message, type: 'error' }) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (data) => {
    const created = await api.createCoupon(data)
    setCoupons(prev => [created, ...prev])
    setToast({ message: 'Coupon created', type: 'success' })
  }

  const handleUpdate = async (data) => {
    const updated = await api.updateCoupon(editTarget._id, data)
    setCoupons(prev => prev.map(c => c._id === editTarget._id ? updated : c))
    setToast({ message: 'Coupon updated', type: 'success' })
  }

  const handleToggle = async (id) => {
    try {
      const updated = await api.toggleCoupon(id)
      setCoupons(prev => prev.map(c => c._id === id ? updated : c))
    } catch (e) { setToast({ message: e.message, type: 'error' }) }
  }

  const handleDelete = async () => {
    try {
      await api.deleteCoupon(deleteTarget._id)
      setCoupons(prev => prev.filter(c => c._id !== deleteTarget._id))
      setToast({ message: 'Coupon deleted', type: 'success' })
      setDeleteTarget(null)
    } catch (e) { setToast({ message: e.message, type: 'error' }) }
  }

  const isExpired = (c) => c.expiresAt && new Date() > new Date(c.expiresAt)
  const isExhausted = (c) => c.maxUses > 0 && c.usedCount >= c.maxUses

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
            <p className="text-gray-500 text-sm mt-0.5">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            <Plus size={16} /> Create Coupon
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="space-y-3 p-4">
              {[1,2,3].map(i => <div key={i} className="animate-pulse bg-gray-100 h-16 rounded-xl" />)}
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Tag size={40} className="mx-auto mb-3 text-gray-200" />
              <p className="font-medium text-gray-500">No coupons yet</p>
              <p className="text-sm mt-1">Create your first discount coupon</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Code', 'Type / Value', 'Usage', 'Min Order', 'Expires', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {coupons.map(coupon => (
                  <tr key={coupon._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-bold text-gray-900 font-mono">{coupon.code}</p>
                        {coupon.description && <p className="text-xs text-gray-400 mt-0.5">{coupon.description}</p>}
                        {coupon.oncePerCustomer && <p className="text-[11px] text-amber-700 mt-0.5">Once per customer</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-800">
                        {coupon.type === 'percentage' ? `${coupon.value}%` : `₹${coupon.value}`}
                      </span>
                      {coupon.type === 'percentage' && coupon.maxDiscount > 0 && (
                        <p className="text-xs text-gray-400">Max ₹{coupon.maxDiscount}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {coupon.usedCount} / {coupon.maxUses > 0 ? coupon.maxUses : '∞'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {coupon.minOrderAmount > 0 ? `₹${coupon.minOrderAmount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {coupon.expiresAt ? (
                        <span className={`text-xs ${isExpired(coupon) ? 'text-red-600' : 'text-gray-600'}`}>
                          {new Date(coupon.expiresAt).toLocaleDateString('en-IN')}
                          {isExpired(coupon) && ' (expired)'}
                        </span>
                      ) : <span className="text-gray-400 text-xs">No expiry</span>}
                    </td>
                    <td className="px-4 py-3">
                      {isExpired(coupon) || isExhausted(coupon) ? (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                          {isExpired(coupon) ? 'Expired' : 'Exhausted'}
                        </span>
                      ) : (
                        <button onClick={() => handleToggle(coupon._id)}
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                            coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {coupon.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                          {coupon.isActive ? 'Active' : 'Inactive'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditTarget(coupon)}
                          className="text-gray-400 hover:text-amber-600 transition-colors" title="Edit">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => setDeleteTarget(coupon)}
                          className="text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modals */}
      {createOpen && <CouponForm onSave={handleCreate} onClose={() => setCreateOpen(false)} />}
      {editTarget && (
        <CouponForm
          initial={{ ...editTarget, expiresAt: editTarget.expiresAt ? editTarget.expiresAt.slice(0,10) : '' }}
          onSave={handleUpdate}
          onClose={() => setEditTarget(null)}
        />
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Coupon?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Permanently remove coupon <strong className="font-mono">{deleteTarget.code}</strong>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-semibold">Delete</button>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </AdminLayout>
  )
}
