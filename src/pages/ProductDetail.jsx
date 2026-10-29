import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Star, Heart, ShoppingBag, Shield, RefreshCw, Truck,
  ChevronDown, ChevronUp, AlertTriangle, Send, Trash2, User,
  CheckCircle, Share2,
  Play,
} from 'lucide-react'
import ProductCard from '../components/ProductCard'
import Toast from '../components/Toast'
import { useCart } from '../context/CartContext'
import { useUserAuth } from '../context/UserAuthContext'
import { useWishlist } from '../context/WishlistContext'
import { getImageUrl, getVideoUrl, getVideoPoster } from '../utils/image'
import { autoPick, missingChoice } from '../utils/options'
import { RETURN_REPORT_WINDOW } from '../config/policy'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ── Interactive 5-star picker ─────────────────────────────────────────────────
function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onTouchStart={() => setHovered(n)}
          onTouchEnd={() => { onChange(n); setHovered(0) }}
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
          aria-label={`${n} star${n !== 1 ? 's' : ''}`}
          aria-pressed={value === n}
        >
          <Star
            size={28}
            className={`transition-colors ${
              n <= (hovered || value)
                ? 'fill-amber-400 text-amber-400'
                : 'text-gray-300 hover:text-amber-200'
            }`}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 text-sm text-gray-500 self-center">
          {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][value]}
        </span>
      )}
    </div>
  )
}

// ── Static star display ───────────────────────────────────────────────────────
function Stars({ rating, size = 14 }) {
  const full  = Math.floor(rating)
  const half  = rating - full >= 0.5
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          size={size}
          className={n <= full ? 'fill-amber-400 text-amber-400' : n === full + 1 && half ? 'fill-amber-200 text-amber-400' : 'text-gray-200'}
        />
      ))}
    </div>
  )
}

// ── Rating breakdown bar chart ────────────────────────────────────────────────
function RatingSummary({ reviews }) {
  if (reviews.length === 0) return null
  const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
  const breakdown = [5, 4, 3, 2, 1].map(star => {
    const count = reviews.filter(r => r.rating === star).length
    return { star, count, pct: Math.round((count / reviews.length) * 100) }
  })
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row gap-5 items-center">
      <div className="text-center shrink-0">
        <p className="text-5xl font-bold text-gray-900">{avg}</p>
        <Stars rating={Number(avg)} size={18} />
        <p className="text-xs text-gray-400 mt-1.5">
          {reviews.length} review{reviews.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="flex-1 w-full space-y-2">
        {breakdown.map(({ star, count, pct }) => (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="w-3 text-gray-500 shrink-0">{star}</span>
            <Star size={10} className="fill-amber-400 text-amber-400 shrink-0" />
            <div className="flex-1 bg-gray-100 rounded-full h-2">
              <div
                className="bg-amber-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-5 text-right text-gray-400 shrink-0">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Reviews Section ───────────────────────────────────────────────────────────
function ReviewsSection({ productId }) {
  const { user, getToken } = useUserAuth()
  const adminToken = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null

  const [reviews,    setReviews]    = useState([])
  const [loadingR,   setLoadingR]   = useState(true)
  const [canReview,  setCanReview]  = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [orderId,    setOrderId]    = useState(null)
  const [submitted,  setSubmitted]  = useState(false)
  const [toast,      setToast]      = useState(null)

  const [rating,     setRating]     = useState(0)
  const [title,      setTitle]      = useState('')
  const [text,       setText]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError,  setFormError]  = useState('')

  // Fetch approved reviews
  useEffect(() => {
    setLoadingR(true)
    fetch(`${API}/reviews/${productId}`)
      .then(r => r.json())
      .then(data => setReviews(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingR(false))
  }, [productId])

  // Check if logged-in user can review
  useEffect(() => {
    if (!user) return
    const token = getToken()
    if (!token) return
    fetch(`${API}/reviews/${productId}/can`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.canReview) {
          setCanReview(true)
          setIsVerified(!!data.isVerifiedPurchase)
          setOrderId(data.orderId || null)
        }
      })
      .catch(() => {})
  }, [productId, user, getToken])

  const submitReview = async (e) => {
    e.preventDefault()
    setFormError('')
    if (rating === 0) { setFormError('Please select a star rating'); return }
    if (text.trim().length < 10) { setFormError('Review must be at least 10 characters'); return }

    setSubmitting(true)
    try {
      const res = await fetch(`${API}/reviews`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          productId,
          orderId: isVerified ? orderId : undefined,
          rating,
          title: title.trim(),
          text:  text.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Could not submit review')
      setCanReview(false)
      setSubmitted(true)
      setRating(0); setTitle(''); setText('')
      setToast({ message: 'Review submitted — it will appear after approval. Thank you!', type: 'success' })
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const deleteReview = async (reviewId) => {
    if (!window.confirm('Delete this review permanently?')) return
    try {
      const res = await fetch(`${API}/reviews/${reviewId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` },
      })
      if (!res.ok) throw new Error()
      setReviews(prev => prev.filter(r => r._id !== reviewId))
      setToast({ message: 'Review deleted', type: 'success' })
    } catch {
      setToast({ message: 'Could not delete review', type: 'error' })
    }
  }

  return (
    <section className="mt-16" aria-label="Customer reviews">
      <h2 className="font-serif text-2xl text-gray-800 mb-6">
        Customer Reviews
        {reviews.length > 0 && (
          <span className="text-base font-sans font-normal text-gray-400 ml-2">({reviews.length})</span>
        )}
      </h2>

      {/* Rating summary */}
      {!loadingR && <RatingSummary reviews={reviews} />}

      {/* Pending-approval notice after submit */}
      {submitted && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle size={16} className="shrink-0" />
          Your review has been submitted and is pending approval. Thank you!
        </div>
      )}

      {/* Write a review form */}
      {user && canReview && !submitted && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-1 text-sm">Write a Review</h3>
          {isVerified && (
            <p className="text-xs text-green-600 mb-4 flex items-center gap-1">
              <CheckCircle size={12} />
              Verified purchase — your review will display a verified badge
            </p>
          )}
          <form onSubmit={submitReview} noValidate>
            <div className="mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Your Rating *</p>
              <StarPicker value={rating} onChange={v => { setRating(v); setFormError('') }} />
            </div>
            <div className="mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                Review Title <span className="normal-case text-gray-400">(optional)</span>
              </p>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value.slice(0, 100))}
                placeholder="Summarise your experience…"
                className="w-full border border-amber-200 bg-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div className="mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                Your Review * <span className="normal-case text-gray-400">({text.length}/500)</span>
              </p>
              <textarea
                rows={4}
                value={text}
                onChange={e => { setText(e.target.value.slice(0, 500)); setFormError('') }}
                placeholder="Share details about the product quality, fit, and your overall experience (min 10 characters)…"
                className="w-full border border-amber-200 bg-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              />
            </div>
            {formError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded-xl mb-3">
                <AlertTriangle size={14} /> {formError}
              </div>
            )}
            <button type="submit" disabled={submitting}
              className="flex items-center gap-2 btn-gold text-xs disabled:opacity-60">
              <Send size={13} />
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
          </form>
        </div>
      )}

      {/* Sign-in prompt for guests */}
      {!user && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-8 text-sm text-gray-600 flex items-center gap-3">
          <User size={18} className="text-gray-400 shrink-0" />
          <span>
            <Link to="/login" className="text-amber-600 font-medium hover:underline">Sign in</Link>
            {' '}to leave a review for this product.
          </span>
        </div>
      )}

      {/* Reviews list */}
      {loadingR ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse rounded-2xl bg-gray-100 h-28" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <Star size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm font-medium text-gray-500">No reviews yet</p>
          <p className="text-xs mt-1">Be the first to share your experience!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <article key={review._id} className="bg-white border border-gray-100 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
                    {(review.userName || review.user?.name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {review.userName || review.user?.name || 'Anonymous'}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <time className="text-xs text-gray-400">
                        {new Date(review.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </time>
                      {review.order && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                          <CheckCircle size={9} /> Verified Purchase
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Stars rating={review.rating} />
                  {adminToken && (
                    <button onClick={() => deleteReview(review._id)}
                      title="Delete review (admin)"
                      className="text-gray-300 hover:text-red-500 transition-colors ml-1">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              {review.title && (
                <p className="text-sm font-semibold text-gray-800 mb-1">{review.title}</p>
              )}
              <p className="text-sm text-gray-600 leading-relaxed">{review.text}</p>
            </article>
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </section>
  )
}

// ── Product Detail Page ───────────────────────────────────────────────────────
export default function ProductDetail({ onCartOpen }) {
  const { id } = useParams()
  const { dispatch } = useCart()
  const { isInWishlist, toggleWishlist } = useWishlist()

  const [product, setProduct]         = useState(null)
  const [related, setRelated]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [notFound, setNotFound]       = useState(false)
  const [imgIdx, setImgIdx]           = useState(0)
  const [selectedSize, setSize]       = useState('')
  const [selectedColor, setColor]     = useState('')
  const [qty, setQty]                 = useState(1)
  const [openAccordion, setAccordion] = useState('description')
  const [added, setAdded]             = useState(false)
  const [copied, setCopied]           = useState(false)
  const [toast, setToast]             = useState(null)
  const [showStickyBar, setShowStickyBar] = useState(false)
  const addBtnRef = useRef(null)

  // Phones: show a bottom "Add to Bag" bar once the main button scrolls out of view
  useEffect(() => {
    const el = addBtnRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [product, loading])

  useEffect(() => {
    setLoading(true); setNotFound(false); setImgIdx(0); setQty(1)
    fetch(`${API}/products/${id}`)
      .then(r => { if (!r.ok) { setNotFound(true); return null } return r.json() })
      .then(data => {
        if (!data) return
        setProduct(data)
        // Pre-select only when there is a single option; otherwise the customer chooses
        setSize(autoPick(data.sizes))
        setColor(autoPick(data.colors))
        fetch(`${API}/products?visible=true&category=${data.category}&limit=5`)
          .then(r => r.json())
          .then(rel => setRelated((rel.products || []).filter(p => p._id !== id).slice(0, 4)))
          .catch(() => {})
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  // Dynamic page title
  useEffect(() => {
    if (product) document.title = `${product.name} — HRK Jewellery`
    return () => { document.title = 'HRK Jewellery' }
  }, [product])

  const wished      = product ? isInWishlist(product._id) : false
  const outOfStock  = product && product.stock === 0
  const lowStock    = product && product.stock > 0 && product.stock <= 5

  const [choiceError, setChoiceError] = useState('')
  const handleAdd = () => {
    if (outOfStock) return
    const missing = missingChoice(product, selectedSize, selectedColor)
    if (missing) {
      setChoiceError(`Please choose a ${missing}`)
      document.getElementById('product-options')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setChoiceError('')
    dispatch({
      type: 'ADD_ITEM',
      item: { ...product, id: product._id, stock: product.stock, selectedSize, selectedColor, qty },
    })
    setAdded(true)
    setTimeout(() => { setAdded(false); onCartOpen?.() }, 800)
  }

  const handleWishlist = () => {
    if (!product) return
    toggleWishlist(product)
    setToast({
      message: wished ? 'Removed from wishlist' : 'Added to wishlist',
      type: 'success',
    })
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: product?.name, url }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(url).catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="animate-pulse bg-gray-200 aspect-[3/4] rounded-lg" />
          <div className="space-y-4 pt-4">
            <div className="animate-pulse bg-gray-200 h-7 w-2/3 rounded" />
            <div className="animate-pulse bg-gray-200 h-4 w-1/3 rounded" />
            <div className="animate-pulse bg-gray-200 h-8 w-1/4 rounded" />
            <div className="animate-pulse bg-gray-200 h-4 w-full rounded" />
            <div className="animate-pulse bg-gray-200 h-4 w-5/6 rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4">
        <p className="text-gray-500 text-lg">Product not found.</p>
        <Link to="/collections" className="btn-gold">Back to Collections</Link>
      </div>
    )
  }

  const discount = product.originalPrice > 0
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0

  const accordionItems = [
    { key: 'description', title: 'Description',       content: product.description },
    { key: 'details',     title: 'Product Details',   content: `Material: ${product.material || 'N/A'}\nFinish: Polished\nCare: Wipe with a soft cloth, avoid water & chemicals` },
    { key: 'shipping',    title: 'Shipping & Returns', content: `Free shipping on orders above ₹999. Delivered in 3–5 business days. Damaged or wrong item? Tell us within ${RETURN_REPORT_WINDOW} of delivery for a replacement or refund.` },
  ]

  const images = product.images || []
  // Gallery = photos, then the product video (if any) as the last item
  const media = [
    ...images.map(src => ({ type: 'image', src })),
    ...(product.video ? [{ type: 'video', src: product.video }] : []),
  ]
  const shown = media[imgIdx] || media[0]

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-24 md:py-10">
      {/* Breadcrumb */}
      <nav className="text-xs text-gray-400 mb-4 md:mb-6 flex gap-2 min-w-0" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-gold-500">Home</Link>
        <span>/</span>
        <Link to={`/collections/${product.category}`} className="hover:text-gold-500 capitalize">{product.category}</Link>
        <span>/</span>
        <span className="text-gray-700 truncate">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 lg:gap-16">
        {/* Image gallery — thumbnails below on phones, beside on larger screens */}
        <div className="flex flex-col-reverse md:flex-row gap-3 -mx-4 sm:mx-0">
          {media.length > 1 && (
            <div className="flex md:flex-col gap-2 px-4 sm:px-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {media.map((m, i) => (
                <button key={i} onClick={() => setImgIdx(i)}
                  aria-label={m.type === 'video' ? 'Play product video' : `Show photo ${i + 1}`}
                  className={`relative shrink-0 w-16 h-20 overflow-hidden border-2 transition-colors bg-gray-900 ${i === imgIdx ? 'border-gold-500' : 'border-transparent hover:border-gray-200'}`}>
                  {m.type === 'video' ? (
                    <>
                      {(getVideoPoster(m.src, 160) || images[0]) && (
                        <img src={getVideoPoster(m.src, 160) || getImageUrl(images[0], 160)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover opacity-80" />
                      )}
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow">
                          <Play size={13} className="text-gray-900 ml-0.5" fill="currentColor" />
                        </span>
                      </span>
                    </>
                  ) : (
                    <img src={getImageUrl(m.src, 160)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
          <div className="flex-1 aspect-[3/4] overflow-hidden bg-gray-50 relative group">
            {shown?.type === 'video' ? (
              <video
                key={shown.src}
                src={getVideoUrl(shown.src)}
                poster={getVideoPoster(shown.src, 1200) || (images[0] ? getImageUrl(images[0], 1200) : undefined)}
                className={`w-full h-full object-cover bg-black ${outOfStock ? 'opacity-50' : ''}`}
                autoPlay muted loop playsInline controls
                aria-label={`${product.name} video`}
              />
            ) : shown ? (
              <img src={getImageUrl(shown.src, 1200)} alt={product.name} fetchpriority="high"
                className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${outOfStock ? 'opacity-50' : ''}`} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">No image</div>
            )}
            {outOfStock && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-gray-900/80 text-white text-sm font-semibold px-6 py-2 tracking-widest uppercase">Out of Stock</span>
              </div>
            )}
          </div>
        </div>

        {/* Product details */}
        <div>
          <div className="flex gap-2 mb-3 flex-wrap">
            {product.isBestseller && <span className="text-[10px] bg-gray-900 text-white px-3 py-1 tracking-widest uppercase">Bestseller</span>}
            {product.isNew       && <span className="text-[10px] bg-gold-500 text-white px-3 py-1 tracking-widest uppercase">New</span>}
            {outOfStock          && <span className="text-[10px] bg-red-500 text-white px-3 py-1 tracking-widest uppercase">Out of Stock</span>}
          </div>

          <h1 className="font-serif text-[1.65rem] leading-tight md:text-3xl text-gray-800 mb-1">{product.name}</h1>
          {product.material && <p className="text-xs text-gold-600 uppercase tracking-widest mb-4">{product.material}</p>}

          {/* Rating summary */}
          {product.reviews > 0 && (
            <div className="flex items-center gap-2 mb-5">
              <Stars rating={product.rating || 0} />
              <a href="#reviews" className="text-sm text-amber-600 hover:underline">
                {product.rating} ({product.reviews} review{product.reviews !== 1 ? 's' : ''})
              </a>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-3 mb-5">
            <span className="text-2xl font-semibold text-gray-800">₹{product.price?.toLocaleString('en-IN')}</span>
            {product.originalPrice > 0 && (
              <>
                <span className="text-base text-gray-400 line-through">₹{product.originalPrice?.toLocaleString('en-IN')}</span>
                {discount > 0 && <span className="text-sm text-red-500 font-medium">{discount}% off</span>}
              </>
            )}
          </div>

          {/* Stock indicator */}
          {outOfStock ? (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-5">
              <AlertTriangle size={15} /> <span className="font-medium">Currently out of stock</span>
            </div>
          ) : lowStock ? (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg mb-5">
              <AlertTriangle size={15} /> <span className="font-medium">Only {product.stock} left — order soon!</span>
            </div>
          ) : null}

          <div id="product-options" className="scroll-mt-24">
          {choiceError && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{choiceError}</p>}
          {/* Color selector */}
          {(product.colors || []).length > 0 && (
            <div className="mb-5">
              <p className="text-xs uppercase tracking-widest text-gray-600 mb-2">
                Colour: <span className="text-gray-800 font-medium">{selectedColor || <span className="text-gray-400 normal-case tracking-normal">choose one</span>}</span>
              </p>
              <div className="flex gap-2 flex-wrap">
                {product.colors.map(c => (
                  <button key={c} type="button" aria-pressed={selectedColor === c} onClick={() => { setColor(c); setChoiceError('') }}
                    className={`px-4 py-2 text-xs border transition-colors ${selectedColor === c ? 'border-gold-500 bg-gold-50 text-gold-700' : 'border-gray-300 text-gray-600 hover:border-gold-400'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size selector */}
          {(product.sizes || []).length > 0 && product.sizes[0] !== 'One Size' && (
            <div className="mb-5">
              <p className="text-xs uppercase tracking-widest text-gray-600 mb-2">
                Size: <span className="text-gray-800 font-medium">{selectedSize || <span className="text-gray-400 normal-case tracking-normal">choose one</span>}</span>
              </p>
              <div className="flex gap-2 flex-wrap">
                {product.sizes.map(s => (
                  <button key={s} type="button" aria-pressed={selectedSize === s} onClick={() => { setSize(s); setChoiceError('') }}
                    className={`w-10 h-10 text-sm border transition-colors ${selectedSize === s ? 'border-gold-500 bg-gold-500 text-white' : 'border-gray-300 text-gray-600 hover:border-gold-400'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          </div>

          {/* Qty + Add to bag */}
          <div ref={addBtnRef} className="flex gap-3 mb-4">
            <div className={`flex items-center border border-gray-300 ${outOfStock ? 'opacity-40' : ''}`}>
              <button aria-label="Decrease quantity" className="w-11 h-12 hover:bg-gray-50 disabled:cursor-not-allowed"
                onClick={() => setQty(q => Math.max(1, q - 1))} disabled={outOfStock}>−</button>
              <span className="w-8 text-center text-sm">{qty}</span>
              <button aria-label="Increase quantity" className="w-11 h-12 hover:bg-gray-50 disabled:cursor-not-allowed"
                onClick={() => setQty(q => Math.min(q + 1, product.stock))}
                disabled={outOfStock || qty >= product.stock}>+</button>
            </div>
            <button onClick={handleAdd} disabled={outOfStock}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 text-sm tracking-wider sm:tracking-widest uppercase font-medium transition-colors ${
                outOfStock ? 'bg-gray-200 text-gray-400 cursor-not-allowed' :
                added      ? 'bg-green-600 text-white' : 'btn-gold'}`}>
              <ShoppingBag size={16} />
              {outOfStock ? 'Out of Stock' : added ? 'Added to Bag!' : 'Add to Bag'}
            </button>
          </div>

          {/* Wishlist + Share row */}
          <div className="flex gap-3 mb-6">
            <button onClick={handleWishlist}
              className={`flex-1 flex items-center justify-center gap-2 py-3 md:py-2.5 text-sm border rounded-xl transition-colors ${
                wished ? 'border-red-300 bg-red-50 text-red-600' : 'border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500'}`}
              aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}>
              <Heart size={16} className={wished ? 'fill-red-500' : ''} />
              {wished ? 'Wishlisted' : 'Add to Wishlist'}
            </button>
            <button onClick={handleShare}
              className="flex items-center gap-2 px-4 py-3 md:py-2.5 text-sm border border-gray-200 rounded-xl text-gray-500 hover:border-gray-300 transition-colors"
              aria-label="Share product">
              <Share2 size={15} />
              {copied ? 'Copied!' : 'Share'}
            </button>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 py-5 border-y border-gray-100 mb-6">
            {[
              { icon: Shield,    text: 'Secure Payment' },
              { icon: Truck,     text: 'Free Shipping' },
              { icon: RefreshCw, text: 'Damage Protection' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex flex-col items-center gap-1 text-center">
                <Icon size={18} className="text-gold-500" />
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">{text}</span>
              </div>
            ))}
          </div>

          {/* Accordion */}
          <div className="space-y-1">
            {accordionItems.map(item => (
              <div key={item.key} className="border-b border-gray-100">
                <button
                  onClick={() => setAccordion(k => k === item.key ? '' : item.key)}
                  className="flex justify-between items-center w-full py-4 text-sm font-medium text-gray-700 hover:text-gold-600"
                  aria-expanded={openAccordion === item.key}>
                  {item.title}
                  {openAccordion === item.key ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {openAccordion === item.key && (
                  <p className="text-sm text-gray-500 pb-4 leading-relaxed whitespace-pre-line">{item.content}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews section */}
      <div id="reviews">
        <ReviewsSection productId={id} />
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-12 md:mt-20">
          <div className="text-center mb-6 md:mb-8">
            <p className="section-subtitle">You May Also Like</p>
            <h2 className="section-title">Related Products</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {related.map(p => <ProductCard key={p._id} product={p} />)}
          </div>
        </section>
      )}

      {/* Phones: sticky Add to Bag bar */}
      <div
        className={`md:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3 transition-transform duration-300 ${
          showStickyBar ? 'translate-y-0' : 'translate-y-full'
        }`}
        aria-hidden={!showStickyBar}
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500 truncate">{product.name}{selectedSize ? ` · Size ${selectedSize}` : ''}</p>
          <p className="text-base font-semibold text-gray-900">₹{product.price?.toLocaleString('en-IN')}</p>
        </div>
        <button onClick={handleAdd} disabled={outOfStock} tabIndex={showStickyBar ? 0 : -1}
          className={`shrink-0 flex items-center gap-2 px-5 h-12 text-xs tracking-widest uppercase font-semibold transition-colors ${
            outOfStock ? 'bg-gray-200 text-gray-400' : added ? 'bg-green-600 text-white' : 'bg-gold-500 text-white active:bg-gold-600'}`}>
          <ShoppingBag size={15} />
          {outOfStock ? 'Out of Stock' : added ? 'Added!' : 'Add to Bag'}
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </main>
  )
}
