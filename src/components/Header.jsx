import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, Search, Menu, X, Heart, User, LogOut, Package } from 'lucide-react'
import { useCart }     from '../context/CartContext'
import { useUserAuth } from '../context/UserAuthContext'
import { useWishlist } from '../context/WishlistContext'
import useOffer from '../hooks/useOffer'

const navLinks = [
  { label: 'New Arrivals', to: '/collections?filter=new' },
  { label: 'Rings',        to: '/collections/rings' },
  { label: 'Necklaces',   to: '/collections/necklaces' },
  { label: 'Earrings',    to: '/collections/earrings' },
  { label: 'Bracelets',   to: '/collections/bracelets' },
  { label: 'Anklets',     to: '/collections/anklets' },
]

export default function Header({ onCartOpen }) {
  const offer = useOffer()
  const { totalItems }             = useCart()
  const { user, logout }           = useUserAuth()
  const { items: wishlistItems }   = useWishlist()
  const [scrolled,     setScrolled]     = useState(false)
  const [menuOpen,     setMenuOpen]     = useState(false)
  const [searchOpen,   setSearchOpen]   = useState(false)
  const [accountOpen,  setAccountOpen]  = useState(false)
  const [query,        setQuery]        = useState('')
  const navigate   = useNavigate()
  const accountRef = useRef(null)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/collections?q=${encodeURIComponent(query.trim())}`)
      setSearchOpen(false)
      setQuery('')
    }
  }

  const handleLogout = () => { logout(); setAccountOpen(false); navigate('/') }

  return (
    <>
      {/* Announcement bar */}
      <div className="bg-gray-900 text-gray-300 text-center py-2 md:py-2.5 px-3 text-[10px] tracking-[0.12em] md:tracking-[0.2em] uppercase whitespace-nowrap overflow-hidden text-ellipsis">
        Free shipping <span className="hidden sm:inline">on orders </span>above ₹999
        {/* Only advertised while the coupon really exists and is active */}
        {offer?.isActive && offer.showInTopBar && offer.coupon && (
          <>
            &nbsp;&nbsp;·&nbsp;&nbsp;Code&nbsp;
            <span className="text-gold-400 font-semibold">{offer.coupon.code}</span>&nbsp;for {offer.coupon.label}
          </>
        )}
      </div>

      <header className={`sticky top-0 z-50 transition-all duration-300 border-b ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-gray-200' : 'bg-white border-gray-100'
      }`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between h-14 md:h-auto md:py-4">
          {/* Mobile menu button */}
          <button className="md:hidden text-gray-700 w-10 h-10 flex items-center justify-center -ml-1" onClick={() => setMenuOpen(v => !v)} aria-label="Menu" aria-expanded={menuOpen}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Logo */}
          <Link to="/" className="font-serif text-lg sm:text-xl md:text-2xl tracking-[0.08em] sm:tracking-[0.15em] text-gray-900 font-light uppercase whitespace-nowrap">
            HRK <span className="text-gold-500">Jewellery</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex gap-8">
            {navLinks.map(l => (
              <Link key={l.label} to={l.to}
                className="text-[11px] uppercase tracking-[0.15em] text-gray-500 hover:text-gold-500 font-medium transition-colors duration-200 py-1 border-b border-transparent hover:border-gold-400">
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Icons */}
          <div className="flex items-center gap-0 md:gap-2">
            {/* Search */}
            <button onClick={() => setSearchOpen(v => !v)}
              className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-gold-500 transition-colors" aria-label="Search">
              <Search size={18} />
            </button>

            {/* Wishlist */}
            <Link to="/wishlist"
              className="relative w-10 h-10 items-center justify-center text-gray-600 hover:text-gold-500 transition-colors hidden md:flex"
              aria-label={`Wishlist (${wishlistItems.length} items)`}>
              <Heart size={18} className={wishlistItems.length > 0 ? 'fill-red-400 text-red-400' : ''} />
              {wishlistItems.length > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-red-400 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlistItems.length > 9 ? '9+' : wishlistItems.length}
                </span>
              )}
            </Link>

            {/* Account */}
            {user ? (
              <div className="relative" ref={accountRef}>
                <button onClick={() => setAccountOpen(v => !v)}
                  className="h-10 min-w-[2.5rem] px-1.5 flex items-center justify-center gap-1.5 text-gray-600 hover:text-gold-500 transition-colors" aria-label="Account">
                  <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-bold">
                    {user.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="hidden md:block text-[11px] font-medium tracking-wide text-gray-700 max-w-[80px] truncate">
                    {user.name.split(' ')[0]}
                  </span>
                </button>
                {accountOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                    <div className="px-4 py-3 border-b border-gray-50">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                    <Link to="/my-orders" onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <Package size={15} className="text-gray-400" /> My Orders
                    </Link>
                    <Link to="/wishlist" onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <Heart size={15} className="text-gray-400" /> Wishlist
                      {wishlistItems.length > 0 && (
                        <span className="ml-auto text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{wishlistItems.length}</span>
                      )}
                    </Link>
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                      <LogOut size={15} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-gold-500 transition-colors" aria-label="Sign in">
                <User size={18} />
              </Link>
            )}

            {/* Cart */}
            <button onClick={onCartOpen} className="relative w-10 h-10 flex items-center justify-center text-gray-600 hover:text-gold-500 transition-colors -mr-1 md:mr-0" aria-label="Cart">
              <ShoppingBag size={18} />
              {totalItems > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-gold-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <div className="border-t border-gray-100 bg-gray-50 px-3 sm:px-6 py-3 sm:py-4">
            <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2 items-center">
              <input autoFocus type="search" enterKeyHint="search" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search rings, necklaces, earrings…"
                className="flex-1 min-w-0 border border-gray-300 bg-white px-3 sm:px-4 py-2.5 text-sm focus:outline-none focus:border-gold-500 rounded-lg transition-colors" />
              <button type="submit" className="btn-gold px-4 sm:px-6 py-2.5 shrink-0">Search</button>
              <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search" className="w-10 h-10 shrink-0 flex items-center justify-center text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </form>
          </div>
        )}

        {/* Mobile nav drawer */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-xl max-h-[calc(100dvh-5.5rem)] overflow-y-auto overscroll-contain">
            {navLinks.map(l => (
              <Link key={l.label} to={l.to} onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between px-6 py-4 text-[11px] uppercase tracking-[0.15em] text-gray-600 hover:text-gold-500 hover:bg-gray-50 border-b border-gray-50">
                {l.label} <span className="text-gray-300">›</span>
              </Link>
            ))}
            <div className="border-t border-gray-100">
              <Link to="/wishlist" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-6 py-4 text-sm text-gray-700 hover:bg-gray-50">
                <Heart size={15} className={wishlistItems.length > 0 ? 'fill-red-400 text-red-400' : ''} />
                Wishlist {wishlistItems.length > 0 && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{wishlistItems.length}</span>}
              </Link>
              {user ? (
                <>
                  <Link to="/my-orders" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-6 py-4 text-sm text-gray-700 hover:bg-gray-50">
                    <Package size={15} /> My Orders
                  </Link>
                  <button onClick={() => { handleLogout(); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2 px-6 py-4 text-sm text-red-600 hover:bg-red-50">
                    <LogOut size={15} /> Sign Out
                  </button>
                </>
              ) : (
                <Link to="/login" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-6 py-4 text-sm text-gray-700 hover:bg-gray-50">
                  <User size={15} /> Sign In / Register
                </Link>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  )
}
