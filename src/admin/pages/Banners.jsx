import { useEffect, useState, useRef } from 'react'
import { Plus, Trash2, Eye, EyeOff, X, Upload, Edit2, Link as LinkIcon } from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import { api } from '../api'
import { getImageUrl } from '../../utils/image'

// ─── Banner Form Modal ────────────────────────────────────────────────────────
function BannerModal({ banner, onClose, onSave }) {
  const [form, setForm] = useState(
    banner
      ? { title: '', subtitle: '', badge: '', cta: 'Shop Now', align: 'left', link: '/collections', order: 0, ...banner }
      : { title: '', subtitle: '', badge: '', cta: 'Shop Now', align: 'left', link: '/collections', order: 0 }
  )
  const [file, setFile]       = useState(null)
  const [preview, setPreview] = useState(banner?.image ? getImageUrl(banner.image) : '')
  const [useUrl, setUseUrl]   = useState(false)   // toggle: upload vs paste URL
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const fileRef               = useRef()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // When admin picks a file, show a local preview
  const onFile = e => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    set('imageUrl', '')   // clear any URL if file chosen
  }

  // When admin pastes a URL, show it as preview
  const onUrlChange = e => {
    const url = e.target.value
    set('imageUrl', url)
    setPreview(url)
    setFile(null)
  }

  const submit = async e => {
    e.preventDefault()
    const hasImage = file || form.imageUrl || banner?.image
    if (!hasImage) return setError('Please upload an image or paste an image URL.')

    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      // Append all form fields
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''))
      if (file) fd.append('image', file)
      await onSave(fd)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">{banner ? 'Edit Banner' : 'Add Banner'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>
          )}

          {/* Image input — file upload or URL */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Banner Image *</label>
              <button
                type="button"
                onClick={() => setUseUrl(v => !v)}
                className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
              >
                <LinkIcon size={12} />
                {useUrl ? 'Upload file instead' : 'Paste URL instead'}
              </button>
            </div>

            {useUrl ? (
              // URL input
              <input
                type="url"
                value={form.imageUrl || ''}
                onChange={onUrlChange}
                placeholder="https://example.com/banner.jpg"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            ) : (
              // File upload area
              <div
                onClick={() => fileRef.current.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:border-amber-400 transition-colors"
              >
                {preview ? (
                  <img src={preview} alt="Preview" className="w-full h-40 object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 gap-2">
                    <Upload size={24} className="text-gray-400" />
                    <p className="text-sm text-gray-500">Click to upload banner image</p>
                    <p className="text-xs text-gray-400">JPG, PNG or WebP · max 5 MB</p>
                  </div>
                )}
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

            {/* Show current image if editing */}
            {!useUrl && !file && banner?.image && (
              <p className="text-xs text-gray-400 mt-1">Current image kept unless you upload a new one.</p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              required
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Festive Collection"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Subtitle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
            <input
              value={form.subtitle}
              onChange={e => set('subtitle', e.target.value)}
              placeholder="e.g. Up to 50% off on all jewellery"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Badge (small tag above title) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Badge Text</label>
              <input
                value={form.badge}
                onChange={e => set('badge', e.target.value)}
                placeholder="e.g. New Collection 2025"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* CTA button text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
              <input
                value={form.cta}
                onChange={e => set('cta', e.target.value)}
                placeholder="Shop Now"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Text alignment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Text Position</label>
              <select
                value={form.align}
                onChange={e => set('align', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>

            {/* Display order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
              <input
                type="number"
                value={form.order}
                onChange={e => set('order', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          {/* Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Button Link</label>
            <input
              value={form.link}
              onChange={e => set('link', e.target.value)}
              placeholder="/collections/rings"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60"
            >
              {saving ? 'Saving...' : banner ? 'Update Banner' : 'Add Banner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Banners Page ─────────────────────────────────────────────────────────────
export default function Banners() {
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)   // null = closed, {} = new, banner obj = edit

  const load = () => {
    setLoading(true)
    api.getBanners()
      .then(setBanners)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async id => {
    if (!confirm('Delete this banner?')) return
    await api.deleteBanner(id)
    load()
  }

  const handleToggle = async id => {
    await api.toggleBanner(id)
    load()
  }

  const handleSave = async fd => {
    if (modal?._id) await api.updateBanner(modal._id, fd)
    else            await api.createBanner(fd)
    load()
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Banners</h1>
            <p className="text-sm text-gray-500">Manage homepage hero banners</p>
          </div>
          <button
            onClick={() => setModal({})}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold"
          >
            <Plus size={16} /> Add Banner
          </button>
        </div>

        {/* Tip */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <strong>Tip:</strong> Only <em>Active</em> banners are shown on the homepage. Use the Hide/Show button to control which banners appear.
        </div>

        {/* Banner list */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
          </div>
        ) : banners.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-gray-400 text-sm">No banners yet.</p>
            <button
              onClick={() => setModal({})}
              className="text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              + Add your first banner
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {banners.map(banner => (
              <div
                key={banner._id}
                className={`bg-white rounded-xl border overflow-hidden flex flex-col sm:flex-row ${
                  banner.isActive ? 'border-gray-100' : 'border-gray-100 opacity-60'
                }`}
              >
                {/* Thumbnail */}
                <div className="sm:w-48 h-32 sm:h-auto shrink-0 bg-gray-100">
                  {banner.image ? (
                    <img
                      src={getImageUrl(banner.image, 600)}
                      loading="lazy" decoding="async"
                      alt={banner.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No image</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {banner.badge && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium mb-1 inline-block">
                            {banner.badge}
                          </span>
                        )}
                        <h3 className="font-semibold text-gray-900">{banner.title}</h3>
                        {banner.subtitle && <p className="text-sm text-gray-500 mt-0.5">{banner.subtitle}</p>}
                      </div>
                      <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                        banner.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {banner.isActive ? 'Active' : 'Hidden'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Button: "{banner.cta || 'Shop Now'}" · Align: {banner.align || 'left'} · Link: {banner.link} · Order: {banner.order}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => handleToggle(banner._id)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
                    >
                      {banner.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                      {banner.isActive ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => setModal(banner)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-blue-50 text-blue-600"
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(banner._id)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-red-50 text-red-500"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal !== null && (
        <BannerModal
          banner={modal?._id ? modal : null}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </AdminLayout>
  )
}
