import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ShoppingBag, Star } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { getImageUrl } from '../utils/image'

export default function ProductCard({ product }) {
  const { dispatch } = useCart()
  const [wished, setWished] = useState(false)
  const [imgIdx, setImgIdx] = useState(0)
  const [added, setAdded]   = useState(false)

  // MongoDB uses _id; static fallback data used numeric id
  const productId = product._id || product.id

  const images    = product.images || []
  const discount  = product.originalPrice > 0
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0

  const outOfStock = product.stock === 0

  const handleAdd = e => {
    e.preventDefault()
    if (outOfStock) return                       // guard: never add OOS item
    dispatch({
      type: 'ADD_ITEM',
      item: {
        ...product,
        id:            productId,               // CartContext deduplicates by "id"
        stock:         product.stock,           // required for CartContext qty cap
        selectedSize:  product.sizes?.[0]  || '',
        selectedColor: product.colors?.[0] || '',
      },
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <Link
      to={`/product/${productId}`}
      className="group block bg-white border border-gray-100 hover:border-gray-200 transition-all duration-300 hover:shadow-lg"
      onMouseEnter={() => images[1] && setImgIdx(1)}
      onMouseLeave={() => setImgIdx(0)}
    >
      {/* Product image */}
      <div className="relative overflow-hidden aspect-[3/4] bg-gray-50">
        {images[imgIdx] || images[0] ? (
          <img
            src={getImageUrl(images[imgIdx] || images[0])}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          // Placeholder when no image is uploaded yet
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs tracking-widest uppercase">
            No image
          </div>
        )}

        {/* Badges — New / Bestseller / Discount */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.isNew && (
            <span className="bg-gold-500 text-white text-[9px] px-2.5 py-1 tracking-[0.15em] uppercase font-medium">
              New
            </span>
          )}
          {product.isBestseller && (
            <span className="bg-gray-900 text-white text-[9px] px-2.5 py-1 tracking-[0.15em] uppercase font-medium">
              Bestseller
            </span>
          )}
          {discount > 0 && (
            <span className="bg-rose-600 text-white text-[9px] px-2.5 py-1 tracking-[0.15em] uppercase font-medium">
              {discount}% off
            </span>
          )}
        </div>

        {/* Wishlist button */}
        <button
          onClick={e => { e.preventDefault(); setWished(v => !v) }}
          className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm hover:bg-white transition-colors flex items-center justify-center shadow-sm"
          aria-label="Add to wishlist"
        >
          <Heart size={15} className={wished ? 'fill-rose-500 text-rose-500' : 'text-gray-500'} />
        </button>

        {/* Quick-add button — slides up on hover */}
        <button
          onClick={handleAdd}
          disabled={outOfStock}
          className={`absolute bottom-0 left-0 right-0 py-3 text-[10px] tracking-[0.2em] uppercase font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
            outOfStock
              ? 'bg-gray-400 text-white translate-y-full group-hover:translate-y-0 cursor-not-allowed'
              : added
                ? 'bg-green-700 text-white translate-y-0'
                : 'bg-gray-900 text-white hover:bg-gold-500 translate-y-full group-hover:translate-y-0'
          }`}
        >
          <ShoppingBag size={13} />
          {outOfStock ? 'Out of Stock' : added ? 'Added to Bag' : 'Quick Add'}
        </button>
      </div>

      {/* Info row */}
      <div className="p-4">
        {product.material && (
          <p className="text-[9px] text-gold-600 uppercase tracking-[0.2em] mb-1.5 font-medium">
            {product.material}
          </p>
        )}
        <h3 className="text-sm font-medium text-gray-800 mb-2.5 line-clamp-1 leading-snug">
          {product.name}
        </h3>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-gray-900 text-[15px]">
            ₹{product.price?.toLocaleString('en-IN')}
          </span>
          {product.originalPrice > 0 && (
            <span className="text-xs text-gray-400 line-through">
              ₹{product.originalPrice?.toLocaleString('en-IN')}
            </span>
          )}
        </div>
        {(product.rating || 0) > 0 && (
          <div className="flex items-center gap-1">
            <Star size={10} className="fill-gold-500 text-gold-500" />
            <span className="text-[11px] text-gray-400">{product.rating} ({product.reviews})</span>
          </div>
        )}
      </div>
    </Link>
  )
}
