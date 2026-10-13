import React, { useState, useEffect, useRef } from 'react'
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

  // Swipe left/right on phones (arrows are hidden on small screens)
  const touchX = useRef(null)
  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    if (touchX.current === null || banners.length <= 1) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(dx) > 45) (dx < 0 ? next : prev)()
    touchX.current = null
  }

  if (loading) {
    return (
      <section className="relative h-[70svh] min-h-[460px] md:h-[88vh] bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </section>
    )
  }

  // Fallback when no banners are configured yet
  if (banners.length === 0) {
    return (
      <section className="relative h-[70svh] min-h-[460px] md:h-[88vh] bg-gray-900 flex flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-gold-400 tracking-[0.3em] text-[10px] uppercase">HRK Jewellery</p>
        <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl text-white font-light leading-tight">
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
    <section className="relative h-[70svh] min-h-[460px] md:h-[88vh] overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Backgrounds */}
      {banners.map((s, i) => (
        <div
          key={s._id}
          className={`absolute inset-0 transition-opacity duration-1000 ${i === current ? 'opacity-100' : 'opacity-0'}`}
        >
          <img
            src={getImageUrl(s.image, 1920)}
            alt={s.title}
            className="w-full h-full object-cover"
            loading={i === 0 ? 'eager' : 'lazy'}
            fetchpriority={i === 0 ? 'high' : 'low'}
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10 md:bg-gradient-to-r md:from-black/60 md:via-black/30 md:to-black/20" />
        </div>
      ))}

      {/* Content */}
      <div className={`relative z-10 h-full flex flex-col justify-end pb-16 md:pb-24 px-6 sm:px-10 md:px-24 ${alignClass}`}>
        {slide.badge && (
          <span className="text-gold-400 tracking-[0.3em] text-[10px] uppercase mb-3 md:mb-5 font-medium">
            {slide.badge}
          </span>
        )}
        <h1 className="font-serif text-[2.5rem] sm:text-5xl md:text-7xl text-white leading-[1.1] mb-3 md:mb-5 whitespace-pre-line font-light">
          {slide.title}
        </h1>
        {slide.subtitle && (
          <p className="text-white/80 text-sm md:text-base max-w-sm mb-6 md:mb-8 font-light tracking-wide">
            {slide.subtitle}
          </p>
        )}
        <div className="flex gap-3 md:gap-4 flex-wrap">
          <Link to={slide.link || '/collections'} className="btn-gold inline-block px-6 sm:px-8">
            {slide.cta || 'Shop Now'}
          </Link>
          <Link
            to="/collections"
            className="inline-block border border-white/60 text-white text-xs tracking-widest uppercase px-6 sm:px-8 py-3 hover:bg-white/10 transition-all duration-200"
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
            className="hidden md:flex absolute left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center border border-white/30 text-white hover:bg-white/20 backdrop-blur-sm transition-all"
            aria-label="Previous slide"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={next}
            className="hidden md:flex absolute right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center border border-white/30 text-white hover:bg-white/20 backdrop-blur-sm transition-all"
            aria-label="Next slide"
          >
            <ChevronRight size={18} />
          </button>

          {/* Slide counter + dots */}
          <div className="absolute bottom-5 md:bottom-8 left-6 right-6 md:left-auto md:right-10 z-20 flex items-center justify-between md:justify-start gap-4">
            <span className="text-white/50 text-xs tracking-widest">
              {String(current + 1).padStart(2, '0')} / {String(banners.length).padStart(2, '0')}
            </span>
            <div className="flex gap-1.5">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className="py-3 -my-3"
                >
                  <span className={`block h-0.5 transition-all duration-300 ${i === current ? 'bg-gold-400 w-8' : 'bg-white/40 w-4'}`} />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
