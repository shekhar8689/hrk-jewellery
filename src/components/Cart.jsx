import { X, Minus, Plus, ShoppingBag, AlertTriangle } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { getImageUrl } from '../utils/image'

export default function Cart({ open, onClose }) {
  const { items, totalItems, totalPrice, dispatch } = useCart()
  const navigate = useNavigate()

  const goCheckout = () => {
    onClose()
    navigate('/checkout')
  }

  return (
    <>
      {/* Dark overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-50 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slide-in drawer */}
      <div
        className={`fixed top-0 right-0 h-full h-[100dvh] w-full max-w-md bg-white z-50 flex flex-col shadow-2xl transition-[transform,visibility] duration-300 ${
          open ? 'translate-x-0 visible' : 'translate-x-full invisible'
        }`}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-gold-500" />
            <span className="font-serif text-lg text-gray-900 tracking-wide">Your Bag</span>
            <span className="text-sm text-gray-400">({totalItems})</span>
          </div>
          <button onClick={onClose} aria-label="Close bag"
            className="-mr-2 w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Item list */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <ShoppingBag size={48} className="text-gray-200" />
              <p className="text-gray-500 text-sm">Your bag is empty</p>
              <button onClick={onClose} className="btn-gold text-xs">Continue Shopping</button>
            </div>
          ) : (
            <div className="space-y-5">
              {items.map((item, idx) => {
                const productUrl = `/product/${item.id || item._id}`
                const firstImage = item.images?.[0]
                const maxQty     = item.stock ?? Infinity
                const atMax      = item.qty >= maxQty
                const oos        = item.outOfStock || item.stock === 0

                return (
                  <div key={idx} className={`flex gap-4 ${oos ? 'opacity-60' : ''}`}>
                    <Link to={productUrl} onClick={onClose} className="shrink-0">
                      {firstImage ? (
                        <img
                          src={getImageUrl(firstImage, 200)}
                          loading="lazy" decoding="async"
                          alt={item.name}
                          className="w-20 h-24 object-cover bg-gray-50 border border-gray-100"
                        />
                      ) : (
                        <div className="w-20 h-24 bg-gray-100 flex items-center justify-center text-gray-300 text-xs">
                          No img
                        </div>
                      )}
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link
                        to={productUrl}
                        onClick={onClose}
                        className="text-sm font-medium text-gray-800 hover:text-gold-500 line-clamp-2 leading-snug"
                      >
                        {item.name}
                      </Link>

                      {(item.selectedColor || item.selectedSize) && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {[item.selectedColor, item.selectedSize].filter(Boolean).join(' / ')}
                        </p>
                      )}

                      {oos ? (
                        <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                          <AlertTriangle size={11} /> Out of stock
                        </p>
                      ) : atMax && maxQty !== Infinity ? (
                        <p className="text-xs text-amber-600 mt-1">Max {maxQty} available</p>
                      ) : null}

                      <p className="text-sm font-semibold text-gray-800 mt-1">
                        ₹{(item.price * item.qty).toLocaleString('en-IN')}
                      </p>

                      {/* Qty controls */}
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center border border-gray-200">
                          <button
                            className="w-9 h-9 flex items-center justify-center hover:bg-gray-50"
                            onClick={() =>
                              item.qty > 1
                                ? dispatch({ type: 'UPDATE_QTY', index: idx, qty: item.qty - 1 })
                                : dispatch({ type: 'REMOVE_ITEM', index: idx })
                            }
                            aria-label="Decrease quantity"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-8 text-center text-sm">{item.qty}</span>
                          <button
                            className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            onClick={() => dispatch({ type: 'UPDATE_QTY', index: idx, qty: item.qty + 1 })}
                            disabled={oos || atMax}
                            aria-label="Increase quantity"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <button
                          onClick={() => dispatch({ type: 'REMOVE_ITEM', index: idx })}
                          className="py-2 px-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-4 sm:px-6 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-gray-100 bg-gray-50">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">Subtotal ({totalItems} item{totalItems !== 1 ? 's' : ''})</span>
              <span className="font-semibold text-gray-800">₹{totalPrice.toLocaleString('en-IN')}</span>
            </div>
            {totalPrice < 999 && (
              <p className="text-xs text-amber-600 mb-2">
                Add ₹{(999 - totalPrice).toLocaleString('en-IN')} more for free shipping
              </p>
            )}
            <p className="text-xs text-gray-400 mb-4">Taxes calculated at checkout</p>

            <button
              onClick={goCheckout}
              className="btn-gold w-full text-center block py-4 text-sm"
            >
              Proceed to Checkout →
            </button>
            <button
              onClick={onClose}
              className="w-full text-center text-xs text-gray-500 hover:text-gray-700 mt-2 py-2.5"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  )
}
