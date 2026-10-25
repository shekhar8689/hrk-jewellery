import { useState, lazy, Suspense } from 'react'
import { Routes, Route, Link, Navigate } from 'react-router-dom'
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
const Collections = lazy(() => import('./pages/Collections'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Pay = lazy(() => import('./pages/Pay'))
const TrackOrder = lazy(() => import('./pages/TrackOrder'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const MyOrders = lazy(() => import('./pages/MyOrders'))
const Wishlist = lazy(() => import('./pages/Wishlist'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))

/* Static / info pages */
const About = lazy(() => import('./pages/About'))
const Contact = lazy(() => import('./pages/Contact'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const TermsConditions = lazy(() => import('./pages/TermsConditions'))
const ShippingPolicy = lazy(() => import('./pages/ShippingPolicy'))
const ReturnPolicy = lazy(() => import('./pages/ReturnPolicy'))
const FAQ = lazy(() => import('./pages/FAQ'))

/* Admin pages */
const AdminLogin = lazy(() => import('./admin/pages/AdminLogin'))
const Dashboard = lazy(() => import('./admin/pages/Dashboard'))
const Products = lazy(() => import('./admin/pages/Products'))
const Orders = lazy(() => import('./admin/pages/Orders'))
const AdminUsers = lazy(() => import('./admin/pages/AdminUsers'))
const Banners = lazy(() => import('./admin/pages/Banners'))
const AdminCategories = lazy(() => import('./admin/pages/Categories'))
const AdminOffer = lazy(() => import('./admin/pages/OfferBanner'))
const AdminReviews = lazy(() => import('./admin/pages/Reviews'))
const AdminCoupons = lazy(() => import('./admin/pages/Coupons'))
const AdminPayments = lazy(() => import('./admin/pages/Payments'))
const AdminMessages = lazy(() => import('./admin/pages/Messages'))
import ProtectedRoute from './admin/components/ProtectedRoute'


/* Shown for a moment while a page's code downloads */
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="w-8 h-8 border-2 border-gray-200 border-t-amber-500 rounded-full animate-spin" />
  </div>
)

/* ─── Public site wrapper ──────────────────────────────────────────────────── */
function PublicSite() {
  const [cartOpen, setCartOpen] = useState(false)

  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col">
        <Header onCartOpen={() => setCartOpen(true)} />
        <Cart open={cartOpen} onClose={() => setCartOpen(false)} />

        <div className="flex-1">
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"                      element={<Home />} />
            <Route path="/collections"           element={<Collections />} />
            <Route path="/collections/:category" element={<Collections />} />
            <Route path="/product/:id"           element={<ProductDetail onCartOpen={() => setCartOpen(true)} />} />
            <Route path="/checkout"              element={<Checkout />} />
            <Route path="/pay"                   element={<Pay />} />
            <Route path="/order-success"         element={<Navigate to="/track-order" replace />} />
            <Route path="/track-order"           element={<TrackOrder />} />
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
          </Suspense>
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
          <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Admin routes */}
            <Route path="/admin/login"     element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/admin/products"  element={<ProtectedRoute><Products /></ProtectedRoute>} />
            <Route path="/admin/orders"    element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path="/admin/users"     element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/banners"   element={<ProtectedRoute><Banners /></ProtectedRoute>} />
            <Route path="/admin/categories" element={<ProtectedRoute><AdminCategories /></ProtectedRoute>} />
            <Route path="/admin/offer"     element={<ProtectedRoute><AdminOffer /></ProtectedRoute>} />
            <Route path="/admin/reviews"   element={<ProtectedRoute><AdminReviews /></ProtectedRoute>} />
            <Route path="/admin/coupons"   element={<ProtectedRoute><AdminCoupons /></ProtectedRoute>} />
            <Route path="/admin/payments"  element={<ProtectedRoute><AdminPayments /></ProtectedRoute>} />
            <Route path="/admin/messages"  element={<ProtectedRoute><AdminMessages /></ProtectedRoute>} />

            {/* Everything else → public site */}
            <Route path="/*" element={<PublicSite />} />
          </Routes>
          </Suspense>
        </AdminAuthProvider>
      </WishlistProvider>
    </UserAuthProvider>
  )
}
