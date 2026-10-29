import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { SlidersHorizontal, ChevronDown, X } from 'lucide-react'
import ProductCard from '../components/ProductCard'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

/* Fixed category list — matches the DB enum */
const CATEGORIES = [
  { id: 'rings',     label: 'Rings' },
  { id: 'necklaces', label: 'Necklaces' },
  { id: 'earrings',  label: 'Earrings' },
  { id: 'bracelets', label: 'Bracelets' },
  { id: 'anklets',   label: 'Anklets' },
]

const SORT_OPTIONS = [
  { value: 'featured',   label: 'Featured' },
  { value: 'price-asc',  label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating',     label: 'Top Rated' },
  { value: 'newest',     label: 'Newest First' },
]

export default function Collections() {
  const { category }   = useParams()
  const [searchParams] = useSearchParams()
  const filter         = searchParams.get('filter') // 'new' | 'bestseller'
  const query          = searchParams.get('q')      // search term from header

  const [products, setProducts]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [sort, setSort]             = useState('featured')
  const [filterOpen, setFilterOpen] = useState(false)
  const [maxPrice, setMaxPrice]     = useState(5000)   // dynamically updated after fetch
  const [priceMax, setPriceMax]     = useState(5000)   // slider upper value

  /* Fetch whenever route or search params change */
  useEffect(() => {
    setLoading(true)
    setSort('featured')      // reset sort when navigating to a new category
    setFilterOpen(false)

    const params = new URLSearchParams()
    params.set('visible', 'true')
    params.set('limit', '100')
    if (category && category !== 'all') params.set('category', category)
    if (filter === 'new')        params.set('isNew', 'true')
    if (filter === 'bestseller') params.set('isBestseller', 'true')
    if (query)                   params.set('search', query)

    fetch(`${API}/products?${params}`)
      .then(r => r.json())
      .then(data => {
        const list = data.products || []
        setProducts(list)

        /* Set price slider ceiling to the highest product price (rounded up to next 500) */
        if (list.length > 0) {
          const highest = Math.max(...list.map(p => p.price || 0))
          const ceiling = Math.ceil(highest / 500) * 500 || 5000
          setMaxPrice(ceiling)
          setPriceMax(ceiling)
        }
      })
      .catch(err => console.error('Collections fetch error:', err))
      .finally(() => setLoading(false))
  }, [category, filter, query])

  /* Client-side sort + price filter — no extra API calls */
  const displayed = useMemo(() => {
    const list = products.filter(p => p.price <= priceMax)
    switch (sort) {
      case 'price-asc':  return [...list].sort((a, b) => a.price - b.price)
      case 'price-desc': return [...list].sort((a, b) => b.price - a.price)
      case 'rating':     return [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0))
      case 'newest':     return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      default:           return list
    }
  }, [products, sort, priceMax])

  const pageTitle = query
    ? `Search: "${query}"`
    : filter === 'new'        ? 'New Arrivals'
    : filter === 'bestseller' ? 'Bestsellers'
    : category                ? (CATEGORIES.find(c => c.id === category)?.label ?? category)
    : 'All Jewellery'

  const unknownCategory = !!category && !CATEGORIES.some(c => c.id === category)
  useEffect(() => {
    document.title = `${unknownCategory ? 'Category not found' : pageTitle} — HRK Jewellery`
    return () => { document.title = 'HRK Jewellery' }
  }, [pageTitle, unknownCategory])

  if (unknownCategory) {
    return (
      <main className="max-w-xl mx-auto px-4 py-20 text-center min-h-[60vh]">
        <h1 className="font-serif text-3xl text-gray-800 mb-3">Category not found</h1>
        <p className="text-gray-500 mb-6">We couldn't find that collection. Have a look at everything we have instead.</p>
        <Link to="/collections" className="btn-gold">Browse All Jewellery</Link>
      </main>
    )
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10">
      {/* Breadcrumb */}
      <nav className="text-xs text-gray-400 mb-4 md:mb-6 flex gap-2">
        <Link to="/" className="hover:text-gold-500">Home</Link>
        <span>/</span>
        <span className="text-gray-700">{pageTitle}</span>
      </nav>

      {/* Heading + controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-5 md:mb-6">
        <div>
          <h1 className="font-serif text-[1.75rem] sm:text-3xl text-gray-800 leading-tight">{pageTitle}</h1>
          <p className="text-sm text-gray-400 mt-1">
            {loading ? 'Loading…' : `${displayed.length} products`}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3">
          <button
            onClick={() => setFilterOpen(v => !v)}
            aria-expanded={filterOpen}
            className={`flex items-center justify-center gap-2 text-xs uppercase tracking-widest border px-4 h-11 sm:h-auto sm:py-2 transition-colors ${filterOpen ? 'border-gold-500 text-gold-600' : 'text-gray-600 border-gray-300 hover:border-gold-500'}`}
          >
            <SlidersHorizontal size={14} /> Filter
          </button>
          <div className="relative min-w-0">
            <select
              aria-label="Sort products"
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="w-full text-xs uppercase tracking-wider sm:tracking-widest text-gray-600 border border-gray-300 pl-3 sm:pl-4 pr-8 h-11 sm:h-auto sm:py-2 hover:border-gold-500 appearance-none bg-white focus:outline-none cursor-pointer truncate"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto sm:flex-wrap -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 mb-5 md:mb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link
          to="/collections"
          className={`shrink-0 whitespace-nowrap text-xs uppercase tracking-widest px-4 py-2.5 sm:py-2 border transition-colors ${
            !category && !filter ? 'bg-gold-500 text-white border-gold-500' : 'border-gray-300 text-gray-600 hover:border-gold-500'
          }`}
        >
          All
        </Link>
        {CATEGORIES.map(c => (
          <Link
            key={c.id}
            to={`/collections/${c.id}`}
            className={`shrink-0 whitespace-nowrap text-xs uppercase tracking-widest px-4 py-2.5 sm:py-2 border transition-colors ${
              category === c.id ? 'bg-gold-500 text-white border-gold-500' : 'border-gray-300 text-gray-600 hover:border-gold-500'
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {/* Price filter panel — max is dynamic from the fetched products */}
      {filterOpen && (
        <div className="bg-gray-50 border border-gray-200 p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-8 sm:items-center">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-700 font-medium mb-3">Max Price</p>
            <div className="flex items-center gap-3 text-sm w-full sm:w-auto">
              <span className="text-gray-500 text-xs">₹0</span>
              <input
                type="range"
                min={0}
                max={maxPrice}
                step={Math.ceil(maxPrice / 50) * 10 || 100}
                value={priceMax}
                onChange={e => setPriceMax(Number(e.target.value))}
                className="flex-1 sm:flex-none sm:w-44 accent-gold-500 h-8"
              />
              <span className="text-gray-700 font-medium text-sm">₹{priceMax.toLocaleString('en-IN')}</span>
            </div>
          </div>
          <button
            onClick={() => setPriceMax(maxPrice)}
            className="text-xs text-gold-600 hover:underline flex items-center gap-1"
          >
            <X size={12} /> Reset
          </button>
        </div>
      )}

      {/* Product grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 aspect-[3/4] mb-3" />
              <div className="bg-gray-200 h-3 w-3/4 mb-2 rounded" />
              <div className="bg-gray-200 h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-gray-400 text-lg mb-2">No products found</p>
          <p className="text-gray-300 text-sm mb-6">Try changing the filters or browse all jewellery</p>
          <Link to="/collections" className="btn-gold inline-block">View All Products</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {displayed.map(p => <ProductCard key={p._id} product={p} />)}
        </div>
      )}
    </main>
  )
}
