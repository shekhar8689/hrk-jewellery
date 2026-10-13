import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, Truck, CreditCard, CheckCircle, X, ChevronRight, AlertTriangle, Tag, Loader2 } from 'lucide-react'
import { useCart }     from '../context/CartContext'
import { useUserAuth } from '../context/UserAuthContext'
import { getImageUrl } from '../utils/image'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa',
  'Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala',
  'Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland',
  'Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura',
  'Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
]

const PHONE_RE      = /^[6-9][0-9]{9}$/
const PINCODE_RE    = /^[1-9][0-9]{5}$/
const EMAIL_RE      = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CITY_STATE_RE = /^[a-zA-Z\s\-]+$/

function validateForm(form) {
  if (!form.name.trim() || form.name.trim().length < 2) return 'Full name must be at least 2 characters'
  if (!/^[a-zA-Z\s\-.']+$/.test(form.name.trim())) return 'Name must contain letters, spaces, and hyphens only'
  if (!PHONE_RE.test(form.phone.trim())) return 'Phone must be a valid 10-digit Indian mobile number (starts with 6–9)'
  if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) return 'Enter a valid email address'
  if (!form.street.trim() || form.street.trim().length < 5) return 'Street address must be at least 5 characters'
  if (!form.city.trim() || form.city.trim().length < 2) return 'City is required'
  if (!CITY_STATE_RE.test(form.city.trim())) return 'City name cannot contain numbers or special characters'
  if (!PINCODE_RE.test(form.pincode.trim())) return 'Pincode must be a valid 6-digit Indian pincode (e.g. 400001)'
  return null
}

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

const inputClass      = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white transition-shadow'
const inputErrorClass = 'w-full border border-red-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-white transition-shadow'

export default function Checkout() {
  const { items, totalPrice, dispatch } = useCart()
  const { user, getToken }              = useUserAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name:    user?.name  || '',
    phone:   user?.phone || '',
    email:   user?.email || '',
    street:  '',
    city:    '',
    state:   'Maharashtra',
    pincode: '',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const errorRef = useRef(null)

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (fieldErrors[k]) setFieldErrors(fe => ({ ...fe, [k]: '' })) }

  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [screen,    setScreen]   = useState('form')
  const [submitting,setSubmitting]= useState(false)
  const [error,     setError]    = useState('')

  // Coupon state
  const [couponInput,   setCouponInput]   = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError,   setCouponError]   = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)  // { code, discount, description }

  // On phones the form is long: bring errors into view so customers see them
  useEffect(() => {
    if (error && errorRef.current) errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [error])
  useEffect(() => {
    const first = Object.keys(fieldErrors).find(k => fieldErrors[k])
    if (!first) return
    const el = document.querySelector(`form [name="${first}"]`)
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus({ preventScroll: true }) }
  }, [fieldErrors])

  useEffect(() => { document.title = 'Checkout — HRK Jewellery'; return () => { document.title = 'HRK Jewellery' } }, [])

  const shipping   = totalPrice >= 999 ? 0 : 99
  const discount   = appliedCoupon?.discount || 0
  const grandTotal = Math.max(0, totalPrice + shipping - discount)

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-5 px-4 text-center">
        <ShoppingBag size={52} className="text-gray-200" />
        <div>
          <p className="text-gray-700 font-medium text-lg mb-1">Your cart is empty</p>
          <p className="text-gray-400 text-sm">Add some products before checking out</p>
        </div>
        <Link to="/collections" className="btn-gold">Browse Products</Link>
      </div>
    )
  }

  // ── Coupon ─────────────────────────────────────────────────────────────────
  const applyCoupon = async () => {
    if (!couponInput.trim()) return
    setCouponLoading(true); setCouponError('')
    try {
      const res  = await fetch(`${API}/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput.trim(), orderAmount: totalPrice + shipping }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Invalid coupon')
      setAppliedCoupon(data)
      setCouponInput('')
    } catch (e) {
      setCouponError(e.message)
    } finally {
      setCouponLoading(false)
    }
  }

  const removeCoupon = () => { setAppliedCoupon(null); setCouponError('') }

  // ── Order placement ────────────────────────────────────────────────────────
  const buildPayload = (paymentStatus) => ({
    guestInfo: !user ? { name: form.name, email: form.email, phone: form.phone } : undefined,
    shippingAddress: {
      name: form.name.trim(), phone: form.phone.trim(),
      street: form.street.trim(), city: form.city.trim(),
      state: form.state, pincode: form.pincode.trim(),
    },
    items: items.map(item => ({
      product:  item.id || item._id,
      name:     item.name,
      image:    item.images?.[0] || '',
      price:    item.price,
      quantity: item.qty,
      size:     item.selectedSize  || '',
      color:    item.selectedColor || '',
    })),
    totalAmount:   grandTotal,
    couponCode:    appliedCoupon?.code,
    couponDiscount: discount,
    paymentMethod,
    paymentStatus,
  })

  const authHeaders = () => {
    const token = getToken?.()
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  }

  const placeOrder = async (paymentStatus) => {
    const res  = await fetch(`${API}/orders`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(buildPayload(paymentStatus)) })
    const data = await res.json()
    if (!res.ok) {
      if (data.productId && data.available !== undefined) {
        const idx = items.findIndex(i => (i.id || i._id) === String(data.productId))
        if (idx !== -1) dispatch({ type: 'MARK_OUT_OF_STOCK', index: idx })
      }
      throw new Error(data.message || 'Could not place order')
    }
    return data
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    const valErr = validateForm(form)
    if (valErr) { setError(valErr); return }
    const fe = {}
    if (!PHONE_RE.test(form.phone.trim())) fe.phone = 'Must be a 10-digit number starting with 6–9'
    if (!PINCODE_RE.test(form.pincode.trim())) fe.pincode = 'Must be a valid 6-digit Indian pincode'
    if (form.city.trim() && !CITY_STATE_RE.test(form.city.trim())) fe.city = 'City cannot contain numbers'
    if (Object.keys(fe).length) { setFieldErrors(fe); return }

    setSubmitting(true)
    try {
      if (paymentMethod === 'cod') {
        const order = await placeOrder('pending')
        dispatch({ type: 'CLEAR' })
        navigate('/order-success', { state: { order, paid: false } })
      } else {
        setScreen('mock-pay')
      }
    } catch (err) { setError(err.message) }
    finally { setSubmitting(false) }
  }

  const simulatePayment = async (success) => {
    setSubmitting(true); setError('')
    try {
      if (success) {
        const order = await placeOrder('paid')
        dispatch({ type: 'CLEAR' })
        navigate('/order-success', { state: { order, paid: true } })
      } else {
        setScreen('pay-failed')
      }
    } catch (err) { setError(err.message); setScreen('form') }
    finally { setSubmitting(false) }
  }

  /* ── Mock Payment Screen ──────────────────────────────────────────────────── */
  if (screen === 'mock-pay') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
            <CreditCard size={26} className="text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Confirm Payment</h2>
          <p className="text-gray-500 text-sm mb-2">Order total</p>
          <p className="text-4xl font-bold text-gray-900 mb-2">₹{grandTotal.toLocaleString('en-IN')}</p>
          {discount > 0 && (
            <p className="text-sm text-green-600 mb-4 font-medium">
              Coupon <strong>{appliedCoupon.code}</strong> saved ₹{discount.toLocaleString('en-IN')}
            </p>
          )}
          <div className="bg-gray-50 rounded-xl p-4 text-left text-sm mb-6">
            <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold mb-2">Delivering to</p>
            <p className="font-medium text-gray-900">{form.name}</p>
            <p className="text-gray-500">{form.city}, {form.state} — {form.pincode}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-left text-sm text-amber-800 mb-6">
            <p className="font-semibold mb-1">Demo Mode</p>
            <p className="text-xs">Simulated gateway — choose an outcome below.</p>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-xl mb-4 flex items-start gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => simulatePayment(false)} disabled={submitting}
              className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors">
              Fail Payment
            </button>
            <button onClick={() => simulatePayment(true)} disabled={submitting}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors">
              {submitting ? 'Processing…' : 'Pay Now ✓'}
            </button>
          </div>
          <button onClick={() => setScreen('form')} className="mt-4 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            ← Back to checkout
          </button>
        </div>
      </div>
    )
  }

  /* ── Payment Failed Screen ────────────────────────────────────────────────── */
  if (screen === 'pay-failed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
            <X size={26} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Failed</h2>
          <p className="text-gray-500 text-sm mb-8">No order was placed and no money was deducted.</p>
          <button onClick={() => setScreen('mock-pay')}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl text-sm transition-colors mb-3">
            Try Again
          </button>
          <button onClick={() => setScreen('form')}
            className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl text-sm hover:bg-gray-50 transition-colors">
            Change Payment Method
          </button>
        </div>
      </div>
    )
  }

  /* ── Main Form ─────────────────────────────────────────────────────────────── */
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-10">
      <nav className="text-xs text-gray-400 mb-4 md:mb-8 flex items-center gap-2">
        <Link to="/" className="hover:text-gold-500">Home</Link>
        <ChevronRight size={12} />
        <Link to="/collections" className="hover:text-gold-500">Collections</Link>
        <ChevronRight size={12} />
        <span className="text-gray-700">Checkout</span>
      </nav>

      <h1 className="font-serif text-[1.75rem] sm:text-3xl text-gray-800 mb-5 md:mb-8">Checkout</h1>

      {user && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
          <CheckCircle size={16} className="shrink-0" />
          Signed in as <strong>{user.name}</strong> — your order will be linked to your account.
        </div>
      )}

      {error && (
        <div ref={errorRef} role="alert" className="scroll-mt-24 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-6 flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-5 md:gap-8 items-start">

          {/* Left */}
          <div className="space-y-5 md:space-y-6 min-w-0">
            {/* Delivery */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-7 h-7 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">1</span>
                <h2 className="font-semibold text-gray-900">Delivery Details</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Field label="Full Name" required error={fieldErrors.name}>
                    <input required value={form.name} onChange={e => set('name', e.target.value)}
                      placeholder="e.g. Priya Sharma" maxLength={100} autoComplete="name" name="name"
                      className={fieldErrors.name ? inputErrorClass : inputClass} />
                  </Field>
                </div>
                <Field label="Phone Number" required error={fieldErrors.phone}>
                  <input required type="tel" inputMode="numeric" autoComplete="tel-national" name="phone" value={form.phone}
                    onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile number"
                    className={fieldErrors.phone ? inputErrorClass : inputClass} />
                </Field>
                <Field label="Email" error={fieldErrors.email}>
                  <input type="email" inputMode="email" autoComplete="email" name="email" value={form.email} onChange={e => set('email', e.target.value)}
                    placeholder="For order updates (optional)"
                    className={fieldErrors.email ? inputErrorClass : inputClass} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Street Address" required error={fieldErrors.street}>
                    <input required value={form.street} onChange={e => set('street', e.target.value)}
                      placeholder="House / Flat no., Building, Street, Area" maxLength={200} autoComplete="street-address" name="street"
                      className={fieldErrors.street ? inputErrorClass : inputClass} />
                  </Field>
                </div>
                <Field label="City" required error={fieldErrors.city}>
                  <input required value={form.city}
                    onChange={e => set('city', e.target.value.replace(/[^a-zA-Z\s\-]/g, '').slice(0, 50))}
                    placeholder="e.g. Mumbai" autoComplete="address-level2" name="city"
                    className={fieldErrors.city ? inputErrorClass : inputClass} />
                </Field>
                <Field label="Pincode" required error={fieldErrors.pincode}>
                  <input required type="text" inputMode="numeric" autoComplete="postal-code" name="pincode" value={form.pincode}
                    onChange={e => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit pincode"
                    className={fieldErrors.pincode ? inputErrorClass : inputClass} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="State" required>
                    <select required value={form.state} onChange={e => set('state', e.target.value)} autoComplete="address-level1" name="state" className={inputClass}>
                      {STATES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-7 h-7 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">2</span>
                <h2 className="font-semibold text-gray-900">Payment Method</h2>
              </div>
              <div className="space-y-3">
                {[
                  { value: 'cod',    icon: Truck,      title: 'Cash on Delivery',         desc: 'Pay when your order arrives. No advance payment needed.' },
                  { value: 'online', icon: CreditCard, title: 'Online Payment (Demo)',     desc: 'UPI, Cards, Net Banking — simulated for demo.' },
                ].map(({ value, icon: Icon, title, desc }) => (
                  <label key={value}
                    className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      paymentMethod === value ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="payment" value={value}
                      checked={paymentMethod === value} onChange={() => setPaymentMethod(value)}
                      className="accent-amber-500 w-4 h-4" />
                    <Icon size={22} className={paymentMethod === value ? 'text-amber-500' : 'text-gray-400'} />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                    {paymentMethod === value && <CheckCircle size={18} className="ml-auto text-amber-500 shrink-0" />}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Order summary */}
          <div className="lg:sticky lg:top-24 min-w-0">
            <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6">
              <h2 className="font-semibold text-gray-900 mb-5">Order Summary</h2>

              {/* Items */}
              <div className="space-y-4 max-h-64 overflow-y-auto mb-5 pr-1">
                {items.map((item, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-14 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                      {item.images?.[0]
                        ? <img src={getImageUrl(item.images[0], 200)} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-gray-300 text-[10px]">No img</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">{item.name}</p>
                      {(item.selectedColor || item.selectedSize) && (
                        <p className="text-xs text-gray-400 mt-0.5">{[item.selectedColor, item.selectedSize].filter(Boolean).join(' / ')}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">Qty: {item.qty}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 shrink-0">₹{(item.price * item.qty).toLocaleString('en-IN')}</p>
                  </div>
                ))}
              </div>

              {/* Coupon input */}
              <div className="mb-4">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 px-3 py-2.5 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Tag size={14} className="text-green-600" />
                      <span className="text-sm font-semibold text-green-700">{appliedCoupon.code}</span>
                      <span className="text-xs text-green-600">— saved ₹{appliedCoupon.discount.toLocaleString('en-IN')}</span>
                    </div>
                    <button onClick={removeCoupon} className="text-gray-400 hover:text-gray-600 ml-2">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        value={couponInput}
                        onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError('') }}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), applyCoupon())}
                        placeholder="Coupon code"
                        className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 uppercase"
                      />
                      <button type="button" onClick={applyCoupon} disabled={couponLoading || !couponInput.trim()}
                        className="shrink-0 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-40 transition-colors flex items-center gap-1.5">
                        {couponLoading ? <Loader2 size={14} className="animate-spin" /> : <Tag size={14} />}
                        Apply
                      </button>
                    </div>
                    {couponError && <p className="text-xs text-red-600 mt-1.5">{couponError}</p>}
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-100 pt-4 space-y-2.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{totalPrice.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  {shipping === 0
                    ? <span className="text-green-600 font-semibold">FREE</span>
                    : <span>₹{shipping}</span>
                  }
                </div>
                {shipping > 0 && (
                  <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                    Add ₹{(999 - totalPrice).toLocaleString('en-IN')} more for free shipping
                  </p>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Coupon discount</span>
                    <span>−₹{discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <button type="submit" disabled={submitting}
                className="w-full mt-6 py-4 text-sm font-bold tracking-wide uppercase transition-colors disabled:opacity-60 btn-gold">
                {submitting ? 'Please wait…' : paymentMethod === 'cod'
                  ? `Place Order · ₹${grandTotal.toLocaleString('en-IN')}`
                  : `Continue to Pay · ₹${grandTotal.toLocaleString('en-IN')}`}
              </button>
              <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
                🔒 Safe &amp; secure checkout
              </p>
            </div>
          </div>
        </div>
      </form>
    </main>
  )
}
