import { Link } from 'react-router-dom'

/*
 * Categories are a fixed enum in the DB (rings, necklaces, earrings, bracelets, anklets).
 * Their images are high-quality Unsplash photos — no DB needed here.
 * Only product counts would need an API call; we omit counts to keep this simple.
 */
const CATEGORIES = [
  {
    id: 'rings',
    label: 'Rings',
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&q=80',
  },
  {
    id: 'necklaces',
    label: 'Necklaces',
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&q=80',
  },
  {
    id: 'earrings',
    label: 'Earrings',
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80',
  },
  {
    id: 'bracelets',
    label: 'Bracelets',
    image: 'https://images.unsplash.com/photo-1573408301185-9519f94816b5?w=600&q=80',
  },
]

export default function Categories() {
  return (
    <section className="py-10 md:py-16 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="text-center mb-6 md:mb-12">
        <p className="section-subtitle">Explore</p>
        <h2 className="section-title">Shop by Category</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {CATEGORIES.map(cat => (
          <Link
            key={cat.id}
            to={`/collections/${cat.id}`}
            className="group relative overflow-hidden aspect-[4/5] md:aspect-[3/4] block bg-gray-200"
          >
            <img
              src={cat.image}
              loading="lazy" decoding="async"
              alt={cat.label}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            {/* Hover gold tint */}
            <div className="absolute inset-0 bg-gold-600/0 group-hover:bg-gold-600/15 transition-all duration-500" />

            <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5">
              <p className="font-serif text-lg sm:text-xl text-white font-light tracking-wide">{cat.label}</p>
              <div className="h-px bg-gold-400 mt-3 w-0 group-hover:w-10 transition-all duration-500" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
