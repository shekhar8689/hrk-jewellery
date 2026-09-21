import { createContext, useContext, useReducer, useEffect } from 'react'

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

function cartReducer(state, action) {
  switch (action.type) {

    case 'ADD_ITEM': {
      const existing = state.items.find(
        i =>
          i.id === action.item.id &&
          i.selectedSize  === action.item.selectedSize &&
          i.selectedColor === action.item.selectedColor
      )
      const maxStock = action.item.stock ?? Infinity
      if (existing) {
        const addQty   = action.item.qty || 1
        const newQty   = Math.min(existing.qty + addQty, maxStock)
        return {
          ...state,
          items: state.items.map(i =>
            i === existing ? { ...i, qty: newQty } : i
          ),
        }
      }
      const initialQty = Math.min(action.item.qty || 1, maxStock)
      return {
        ...state,
        items: [...state.items, { ...action.item, qty: initialQty }],
      }
    }

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((_, idx) => idx !== action.index),
      }

    case 'UPDATE_QTY': {
      const item     = state.items[action.index]
      const maxStock = item?.stock ?? Infinity
      const newQty   = Math.min(Math.max(1, action.qty), maxStock)
      return {
        ...state,
        items: state.items.map((i, idx) =>
          idx === action.index ? { ...i, qty: newQty } : i
        ),
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

  return (
    <CartContext.Provider value={{ ...state, totalItems, totalPrice, dispatch }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
