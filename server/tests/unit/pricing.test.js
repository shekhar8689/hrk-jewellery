const { shippingFor, couponDiscount, FREE_SHIPPING_FROM, SHIPPING_FEE } = require('../../utils/pricing')

const coupon = (over = {}) => ({ code: 'X', type: 'percentage', value: 10, minOrderAmount: 0, maxDiscount: 0, maxUses: 0, usedCount: 0, isActive: true, ...over })

describe('shippingFor', () => {
  test('charges ₹99 below ₹999', () => {
    expect(shippingFor(998)).toBe(SHIPPING_FEE)
    expect(shippingFor(0)).toBe(99)
  })
  test('is free from ₹999 upwards', () => {
    expect(shippingFor(FREE_SHIPPING_FROM)).toBe(0)
    expect(shippingFor(25000)).toBe(0)
  })
})

describe('couponDiscount', () => {
  test('percentage coupon, rounded to whole rupees', () => {
    expect(couponDiscount(coupon(), 1899)).toEqual(expect.objectContaining({ discount: 190 }))
  })
  test('fixed coupon', () => {
    expect(couponDiscount(coupon({ type: 'fixed', value: 250 }), 1899).discount).toBe(250)
  })
  test('never more than the order amount', () => {
    expect(couponDiscount(coupon({ type: 'fixed', value: 5000 }), 1200).discount).toBe(1200)
  })
  test('respects the maximum discount cap', () => {
    expect(couponDiscount(coupon({ value: 50, maxDiscount: 300 }), 2000).discount).toBe(300)
  })
  test.each([
    ['missing coupon', null, /Invalid or expired/],
    ['switched off', coupon({ isActive: false }), /Invalid or expired/],
    ['expired', coupon({ expiresAt: new Date(Date.now() - 1000) }), /expired/],
    ['used up', coupon({ maxUses: 5, usedCount: 5 }), /usage limit/],
    ['below minimum order', coupon({ minOrderAmount: 2000 }), /Minimum order amount of ₹2,000/],
  ])('refuses a coupon that is %s', (_name, c, msg) => {
    expect(couponDiscount(c, 1899).error).toMatch(msg)
  })
  test('unlimited uses when maxUses is 0', () => {
    expect(couponDiscount(coupon({ maxUses: 0, usedCount: 999 }), 1000).error).toBeUndefined()
  })
  test('a future expiry date is fine', () => {
    expect(couponDiscount(coupon({ expiresAt: new Date(Date.now() + 86400e3) }), 1000).discount).toBe(100)
  })
})
