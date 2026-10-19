import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const CartContext = createContext(null)
const STORAGE_KEY = 'hrk_cart'

function loadCart() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : { items: [] }
  } catch {
    return { items: [] }
  }
}

// Total quantity of a product already in the bag, optionally excluding one line
function qtyOfProduct(items, id, exclude) {
  return items.reduce((sum, i) => (i.id === id && i !== exclude ? sum + i.qty : sum), 0)
}

// Last known stock for a product from any line already in the bag
function findStock(items, id) {
  const line = items.find(i => i.id === id && i.stock !== undefined)
  return line ? line.stock : Infinity
}

function cartReducer(state, action) {
  switch (action.type) {

    case 'ADD_ITEM': {
      const existing = state.items.find(
        i =>
          i.id === action.item.id &&
          (i.selectedSize  || '') === (action.item.selectedSize  || '') &&
          (i.selectedColor || '') === (action.item.selectedColor || '')
      )
      // Stock is shared by every line of the same product (different sizes
      // or colours), so cap the product's total quantity, not each line.
      const maxStock = action.item.stock ?? findStock(state.items, action.item.id)
      const others   = qtyOfProduct(state.items, action.item.id, existing)
      const room     = Math.max(0, maxStock - others)
      const addQty   = action.item.qty || 1
      // Keep every line of this product in sync with the latest known stock
      const synced   = action.item.stock !== undefined
        ? state.items.map(i => (i.id === action.item.id ? { ...i, stock: action.item.stock } : i))
        : state.items
      if (existing) {
        const newQty = Math.min(existing.qty + addQty, room)
        return {
          ...state,
          items: synced.map(i =>
            i.id === existing.id && (i.selectedSize || '') === (existing.selectedSize || '') && (i.selectedColor || '') === (existing.selectedColor || '')
              ? { ...i, qty: Math.max(1, newQty) }
              : i
          ),
        }
      }
      if (room <= 0) return { ...state, items: synced }   // nothing left to add
      return {
        ...state,
        items: [...synced, { ...action.item, qty: Math.min(addQty, room) }],
      }
    }

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((_, idx) => idx !== action.index),
      }

    case 'UPDATE_QTY': {
      const item     = state.items[action.index]
      if (!item) return state
      const maxStock = item.stock ?? Infinity
      const others   = qtyOfProduct(state.items, item.id, item)
      const newQty   = Math.min(Math.max(1, action.qty), Math.max(1, maxStock - others))
      return {
        ...state,
        items: state.items.map((i, idx) =>
          idx === action.index ? { ...i, qty: newQty } : i
        ),
      }
    }

    // Refresh stock/price for a product from the server
    case 'SYNC_PRODUCT':
      return {
        ...state,
        items: state.items.map(i =>
          i.id === action.product.id
            ? { ...i, stock: action.product.stock, price: action.product.price, outOfStock: action.product.stock === 0 }
            : i
        ),
      }

    // Reduce quantities so each product's total fits its stock
    case 'CLAMP_TO_STOCK': {
      const used = {}
      return {
        ...state,
        items: state.items.map(i => {
          if (i.stock === undefined || i.stock === Infinity) return i
          const left = Math.max(0, i.stock - (used[i.id] || 0))
          const qty  = Math.min(i.qty, left)
          used[i.id] = (used[i.id] || 0) + qty
          return qty === 0 ? { ...i, qty: 1, outOfStock: true } : { ...i, qty, outOfStock: false }
        }),
      }
    }

    // Mark an item as out-of-stock after backend rejects it
    case 'MARK_OUT_OF_STOCK':
      return {
        ...state,
        items: state.items.map((item, idx) =>
          idx === action.index ? { ...item, outOfStock: true } : item
        ),
      }

    case 'CLEAR':
      return { ...state, items: [] }

    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, loadCart)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* ignore private-browsing quota errors */
    }
  }, [state])

  const totalItems = state.items.reduce((s, i) => s + i.qty, 0)
  const totalPrice = state.items.reduce((s, i) => s + i.price * i.qty, 0)

  // Fetch the latest stock and price for everything in the bag, then trim any
  // quantity above what is actually available. Called when the bag or the
  // checkout page opens, so items added earlier (e.g. from the wishlist)
  // can never exceed real stock.
  const itemsRef = useRef(state.items)
  itemsRef.current = state.items
  const refreshStock = useCallback(async () => {
    const ids = [...new Set(itemsRef.current.map(i => i.id).filter(Boolean))]
    await Promise.all(ids.map(async id => {
      try {
        // no-store: always the live price/stock, never the browser's cached copy
        const res = await fetch(`${API}/products/${id}`, { cache: 'no-store' })
        if (!res.ok) return
        const p = await res.json()
        dispatch({ type: 'SYNC_PRODUCT', product: { id, stock: p.stock ?? 0, price: p.price } })
      } catch { /* offline — keep what we have */ }
    }))
    dispatch({ type: 'CLAMP_TO_STOCK' })
  }, [])

  return (
    <CartContext.Provider value={{ ...state, totalItems, totalPrice, dispatch, refreshStock }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
