import { useEffect, useState, useRef } from 'react'
import { Upload, Link as LinkIcon, AlertTriangle, CheckCircle } from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import { api } from '../api'
import { getImageUrl } from '../../utils/image'

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400'

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="mt-0.5 rounded border-gray-300 text-amber-500 focus:ring-amber-400" />
      <span>
        <span className="text-sm font-medium text-gray-800">{label}</span>
        {hint && <span className="block text-xs text-gray-500">{hint}</span>}
      </span>
    </label>
  )
}

export default function OfferBanner() {
  const [form, setForm]       = useState(null)
  const [saved, setSaved]     = useState(null)     // last saved offer (with live coupon info)
  const [file, setFile]       = useState(null)
  const [preview, setPreview] = useState('')
  const [removed, setRemoved] = useState(false)
  const [useUrl, setUseUrl]   = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [notice, setNotice]   = useState('')
  const fileRef               = useRef()

  const load = () =>
    api.getOffer()
      .then(o => {
        setSaved(o)
        setForm({ ...o, imageUrl: '' })
        setPreview(o.image ? getImageUrl(o.image, 1200) : '')
        setFile(null); setRemoved(false)
      })
      .catch(err => setError(err.message))

  useEffect(() => { load() }, [])

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setNotice('') }

  const onFile = e => {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { setError('Image must be 5 MB or smaller.'); return }
    setError(''); setFile(f); setPreview(URL.createObjectURL(f)); setRemoved(false); set('imageUrl', '')
  }

  const submit = async e => {
    e.preventDefault()
    setSaving(true); setError(''); setNotice('')
    try {
      const fd = new FormData()
      for (const k of ['badge', 'title', 'subtitle', 'couponCode', 'buttonText', 'link', 'align']) fd.append(k, form[k] ?? '')
      fd.append('isActive', String(!!form.isActive))
      fd.append('showInTopBar', String(!!form.showInTopBar))
      if (file) fd.append('image', file)
      else if (form.imageUrl?.trim()) fd.append('imageUrl', form.imageUrl.trim())
      else if (removed) fd.append('removeImage', 'true')
      await api.updateOffer(fd)
      await load()
      setNotice('Saved. The website updates within a minute.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!form) {
    return (
      <AdminLayout>
        {error
          ? <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>
          : <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" /></div>}
      </AdminLayout>
    )
  }

  // Preview uses the last saved coupon state (the server checks the coupon)
  const couponLabel = saved?.couponCode === form.couponCode ? saved?.coupon?.label : null
  const title = form.title || couponLabel || (form.couponCode ? `${form.couponCode} discount` : '')
  const hidden = !form.isActive || (saved?.couponProblem && saved?.couponCode === form.couponCode)

  return (
    <AdminLayout>
      <div className="space-y-5 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Offer Banner</h1>
          <p className="text-sm text-gray-500">The promotion strip in the middle of the home page, and the code in the top bar</p>
        </div>

        {saved?.couponProblem && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {saved.couponProblem}
          </div>
        )}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>}
        {notice && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg">
            <CheckCircle size={15} /> {notice}
          </div>
        )}

        {/* Live preview */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Preview {hidden && <span className="ml-1 normal-case text-red-500">— currently hidden on the website</span>}
          </p>
          <div className={`relative h-56 rounded-xl overflow-hidden bg-gradient-to-br from-[#1c1510] via-[#3b2a1a] to-[#8a6236] ${hidden ? 'opacity-50' : ''}`}>
            {preview && !removed && <img src={preview} alt="" className="w-full h-full object-cover" />}
            <div className={`absolute inset-0 ${form.align === 'center' ? 'bg-black/55' : 'bg-gradient-to-r from-black/80 via-black/55 to-transparent'}`} />
            <div className={`absolute inset-0 flex flex-col justify-center px-8 ${form.align === 'center' ? 'items-center text-center' : 'items-start'}`}>
              {form.badge && <p className="text-amber-400 tracking-[0.3em] text-[10px] uppercase mb-2">{form.badge}</p>}
              <p className="font-serif text-3xl text-white font-light mb-2 capitalize">{title || 'Your title'}</p>
              <p className="text-white/70 text-xs mb-4">
                {form.subtitle}{form.subtitle && form.couponCode ? ' · ' : ''}
                {form.couponCode && <>Use code <span className="text-amber-400 font-semibold">{form.couponCode}</span> at checkout</>}
              </p>
              {form.buttonText && <span className="bg-amber-600 text-white text-[10px] tracking-widest uppercase px-5 py-2">{form.buttonText}</span>}
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <Toggle checked={!!form.isActive} onChange={v => set('isActive', v)}
              label="Show the banner on the home page" />
            <Toggle checked={!!form.showInTopBar} onChange={v => set('showInTopBar', v)}
              label="Mention the coupon code in the top bar" hint="Only while the coupon works" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coupon code</label>
              <input value={form.couponCode} onChange={e => set('couponCode', e.target.value.toUpperCase())}
                placeholder="e.g. FIRST10 (leave empty for no code)" className={`${inputCls} uppercase`} />
              <p className="text-xs text-gray-400 mt-1">Must exist in Admin → Coupons. Its discount is shown automatically.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Small heading</label>
              <input value={form.badge} maxLength={40} onChange={e => set('badge', e.target.value)}
                placeholder="Limited Time Offer" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input value={form.title} maxLength={60} onChange={e => set('title', e.target.value)}
                placeholder={couponLabel ? `Leave empty to show “${couponLabel}”` : 'e.g. Festive Sale'} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Text under the title</label>
              <input value={form.subtitle} maxLength={140} onChange={e => set('subtitle', e.target.value)}
                placeholder="e.g. On your first order" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Button text</label>
              <input value={form.buttonText} maxLength={30} onChange={e => set('buttonText', e.target.value)}
                placeholder="Shop Now (leave empty for no button)" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Button link</label>
              <input value={form.link} onChange={e => set('link', e.target.value)}
                placeholder="/collections/rings" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Text position</label>
              <select value={form.align} onChange={e => set('align', e.target.value)} className={inputCls}>
                <option value="left">Left</option>
                <option value="center">Center</option>
              </select>
            </div>
          </div>

          {/* Background photo */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Background photo <span className="text-gray-400 font-normal">(optional)</span></label>
              <button type="button" onClick={() => setUseUrl(v => !v)} className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1">
                <LinkIcon size={12} /> {useUrl ? 'Upload file instead' : 'Paste URL instead'}
              </button>
            </div>
            {useUrl ? (
              <input type="url" value={form.imageUrl} onChange={e => { set('imageUrl', e.target.value); setPreview(e.target.value); setFile(null); setRemoved(false) }}
                placeholder="https://example.com/offer.jpg" className={inputCls} />
            ) : (
              <div onClick={() => fileRef.current.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-amber-400 transition-colors">
                <Upload size={22} className="mx-auto text-gray-400 mb-1" />
                <p className="text-sm text-gray-500">Click to upload a wide photo</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG or WebP · max 5 MB · landscape works best. Without a photo, a warm gold background is used.</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            {(saved?.image || file || form.imageUrl) && !removed && (
              <button type="button" onClick={() => { setRemoved(true); setFile(null); setPreview(''); set('imageUrl', '') }}
                className="mt-2 text-xs text-red-500 hover:underline">Remove photo</button>
            )}
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Offer Banner'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}
