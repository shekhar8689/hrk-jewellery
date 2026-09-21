import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getImageUrl } from '../utils/image'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function Hero() {
  const [banners, setBanners] = useState([])
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/banners/active`)
      .then(res => res.json())
      .then(data => setBanners(Array.isArray(data) ? data : []))
      .catch(err => console.error('Hero fetch error:', err))
      .finally(() => setLoading(false))
  }, [])

  // Auto-advance only when there are multiple banners
  useEffect(() => {
    if (banners.length <= 1) return
    const t = setInterval(() => setCurrent(c => (c + 1) % banners.length), 5500)
    return () => clearInterval(t)
  }, [banners.length])

  const prev = () => setCurrent(c => (c - 1 + banners.length) % banners.length)
  const next = () => setCurrent(c => (c + 1) % banners.length)

  if (loading) {
    return (
      <section className="relative h-[72vh] md:h-[88vh] bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </section>
    )
  }

  // Fallback when no banners are configured yet
  if (banners.length === 0) {
    return (
      <section className="relative h-[72vh] md:h-[88vh] bg-gray-900 flex flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-gold-400 tracking-[0.3em] text-[10px] uppercase">HRK Jewellery</p>
        <h1 className="font-serif text-5xl md:text-7xl text-white font-light leading-tight">
          Crafted for<br />Everyday Magic
        </h1>
        <p className="text-white/60 text-sm max-w-sm tracking-wide">
          Tarnish-free fine jewellery, designed for the modern woman
        </p>
        <Link to="/collections" className="btn-gold">Shop Now</Link>
      </section>
    )
  }

  const slide = banners[current]
  const alignClass =
    slide.align === 'right'  ? 'items-end text-right'    :
    slide.align === 'center' ? 'items-center text-center' :
                               'items-start text-left'

  return (
    <section className="relative h-[72vh] md:h-[88vh] overflow-hidden">
      {/* Backgrounds */}
      {banners.map((s, i) => (
        <div
          key={s._id}
          className={`absolute inset-0 transition-opacity duration-1000 ${i === current ? 'opacity-100' : 'opacity-0'}`}
        >
          <img src={getImageUrl(s.image)} alt={s.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-black/20" />
        </div>
      ))}

      {/* Content */}
      <div className={`relative z-10 h-full flex flex-col justify-end pb-20 md:pb-24 px-10 md:px-24 ${alignClass}`}>
        {slide.badge && (
          <span className="text-gold-400 tracking-[0.3em] text-[10px] uppercase mb-5 font-medium">
            {slide.badge}
          </span>
        )}
        <h1 className="font-serif text-5xl md:text-7xl text-white leading-[1.1] mb-5 whitespace-pre-line font-light">
          {slide.title}
        </h1>
        {slide.subtitle && (
          <p className="text-white/70 text-sm md:text-base max-w-sm mb-8 font-light tracking-wide">
            {slide.subtitle}
          </p>
        )}
        <div className="flex gap-4 flex-wrap">
          <Link to={slide.link || '/collections'} className="btn-gold inline-block">
            {slide.cta || 'Shop Now'}
          </Link>
          <Link
            to="/collections"
            className="inline-block border border-white/60 text-white text-xs tracking-widest uppercase px-8 py-3 hover:bg-white/10 transition-all duration-200"
          >
            View All
          </Link>
        </div>
      </div>

      {/* Arrows — only shown with multiple banners */}
      {banners.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center border border-white/30 text-white hover:bg-white/20 backdrop-blur-sm transition-all"
            aria-label="Previous slide"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={next}
            className="absolute right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center border border-white/30 text-white hover:bg-white/20 backdrop-blur-sm transition-all"
            aria-label="Next slide"
          >
            <ChevronRight size={18} />
          </button>

          {/* Slide counter + dots */}
          <div className="absolute bottom-8 right-10 z-20 flex items-center gap-4">
            <span className="text-white/50 text-xs tracking-widest">
              {String(current + 1).padStart(2, '0')} / {String(banners.length).padStart(2, '0')}
            </span>
            <div className="flex gap-1.5">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-0.5 transition-all duration-300 ${i === current ? 'bg-gold-400 w-8' : 'bg-white/40 w-4'}`}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
