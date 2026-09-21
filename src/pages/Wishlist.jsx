import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ShoppingBag, Trash2, Star } from 'lucide-react'
import { useWishlist } from '../context/WishlistContext'
import { useCart }     from '../context/CartContext'
import { getImageUrl } from '../utils/image'
import Toast           from '../components/Toast'
import { useState }    from 'react'

function StarDisplay({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} size={11} className={n <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />
      ))}
    </div>
  )
}

export default function Wishlist() {
  const { items, removeFromWishlist, clearWishlist } = useWishlist()
  const { dispatch } = useCart()
  const [toast, setToast] = useState(null)

  useEffect(() => {
    document.title = `Wishlist (${items.length}) — HRK Jewellery`
    return () => { document.title = 'HRK Jewellery' }
  }, [items.length])

  const moveToCart = (item) => {
    dispatch({ type: 'ADD_ITEM', item: { ...item, id: item._id, qty: 1 } })
    removeFromWishlist(item._id)
    setToast({ message: `${item.name} added to cart`, type: 'success' })
  }

  if (items.length === 0) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <Heart size={52} className="mx-auto mb-4 text-gray-200" />
        <h1 className="font-serif text-2xl text-gray-800 mb-2">Your Wishlist is Empty</h1>
        <p className="text-gray-500 text-sm mb-8">Save products you love and come back to them anytime.</p>
        <Link to="/collections" className="btn-gold">Browse Collections</Link>
      </main>
    )
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-3xl text-gray-800">My Wishlist</h1>
          <p className="text-gray-500 text-sm mt-1">{items.length} item{items.length !== 1 ? 's' : ''} saved</p>
        </div>
        <button onClick={() => { if (window.confirm('Clear your entire wishlist?')) clearWishlist() }}
          className="text-sm text-gray-400 hover:text-red-500 transition-colors">
          Clear all
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map(item => (
          <div key={item._id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden group hover:shadow-md transition-shadow">
            {/* Image */}
            <Link to={`/product/${item._id}`} className="block aspect-[3/4] overflow-hidden bg-gray-50 relative">
              {item.images?.[0] ? (
                <img src={getImageUrl(item.images[0])} alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No image</div>
              )}
            </Link>

            {/* Info */}
            <div className="p-3">
              <Link to={`/product/${item._id}`}
                className="text-sm font-medium text-gray-800 hover:text-gold-600 line-clamp-2 leading-snug mb-1 block">
                {item.name}
              </Link>
              {item.rating > 0 && (
                <div className="flex items-center gap-1 mb-1.5">
                  <StarDisplay rating={item.rating} />
                  <span className="text-[10px] text-gray-400">({item.reviews})</span>
                </div>
              )}
              <p className="text-sm font-bold text-gray-900 mb-3">₹{item.price?.toLocaleString('en-IN')}</p>

              <div className="flex gap-2">
                <button onClick={() => moveToCart(item)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gray-900 hover:bg-amber-500 text-white py-2 rounded-xl text-xs font-medium transition-colors">
                  <ShoppingBag size={13} /> Add to Cart
                </button>
                <button onClick={() => removeFromWishlist(item._id)}
                  className="border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300 px-2.5 rounded-xl transition-colors"
                  aria-label="Remove from wishlist">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </main>
  )
}
