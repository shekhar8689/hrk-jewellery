import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Star, Shield, RefreshCw, Truck, Award } from 'lucide-react'
import Hero from '../components/Hero'
import Categories from '../components/Categories'
import ProductCard from '../components/ProductCard'

// API base URL from environment variable
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Static brand promise strip — no DB needed for these
const PROMISES = [
  { icon: Shield,    title: 'Fine Craftsmanship', desc: '18K gold-plated, tarnish-free' },
  { icon: Truck,     title: 'Free Shipping',       desc: 'On orders above ₹999' },
  { icon: RefreshCw, title: '30-Day Returns',      desc: 'Hassle-free exchange policy' },
  { icon: Award,     title: '4.8★ Rated',          desc: 'Loved by 2 lakh+ customers' },
]

// Static testimonials — no DB needed
const REVIEWS = [
  { name: 'Priya S.',   rating: 5, text: "Absolutely love the quality! My ring hasn't tarnished even after months of daily wear." },
  { name: 'Ananya M.', rating: 5, text: 'The layered necklace is stunning! Got so many compliments. Shipping was super fast.' },
  { name: 'Shreya K.', rating: 5, text: 'Finally found affordable jewellery that actually lasts. Perfect for everyday wear.' },
]

// Skeleton placeholder while products load
function ProductSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
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
  }, [])

  return (
    <main>
      {/* Hero banner slider — fetches from /api/banners/active */}
      <Hero />

      {/* Brand promise strip */}
      <div className="border-y border-gray-100 bg-white py-7 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
          {PROMISES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex flex-col items-center text-center gap-2 px-4">
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
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-10">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {bestsellers.map(p => <ProductCard key={p._id} product={p} />)}
          </div>
        )}

        <div className="text-center mt-8 md:hidden">
          <Link to="/collections?filter=bestseller" className="btn-outline inline-block">View All Bestsellers</Link>
        </div>
      </section>

      {/* Mid-page promo banner (static) */}
      <section className="relative h-72 md:h-[420px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1600&q=80"
          alt="Offer Banner"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-start justify-center px-12 md:px-24">
          <p className="text-gold-400 tracking-[0.3em] text-[10px] uppercase mb-4">Limited Time Offer</p>
          <h2 className="font-serif text-4xl md:text-6xl text-white font-light mb-3 leading-tight">
            Flat 20% Off
          </h2>
          <p className="text-white/60 text-sm mb-8 tracking-wide">
            First order · Code <span className="text-gold-400 font-semibold">FIRST10</span>
          </p>
          <Link to="/collections" className="btn-gold">Shop Now</Link>
        </div>
      </section>

      {/* New Arrivals section */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-10">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {newArrivals.map(p => <ProductCard key={p._id} product={p} />)}
          </div>
        )}

        <div className="text-center mt-8 md:hidden">
          <Link to="/collections?filter=new" className="btn-outline inline-block">View All New Arrivals</Link>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-[#0E0E0E] px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[10px] text-gold-500 tracking-[0.3em] uppercase mb-3">Reviews</p>
            <h2 className="font-serif text-4xl md:text-5xl text-white font-light tracking-wide">
              What Our Customers Say
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {REVIEWS.map(review => (
              <div key={review.name} className="border border-white/8 bg-white/5 p-7">
                <div className="flex gap-0.5 mb-4">
                  {Array(review.rating).fill(0).map((_, i) => (
                    <Star key={i} size={13} className="fill-gold-400 text-gold-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-400 leading-relaxed mb-5 font-light italic">"{review.text}"</p>
                <p className="text-[11px] font-semibold text-white tracking-widest uppercase">— {review.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
