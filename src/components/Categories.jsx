import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getImageUrl } from '../utils/image'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Tailwind needs full class names, so map the number of tiles to a desktop grid
const DESKTOP_COLS = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 5: 'md:grid-cols-5' }

/*
 * "Shop by Category" — managed in Admin → Categories (poster, name, order,
 * show/hide). If a category has no poster yet, the server sends the newest
 * photo of one of its products instead.
 */
export default function Categories() {
  const [categories, setCategories] = useState(null)   // null = loading

  useEffect(() => {
    fetch(`${API}/categories`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]))
  }, [])

  // Nothing to show (all hidden, or the server is unreachable)
  if (categories && categories.length === 0) return null

  const count = categories?.length || 4
  const oddOnPhone = count % 2 === 1

  return (
    <section className="py-10 md:py-16 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="text-center mb-6 md:mb-12">
        <p className="section-subtitle">Explore</p>
        <h2 className="section-title">Shop by Category</h2>
      </div>

      <div className={`grid grid-cols-2 ${DESKTOP_COLS[Math.min(count, 5)]} gap-3 md:gap-4`}>
        {!categories
          ? [...Array(4)].map((_, i) => (
              <div key={i} className="aspect-[4/5] md:aspect-[3/4] bg-gray-200 animate-pulse" />
            ))
          : categories.map((cat, i) => {
              // On phones, let a lone last tile span the full row
              const wide = oddOnPhone && i === count - 1
              return (
                <Link
                  key={cat.slug}
                  to={`/collections/${cat.slug}`}
                  className={`group relative overflow-hidden block bg-gradient-to-br from-[#efe2d2] via-[#d9b996] to-[#a9794f] ${
                    wide ? 'col-span-2 md:col-span-1 aspect-[2/1] md:aspect-[3/4]' : 'aspect-[4/5] md:aspect-[3/4]'
                  }`}
                >
                  {cat.image && (
                    <img
                      src={getImageUrl(cat.image, 700)}
                      loading="lazy" decoding="async"
                      alt={cat.label}
                      // If a photo fails to load, hide it so the warm gold background shows
                      onError={e => { e.currentTarget.style.display = 'none' }}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                    />
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  {/* Hover gold tint */}
                  <div className="absolute inset-0 bg-gold-600/0 group-hover:bg-gold-600/15 transition-all duration-500" />

                  <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5">
                    <p className="font-serif text-lg sm:text-xl text-white font-light tracking-wide">{cat.label}</p>
                    <div className="h-px bg-gold-400 mt-3 w-0 group-hover:w-10 transition-all duration-500" />
                  </div>
                </Link>
              )
            })}
      </div>
    </section>
  )
}
