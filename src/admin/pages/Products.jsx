import { useEffect, useState, useRef } from 'react'
import { Plus, Search, Edit2, Trash2, Eye, EyeOff, X, Upload, Link as LinkIcon, Film } from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import Pagination from '../components/Pagination'
import { api } from '../api'
import { getImageUrl, getVideoUrl } from '../../utils/image'

const CATEGORIES = ['rings', 'necklaces', 'earrings', 'bracelets', 'anklets']

const EMPTY = {
  name: '', price: '', originalPrice: '', description: '',
  category: 'rings', material: '', sizes: '', colors: '',
  stock: '', isNew: false, isBestseller: false, imageUrls: '', videoUrl: '',
}

// ─── Product Form Modal ───────────────────────────────────────────────────────
function ProductModal({ product, onClose, onSave }) {
  const [form, setForm] = useState(
    product
      ? {
          ...product,
          sizes: product.sizes?.join(', ') || '',
          colors: product.colors?.join(', ') || '',
          imageUrls: '',   // URL field always starts empty on edit
          videoUrl: '',
        }
      : EMPTY
  )
  const [files, setFiles]       = useState([])
  const [previews, setPreviews] = useState(
    // Fix: run existing image paths through getImageUrl so they display correctly
    product?.images?.map(img => getImageUrl(img)) || []
  )
  const [useUrl, setUseUrl]     = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const fileRef                 = useRef()

  // Optional product video
  const [videoFile, setVideoFile]       = useState(null)
  const [videoPreview, setVideoPreview] = useState(product?.video ? getVideoUrl(product.video) : '')
  const [useVideoUrl, setUseVideoUrl]   = useState(false)
  const [removeVideo, setRemoveVideo]   = useState(false)
  const videoRef                        = useRef()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const onVideoFile = e => {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 50 * 1024 * 1024) { setError('Video must be 50 MB or smaller.'); return }
    setError('')
    setVideoFile(f)
    setVideoPreview(URL.createObjectURL(f))
    setRemoveVideo(false)
    set('videoUrl', '')
  }

  // When files are picked, generate local preview URLs
  const onFiles = e => {
    const selected = Array.from(e.target.files)
    setFiles(selected)
    setPreviews(selected.map(f => URL.createObjectURL(f)))
    set('imageUrls', '')  // clear URL field if file chosen
  }

  // When URL textarea changes, update previews from the URLs
  const onUrlChange = e => {
    const val = e.target.value
    set('imageUrls', val)
    const urls = val.split('\n').map(s => s.trim()).filter(s => s.startsWith('http'))
    setPreviews(urls)
    setFiles([])
  }

  const submit = async e => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      // Send only the editable fields — stored images/video and database
      // fields are handled by the server (sending the images list as text
      // used to merge several images into one broken link on edit).
      const SKIP = ['images', 'video', '_id', '__v', 'createdAt', 'updatedAt', 'rating', 'reviews', 'isVisible']
      Object.entries(form).forEach(([k, v]) => { if (!SKIP.includes(k)) fd.append(k, String(v ?? '')) })
      files.forEach(f => fd.append('images', f))
      if (videoFile) fd.append('video', videoFile)
      else if (removeVideo) fd.append('removeVideo', 'true')
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">{product ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
              <input
                required value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. Gold Solitaire Ring"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
              <input
                required type="number" min="0" value={form.price} onChange={e => set('price', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Original Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Original Price (₹) <span className="text-gray-400 font-normal">for discount</span></label>
              <input
                type="number" min="0" value={form.originalPrice} onChange={e => set('originalPrice', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                required value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 capitalize"
              >
                {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>

            {/* Material */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
              <input
                value={form.material} onChange={e => set('material', e.target.value)}
                placeholder="e.g. 18K Gold Plated"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Sizes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sizes <span className="text-gray-400 font-normal">(comma separated)</span></label>
              <input
                value={form.sizes} onChange={e => set('sizes', e.target.value)}
                placeholder="5, 6, 7, One Size"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Colors */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Colors <span className="text-gray-400 font-normal">(comma separated)</span></label>
              <input
                value={form.colors} onChange={e => set('colors', e.target.value)}
                placeholder="Gold, Silver, Rose Gold"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Stock */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
              <input
                type="number" min="0" value={form.stock} onChange={e => set('stock', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea
                required rows={3} value={form.description} onChange={e => set('description', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              />
            </div>

            {/* Images — upload OR paste URLs */}
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Images</label>
                <button
                  type="button"
                  onClick={() => { setUseUrl(v => !v); setFiles([]); setPreviews([]); set('imageUrls', '') }}
                  className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
                >
                  <LinkIcon size={12} />
                  {useUrl ? 'Upload file instead' : 'Paste image URLs instead'}
                </button>
              </div>

              {useUrl ? (
                <div>
                  <textarea
                    rows={3}
                    value={form.imageUrls}
                    onChange={onUrlChange}
                    placeholder={"https://example.com/image1.jpg\nhttps://example.com/image2.jpg"}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none font-mono"
                  />
                  <p className="text-xs text-gray-400 mt-1">One URL per line. Images will preview below.</p>
                </div>
              ) : (
                <div
                  onClick={() => fileRef.current.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-amber-400 transition-colors"
                >
                  <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Click to upload images</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG or WebP · max 5 MB each · up to 6 images</p>
                  <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={onFiles} />
                </div>
              )}

              {/* Image previews */}
              {previews.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {previews.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`Preview ${i + 1}`}
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                      onError={e => { e.target.style.opacity = '0.3' }}
                    />
                  ))}
                </div>
              )}

              {/* Editing — remind admin current images are kept unless replaced */}
              {product && !files.length && !form.imageUrls && (
                <p className="text-xs text-gray-400 mt-2">
                  Existing images will be kept unless you upload new ones or paste new URLs.
                </p>
              )}
            </div>

            {/* Product video (optional) */}
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Product Video <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <button
                  type="button"
                  onClick={() => { setUseVideoUrl(v => !v); setVideoFile(null); set('videoUrl', '') }}
                  className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
                >
                  <LinkIcon size={12} />
                  {useVideoUrl ? 'Upload file instead' : 'Paste video URL instead'}
                </button>
              </div>

              {useVideoUrl ? (
                <input
                  type="url"
                  value={form.videoUrl}
                  onChange={e => { set('videoUrl', e.target.value); setVideoPreview(e.target.value); setRemoveVideo(false) }}
                  placeholder="https://res.cloudinary.com/.../product.mp4"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              ) : (
                <div
                  onClick={() => videoRef.current.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-amber-400 transition-colors"
                >
                  <Film size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Click to upload a video</p>
                  <p className="text-xs text-gray-400 mt-1">MP4, WebM or MOV · max 50 MB · shown in the product's photo gallery</p>
                </div>
              )}
              <input ref={videoRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={onVideoFile} />

              {videoPreview && !removeVideo && (
                <div className="mt-3 flex items-start gap-3">
                  <video src={videoPreview} className="w-32 h-24 object-cover rounded-lg border border-gray-200 bg-black" muted playsInline controls />
                  {(product?.video || videoFile || form.videoUrl) && (
                    <button
                      type="button"
                      onClick={() => { setRemoveVideo(true); setVideoFile(null); setVideoPreview(''); set('videoUrl', '') }}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Remove video
                    </button>
                  )}
                </div>
              )}
              {product?.video && removeVideo && (
                <p className="text-xs text-red-500 mt-2">The video will be removed when you save.</p>
              )}
            </div>

            {/* Flags */}
            <div className="col-span-2 flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form.isNew}
                  onChange={e => set('isNew', e.target.checked)}
                  className="rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                />
                <span className="text-sm text-gray-700">Mark as <strong>New</strong></span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form.isBestseller}
                  onChange={e => set('isBestseller', e.target.checked)}
                  className="rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                />
                <span className="text-sm text-gray-700">Mark as <strong>Bestseller</strong></span>
              </label>
            </div>
          </div>

          {/* Form actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60"
            >
              {saving ? 'Saving...' : product ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Products Page ────────────────────────────────────────────────────────────
export default function Products() {
  const [data, setData]       = useState({ products: [], total: 0, pages: 1, page: 1 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [category, setCategory] = useState('all')
  const [modal, setModal]     = useState(null)
  const [page, setPage]       = useState(1)

  const load = () => {
    setLoading(true)
    api.getProducts({ page, category, search })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page, category, search])

  const handleDelete = async id => {
    if (!confirm('Delete this product? This cannot be undone.')) return
    await api.deleteProduct(id)
    load()
  }

  const handleToggle = async id => {
    await api.toggleProduct(id)
    load()
  }

  const handleSave = async fd => {
    if (modal?._id) await api.updateProduct(modal._id, fd)
    else            await api.createProduct(fd)
    load()
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="text-sm text-gray-500">{data.total} products total</p>
          </div>
          <button
            onClick={() => setModal({})}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold"
          >
            <Plus size={16} /> Add Product
          </button>
        </div>

        {/* Search + category filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <select
            value={category}
            onChange={e => { setCategory(e.target.value); setPage(1) }}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 capitalize"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
            </div>
          ) : data.products.length === 0 ? (
            <p className="text-center text-gray-400 py-16 text-sm">No products found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Product</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Price</th>
                    <th className="px-4 py-3 text-left">Stock</th>
                    <th className="px-4 py-3 text-left">Visible</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.products.map(p => (
                    <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {/* Thumbnail — always use getImageUrl */}
                          {p.images?.[0] ? (
                            <img
                              src={getImageUrl(p.images[0], 120)}
                              loading="lazy" decoding="async"
                              alt={p.name}
                              className="w-10 h-10 rounded-lg object-cover border border-gray-100"
                              onError={e => { e.target.style.opacity = '0.3' }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">IMG</div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900 line-clamp-1">{p.name}</p>
                            <div className="flex gap-1 mt-0.5">
                              {p.isNew && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">New</span>}
                              {p.isBestseller && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Bestseller</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm capitalize text-gray-600">{p.category}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900">₹{p.price?.toLocaleString('en-IN')}</p>
                        {p.originalPrice > 0 && (
                          <p className="text-xs text-gray-400 line-through">₹{p.originalPrice?.toLocaleString('en-IN')}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.stock ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          p.isVisible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {p.isVisible ? 'Visible' : 'Hidden'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleToggle(p._id)}
                            title={p.isVisible ? 'Hide from store' : 'Show in store'}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                          >
                            {p.isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <button
                            onClick={() => setModal(p)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(p._id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
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

      {modal !== null && (
        <ProductModal
          product={modal?._id ? modal : null}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </AdminLayout>
  )
}
