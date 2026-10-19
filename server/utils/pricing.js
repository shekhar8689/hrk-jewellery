/*
 * Order pricing rules, used by the server when an order is placed.
 * The browser shows the same numbers, but the server never trusts them.
 */
const FREE_SHIPPING_FROM = 999   // ₹ — orders at or above this ship free
const SHIPPING_FEE       = 99    // ₹ — otherwise

const shippingFor = (subtotal) => (subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE)

/**
 * Check a coupon and work out its discount for an order amount.
 * Returns { coupon, discount } or { error }.
 */
function couponDiscount(coupon, amount) {
  if (!coupon || !coupon.isActive)                        return { error: 'Invalid or expired coupon code' }
  if (coupon.expiresAt && new Date() > coupon.expiresAt)  return { error: 'This coupon has expired' }
  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses)
    return { error: 'This coupon has reached its usage limit' }
  if (amount < coupon.minOrderAmount)
    return { error: `Minimum order amount of ₹${coupon.minOrderAmount.toLocaleString('en-IN')} required for this coupon` }

  let discount = coupon.type === 'percentage' ? (amount * coupon.value) / 100 : coupon.value
  if (coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount)
  discount = Math.min(discount, amount)
  // Whole rupees, so Cash on Delivery amounts never have paise
  return { coupon, discount: Math.round(discount) }
}

module.exports = { FREE_SHIPPING_FROM, SHIPPING_FEE, shippingFor, couponDiscount }
