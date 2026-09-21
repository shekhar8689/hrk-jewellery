import { useState } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { CartProvider }      from './context/CartContext'
import { AdminAuthProvider } from './admin/context/AdminAuthContext'
import { UserAuthProvider }  from './context/UserAuthContext'
import { WishlistProvider }  from './context/WishlistContext'

/* Layout */
import Header from './components/Header'
import Footer from './components/Footer'
import Cart   from './components/Cart'

/* Public pages */
import Home          from './pages/Home'
import Collections   from './pages/Collections'
import ProductDetail from './pages/ProductDetail'
import Checkout      from './pages/Checkout'
import OrderSuccess  from './pages/OrderSuccess'
import Login         from './pages/Login'
import Register      from './pages/Register'
import MyOrders      from './pages/MyOrders'
import Wishlist      from './pages/Wishlist'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword  from './pages/ResetPassword'

/* Static / info pages */
import About          from './pages/About'
import Contact        from './pages/Contact'
import PrivacyPolicy  from './pages/PrivacyPolicy'
import TermsConditions from './pages/TermsConditions'
import ShippingPolicy  from './pages/ShippingPolicy'
import ReturnPolicy    from './pages/ReturnPolicy'
import FAQ             from './pages/FAQ'

/* Admin pages */
import AdminLogin    from './admin/pages/AdminLogin'
import Dashboard     from './admin/pages/Dashboard'
import Products      from './admin/pages/Products'
import Orders        from './admin/pages/Orders'
import AdminUsers    from './admin/pages/AdminUsers'
import Banners       from './admin/pages/Banners'
import AdminReviews  from './admin/pages/Reviews'
import AdminCoupons  from './admin/pages/Coupons'
import ProtectedRoute from './admin/components/ProtectedRoute'

/* ─── Public site wrapper ──────────────────────────────────────────────────── */
function PublicSite() {
  const [cartOpen, setCartOpen] = useState(false)

  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col">
        <Header onCartOpen={() => setCartOpen(true)} />
        <Cart open={cartOpen} onClose={() => setCartOpen(false)} />

        <div className="flex-1">
          <Routes>
            <Route path="/"                      element={<Home />} />
            <Route path="/collections"           element={<Collections />} />
            <Route path="/collections/:category" element={<Collections />} />
            <Route path="/product/:id"           element={<ProductDetail onCartOpen={() => setCartOpen(true)} />} />
            <Route path="/checkout"              element={<Checkout />} />
            <Route path="/order-success"         element={<OrderSuccess />} />
            <Route path="/login"                 element={<Login />} />
            <Route path="/register"              element={<Register />} />
            <Route path="/my-orders"             element={<MyOrders />} />
            <Route path="/wishlist"              element={<Wishlist />} />
            <Route path="/forgot-password"       element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* Info pages */}
            <Route path="/about"           element={<About />} />
            <Route path="/contact"         element={<Contact />} />
            <Route path="/privacy-policy"  element={<PrivacyPolicy />} />
            <Route path="/terms"           element={<TermsConditions />} />
            <Route path="/shipping-policy" element={<ShippingPolicy />} />
            <Route path="/return-policy"   element={<ReturnPolicy />} />
            <Route path="/faq"             element={<FAQ />} />

            {/* 404 */}
            <Route path="*" element={
              <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
                <h1 className="font-serif text-6xl text-gray-200">404</h1>
                <p className="text-gray-500 text-lg">Page not found</p>
                <Link to="/" className="btn-gold">Go Home</Link>
              </div>
            } />
          </Routes>
        </div>

        <Footer />
      </div>
    </CartProvider>
  )
}

/* ─── Root app ─────────────────────────────────────────────────────────────── */
export default function App() {
  return (
    <UserAuthProvider>
      <WishlistProvider>
        <AdminAuthProvider>
          <Routes>
            {/* Admin routes */}
            <Route path="/admin/login"     element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/admin/products"  element={<ProtectedRoute><Products /></ProtectedRoute>} />
            <Route path="/admin/orders"    element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path="/admin/users"     element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/banners"   element={<ProtectedRoute><Banners /></ProtectedRoute>} />
            <Route path="/admin/reviews"   element={<ProtectedRoute><AdminReviews /></ProtectedRoute>} />
            <Route path="/admin/coupons"   element={<ProtectedRoute><AdminCoupons /></ProtectedRoute>} />

            {/* Everything else → public site */}
            <Route path="/*" element={<PublicSite />} />
          </Routes>
        </AdminAuthProvider>
      </WishlistProvider>
    </UserAuthProvider>
  )
}
