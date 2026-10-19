import { createContext, useContext, useState, useEffect } from 'react'

const WishlistContext = createContext(null)

const STORAGE_KEY = 'hrk_wishlist'

export function WishlistProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const isInWishlist = (id) => items.some(i => i._id === id)

  const toggleWishlist = (product) => {
    setItems(prev =>
      prev.some(i => i._id === product._id)
        ? prev.filter(i => i._id !== product._id)
        : [...prev, {
            _id:    product._id,
            name:   product.name,
            price:  product.price,
            images: product.images,
            rating: product.rating,
            reviews:product.reviews,
            category: product.category,
            stock:  product.stock,
          }]
    )
  }

  const removeFromWishlist = (id) => setItems(prev => prev.filter(i => i._id !== id))

  const clearWishlist = () => setItems([])

  return (
    <WishlistContext.Provider value={{ items, isInWishlist, toggleWishlist, removeFromWishlist, clearWishlist }}>
      {children}
    </WishlistContext.Provider>
  )
}

export const useWishlist = () => {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider')
  return ctx
}
