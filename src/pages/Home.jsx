import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Star, Shield, RefreshCw, Truck, Banknote } from 'lucide-react'
import Hero from '../components/Hero'
import Categories from '../components/Categories'
import ProductCard from '../components/ProductCard'
import useOfferCoupon from '../hooks/useOfferCoupon'

// API base URL from environment variable
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Static brand promise strip — no DB needed for these
const PROMISES = [
  { icon: Shield,    title: 'Fine Craftsmanship', desc: '18K gold-plated, tarnish-free' },
  { icon: Truck,     title: 'Free Shipping',       desc: 'On orders above ₹999' },
  { icon: RefreshCw, title: '30-Day Returns',      desc: 'Hassle-free exchange policy' },
  { icon: Banknote,  title: 'Cash on Delivery',    desc: 'Pay when your order arrives' },
]

// Skeleton placeholder while products load
function ProductSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-gray-200 aspect-[3/4] mb-3" />
          <div className="bg-gray-200 h-3 w-3/4 mb-2 rounded" />
          <div className="bg-gray-200 h-3 w-1/2 rounded" />
        </div>
      ))}
    </div>
  )
}

export default function Home() {
  const [bestsellers, setBestsellers] = useState([])
  const [newArrivals, setNewArrivals]  = useState([])
  const [loading, setLoading]          = useState(true)
  const [reviews, setReviews]          = useState([])   // real, admin-approved reviews
  const offer = useOfferCoupon()                         // live FIRST10 coupon, or null

  useEffect(() => {
    // Fetch bestsellers and new arrivals in parallel
    Promise.all([
      fetch(`${API}/products?visible=true&isBestseller=true&limit=4`).then(r => r.json()),
      fetch(`${API}/products?visible=true&isNew=true&limit=4`).then(r => r.json()),
    ])
      .then(([bsData, naData]) => {
        setBestsellers(bsData.products || [])
        setNewArrivals(naData.products || [])
      })
      .catch(err => console.error('Home fetch error:', err))
      .finally(() => setLoading(false))

    // Customer reviews approved in Admin → Reviews (4–5 stars, newest first)
    fetch(`${API}/reviews/featured?limit=6`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => setReviews(Array.isArray(data) ? data : []))
      .catch(() => setReviews([]))
  }, [])

  return (
    <main>
      {/* Hero banner slider — fetches from /api/banners/active */}
      <Hero />

      {/* Brand promise strip */}
      <div className="border-y border-gray-100 bg-white py-6 md:py-7 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-y-5 md:gap-y-0 md:divide-x md:divide-gray-100">
          {PROMISES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex flex-col items-center text-center gap-1.5 md:gap-2 px-2 md:px-4">
              <Icon size={20} className="text-gold-500" strokeWidth={1.5} />
              <p className="text-[11px] font-semibold text-gray-800 tracking-wide uppercase">{title}</p>
              <p className="text-[11px] text-gray-400">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Category grid — uses fixed category list */}
      <Categories />

      {/* Bestsellers section */}
      <section className="py-10 md:py-16 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-6 md:mb-10">
          <div>
            <p className="section-subtitle">Customer Favourites</p>
            <h2 className="section-title">Bestsellers</h2>
          </div>
          <Link
            to="/collections?filter=bestseller"
            className="hidden md:flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-gold-600 hover:text-gold-500 font-medium border-b border-transparent hover:border-gold-400 pb-0.5 transition-all"
          >
            View All →
          </Link>
        </div>

        {loading ? <ProductSkeleton /> : bestsellers.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No bestsellers yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
            {bestsellers.map(p => <ProductCard key={p._id} product={p} />)}
          </div>
        )}

        <div className="text-center mt-6 md:hidden">
          <Link to="/collections?filter=bestseller" className="btn-outline inline-block w-full sm:w-auto">View All Bestsellers</Link>
        </div>
      </section>

      {/* Mid-page promo banner — shown only while the offer coupon is active,
          and the discount text comes from the coupon itself */}
      {offer && (
      <section className="relative h-64 md:h-[420px] overflow-hidden bg-gray-900">
        <img
          src="https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1600&q=80"
          alt="Gold jewellery on display"
          loading="lazy" decoding="async"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/10 md:to-transparent" />
        <div className="absolute inset-0 flex flex-col items-start justify-center px-6 sm:px-12 md:px-24">
          <p className="text-gold-400 tracking-[0.3em] text-[10px] uppercase mb-3 md:mb-4">Limited Time Offer</p>
          <h2 className="font-serif text-4xl md:text-6xl text-white font-light mb-3 leading-tight capitalize">
            {offer.label}
          </h2>
          <p className="text-white/70 text-sm mb-6 md:mb-8 tracking-wide">
            {offer.description ? <>{offer.description} · </> : null}Use code <span className="text-gold-400 font-semibold">{offer.code}</span> at checkout
          </p>
          <Link to="/collections" className="btn-gold">Shop Now</Link>
        </div>
      </section>
      )}

      {/* New Arrivals section */}
      <section className="py-10 md:py-16 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-6 md:mb-10">
          <div>
            <p className="section-subtitle">Just Dropped</p>
            <h2 className="section-title">New Arrivals</h2>
          </div>
          <Link
            to="/collections?filter=new"
            className="hidden md:flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-gold-600 hover:text-gold-500 font-medium border-b border-transparent hover:border-gold-400 pb-0.5 transition-all"
          >
            View All →
          </Link>
        </div>

        {loading ? <ProductSkeleton /> : newArrivals.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No new arrivals yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
            {newArrivals.map(p => <ProductCard key={p._id} product={p} />)}
          </div>
        )}

        <div className="text-center mt-6 md:hidden">
          <Link to="/collections?filter=new" className="btn-outline inline-block w-full sm:w-auto">View All New Arrivals</Link>
        </div>
      </section>

      {/* Testimonials — real customer reviews; hidden until at least one is approved */}
      {reviews.length > 0 && (
        <section className="py-14 md:py-20 bg-[#0E0E0E] px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8 md:mb-12">
              <p className="text-[10px] text-gold-500 tracking-[0.3em] uppercase mb-3">Reviews</p>
              <h2 className="font-serif text-[2rem] leading-tight sm:text-4xl md:text-5xl text-white font-light tracking-wide">
                What Our Customers Say
              </h2>
            </div>
            <div className={`grid grid-cols-1 gap-4 md:gap-6 ${reviews.length === 1 ? 'max-w-xl mx-auto' : reviews.length === 2 ? 'md:grid-cols-2 max-w-4xl mx-auto' : 'md:grid-cols-3'}`}>
              {reviews.map(review => (
                <div key={review._id} className="border border-white/10 bg-white/5 p-5 md:p-7 flex flex-col">
                  <div className="flex gap-0.5 mb-4" aria-label={`${review.rating} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star key={n} size={13} className={n <= review.rating ? 'fill-gold-400 text-gold-400' : 'text-white/20'} />
                    ))}
                  </div>
                  {review.title && <p className="text-sm text-white font-medium mb-2">{review.title}</p>}
                  <p className="text-sm text-gray-400 leading-relaxed mb-5 font-light italic flex-1">"{review.text}"</p>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-[11px] font-semibold text-white tracking-widest uppercase">
                      — {review.name}
                      {review.verified && <span className="ml-2 normal-case tracking-normal font-normal text-gold-400">· Verified buyer</span>}
                    </p>
                    {review.product && (
                      <Link to={`/product/${review.product._id}`} className="text-[11px] text-gray-500 hover:text-gold-400 transition-colors truncate max-w-[60%]">
                        {review.product.name}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
