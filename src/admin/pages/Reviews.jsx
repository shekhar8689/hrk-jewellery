import { useEffect, useState, useCallback } from 'react'
import { Search, Star, CheckCircle, XCircle, Trash2, Edit2, X, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import Toast from '../../components/Toast'
import { api } from '../api'

const STATUS_STYLES = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

function Stars({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} size={12}
          className={n <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />
      ))}
    </div>
  )
}

// ── Edit / view modal ─────────────────────────────────────────────────────────
function EditModal({ review, onSave, onClose }) {
  const [title,  setTitle]  = useState(review.title  || '')
  const [text,   setText]   = useState(review.text   || '')
  const [status, setStatus] = useState(review.status || 'pending')
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  const save = async () => {
    if (text.trim().length < 10) { setErr('Review must be at least 10 characters'); return }
    setSaving(true); setErr('')
    try {
      await onSave(review._id, { title: title.trim(), text: text.trim(), status })
      onClose()
    } catch (e) {
      setErr(e.message || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Edit Review</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Meta */}
          <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
            <p><span className="text-gray-500">Customer:</span> <strong>{review.userName || review.user?.name}</strong></p>
            <p><span className="text-gray-500">Product:</span> {review.product?.name || '—'}</p>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Rating:</span> <Stars rating={review.rating} />
              <span className="font-medium">{review.rating}/5</span>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value.slice(0, 100))}
              placeholder="Review title (optional)"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>

          {/* Text */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Review Text ({text.length}/500)
            </label>
            <textarea rows={5} value={text} onChange={e => setText(e.target.value.slice(0, 500))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
          </div>

          {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded-xl">{err}</p>}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete confirmation modal ─────────────────────────────────────────────────
function DeleteModal({ review, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false)
  const confirm = async () => {
    setDeleting(true)
    try { await onConfirm(review._id); onClose() }
    catch { setDeleting(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={22} className="text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Review?</h3>
        <p className="text-sm text-gray-500 mb-6">
          This will permanently remove the review by <strong>{review.userName || review.user?.name}</strong> and recalculate the product rating.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={confirm} disabled={deleting}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminReviews() {
  const [reviews,     setReviews]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [statusFilter,setStatusFilter]= useState('pending')
  const [search,      setSearch]      = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page,        setPage]        = useState(1)
  const [pages,       setPages]       = useState(1)
  const [total,       setTotal]       = useState(0)
  const [editModal,   setEditModal]   = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [toast,       setToast]       = useState(null)

  const LIMIT = 15

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: LIMIT }
      if (statusFilter !== 'all') params.status = statusFilter
      if (search) params.search = search
      const data = await api.getReviews(params)
      setReviews(data.reviews || [])
      setPages(data.pages || 1)
      setTotal(data.total || 0)
    } catch (e) {
      setToast({ message: e.message || 'Failed to load reviews', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search, page])

  useEffect(() => { load() }, [load])

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput.trim())
    setPage(1)
  }

  const handleUpdateReview = async (id, data) => {
    const updated = await api.updateReview(id, data)
    setReviews(prev => prev.map(r => r._id === id ? updated : r))
    setToast({ message: 'Review updated successfully', type: 'success' })
  }

  const handleApprove = async (review) => {
    try {
      const updated = await api.updateReview(review._id, { status: 'approved' })
      setReviews(prev => prev.map(r => r._id === review._id ? updated : r))
      setToast({ message: 'Review approved', type: 'success' })
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    }
  }

  const handleReject = async (review) => {
    try {
      const updated = await api.updateReview(review._id, { status: 'rejected' })
      setReviews(prev => prev.map(r => r._id === review._id ? updated : r))
      setToast({ message: 'Review rejected', type: 'success' })
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    }
  }

  const handleDelete = async (id) => {
    await api.deleteReview(id)
    setReviews(prev => prev.filter(r => r._id !== id))
    setTotal(t => t - 1)
    setToast({ message: 'Review deleted', type: 'success' })
  }

  const TAB_LABELS = [
    { key: 'all',      label: 'All' },
    { key: 'pending',  label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ]

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
            <p className="text-gray-500 text-sm mt-0.5">{total} review{total !== 1 ? 's' : ''} total</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row gap-4">
          {/* Status tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 flex-shrink-0">
            {TAB_LABELS.map(({ key, label }) => (
              <button key={key}
                onClick={() => { setStatusFilter(key); setPage(1) }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search by customer name…"
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <button type="submit"
              className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors">
              Search
            </button>
            {search && (
              <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50">
                <X size={14} />
              </button>
            )}
          </form>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="space-y-3 p-4">
              {[1,2,3,4].map(i => <div key={i} className="animate-pulse bg-gray-100 h-24 rounded-xl" />)}
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Star size={40} className="mx-auto mb-3 text-gray-200" />
              <p className="font-medium text-gray-500">No reviews found</p>
              <p className="text-sm mt-1">Try a different filter or search term</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {reviews.map(review => (
                <div key={review._id} className="p-5">
                  {/* Row 1: meta */}
                  <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
                        {(review.userName || review.user?.name || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {review.userName || review.user?.name || 'Anonymous'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs text-gray-400">
                          <Stars rating={review.rating} />
                          <span>·</span>
                          <span className="font-medium text-gray-600">{review.product?.name || 'Unknown product'}</span>
                          <span>·</span>
                          <time>{new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</time>
                          {review.order && (
                            <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                              Verified Purchase
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize shrink-0 ${STATUS_STYLES[review.status]}`}>
                      {review.status}
                    </span>
                  </div>

                  {/* Row 2: content */}
                  <div className="ml-11 mb-3">
                    {review.title && <p className="text-sm font-semibold text-gray-800 mb-0.5">{review.title}</p>}
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{review.text}</p>
                  </div>

                  {/* Row 3: actions */}
                  <div className="ml-11 flex gap-2 flex-wrap">
                    {review.status !== 'approved' && (
                      <button onClick={() => handleApprove(review)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-medium transition-colors">
                        <CheckCircle size={13} /> Approve
                      </button>
                    )}
                    {review.status !== 'rejected' && (
                      <button onClick={() => handleReject(review)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-medium transition-colors">
                        <XCircle size={13} /> Reject
                      </button>
                    )}
                    <button onClick={() => setEditModal(review)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg text-xs font-medium transition-colors">
                      <Edit2 size={13} /> Edit
                    </button>
                    <button onClick={() => setDeleteModal(review)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-medium transition-colors">
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft size={14} /> Prev
              </button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {editModal   && <EditModal   review={editModal}   onSave={handleUpdateReview} onClose={() => setEditModal(null)} />}
      {deleteModal && <DeleteModal review={deleteModal} onConfirm={handleDelete}   onClose={() => setDeleteModal(null)} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </AdminLayout>
  )
}
