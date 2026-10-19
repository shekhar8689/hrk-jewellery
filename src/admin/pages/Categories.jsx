import { useEffect, useState, useRef } from 'react'
import { Eye, EyeOff, X, Upload, Edit2, Link as LinkIcon } from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import { api } from '../api'
import { getImageUrl } from '../../utils/image'

// ─── Edit Category Modal ──────────────────────────────────────────────────────
function CategoryModal({ category, onClose, onSave }) {
  const [form, setForm]       = useState({ label: category.label, order: category.order, imageUrl: '' })
  const [file, setFile]       = useState(null)
  const [preview, setPreview] = useState(category.poster ? getImageUrl(category.poster, 600) : '')
  const [removed, setRemoved] = useState(false)
  const [useUrl, setUseUrl]   = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const fileRef               = useRef()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const onFile = e => {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { setError('Image must be 5 MB or smaller.'); return }
    setError('')
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setRemoved(false)
    set('imageUrl', '')
  }

  const onUrlChange = e => {
    set('imageUrl', e.target.value)
    setPreview(e.target.value)
    setFile(null)
    setRemoved(false)
  }

  const removePoster = () => {
    setRemoved(true)
    setFile(null)
    setPreview('')
    set('imageUrl', '')
  }

  const submit = async e => {
    e.preventDefault()
    if (String(form.label).trim().length < 2) return setError('Name must be at least 2 characters.')
    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('label', form.label)
      fd.append('order', form.order)
      if (file) fd.append('image', file)
      else if (form.imageUrl.trim()) fd.append('imageUrl', form.imageUrl.trim())
      else if (removed) fd.append('removeImage', 'true')
      await onSave(category.slug, fd)
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Edit {category.label}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>
          )}

          {/* Poster */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Poster Image</label>
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
              <input
                type="url"
                value={form.imageUrl}
                onChange={onUrlChange}
                placeholder="https://example.com/rings-poster.jpg"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            ) : (
              <div
                onClick={() => fileRef.current.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:border-amber-400 transition-colors"
              >
                {preview ? (
                  <img src={preview} alt="Poster preview" className="w-full h-56 object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-56 gap-2 px-4 text-center">
                    <Upload size={24} className="text-gray-400" />
                    <p className="text-sm text-gray-500">Click to upload a poster</p>
                    <p className="text-xs text-gray-400">JPG, PNG or WebP · max 5 MB · portrait (3:4) works best</p>
                  </div>
                )}
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

            <div className="flex items-center justify-between mt-2 gap-3">
              <p className="text-xs text-gray-400">
                Without a poster, the newest photo of a product in this category is shown.
              </p>
              {(category.poster || file || form.imageUrl) && !removed && (
                <button type="button" onClick={removePoster} className="shrink-0 text-xs text-red-500 hover:underline">
                  Remove poster
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name on tile *</label>
              <input
                required
                maxLength={40}
                value={form.label}
                onChange={e => set('label', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
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
          <p className="text-xs text-gray-400 -mt-2">
            The tile still opens the <strong>{category.slug}</strong> collection. Lower order numbers show first.
          </p>

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
              {saving ? 'Saving...' : 'Save Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Categories Page ──────────────────────────────────────────────────────────
export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [editing, setEditing]       = useState(null)

  const load = () => {
    setLoading(true)
    api.getCategories()
      .then(data => { setCategories(data); setError('') })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleToggle = async slug => {
    try { await api.toggleCategory(slug); load() }
    catch (err) { setError(err.message) }
  }

  const handleSave = async (slug, fd) => {
    await api.updateCategory(slug, fd)
    load()
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500">Posters for the "Shop by Category" section on the home page</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <strong>Tip:</strong> Upload a poster for each category, or leave it empty to show the newest product photo from that
          category. Use Hide/Show to choose which tiles appear. Changes can take up to a minute to show on the website.
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {categories.map(cat => (
              <div
                key={cat.slug}
                className={`bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col ${cat.isActive ? '' : 'opacity-60'}`}
              >
                <div className="relative aspect-[3/4] bg-gradient-to-br from-[#efe2d2] via-[#d9b996] to-[#a9794f]">
                  {cat.image && (
                    <img
                      src={getImageUrl(cat.image, 500)}
                      alt={cat.label}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={e => { e.currentTarget.style.display = 'none' }}
                    />
                  )}
                  <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                    cat.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {cat.isActive ? 'Showing' : 'Hidden'}
                  </span>
                  {cat.imageSource !== 'poster' && (
                    <span className="absolute bottom-2 left-2 right-2 text-[11px] bg-black/60 text-white px-2 py-1 rounded-md text-center">
                      {cat.imageSource === 'product' ? 'No poster — using a product photo' : 'No poster or product photo yet'}
                    </span>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-semibold text-gray-900">{cat.label}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">/{cat.slug} · Order {cat.order}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => handleToggle(cat.slug)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
                    >
                      {cat.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                      {cat.isActive ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => setEditing(cat)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-blue-50 text-blue-600"
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <CategoryModal category={editing} onClose={() => setEditing(null)} onSave={handleSave} />
      )}
    </AdminLayout>
  )
}
