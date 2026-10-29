import { test, expect } from 'vitest'
import { packingSlipHtml, slipsHtml } from './packingSlip'

const order = {
  _id: '64b7f0c2a1b2c3d4e5f60718', createdAt: '2026-10-29T10:00:00Z', paidAt: '2026-10-29T11:30:00Z',
  subtotal: 1899, shippingFee: 0, discount: 190, couponCode: 'FIRST10', totalAmount: 1709,
  paymentMethod: 'upi', paymentStatus: 'paid', upiRef: '412345678901',
  shippingAddress: { name: 'Riya <script>alert(1)</script> Shah', phone: '9876543210', street: '12 MG Road & Co', city: 'Mumbai', state: 'Maharashtra', pincode: '400053' },
  items: [{ name: 'Kundan Ring', quantity: 1, size: '7', color: 'Gold', price: 950 }, { name: 'Pearl Studs', quantity: 1, price: 949 }],
}
const shop = { shopName: 'HRK Jewellery', shopPhone: '+91 86898 14335', shopAddress: 'Pune, Maharashtra', shopEmail: 'orders@hrk.in' }

test('the label has the full delivery address, big pincode, phone, sender and order ID', () => {
  const h = packingSlipHtml(order, shop)
  expect(h).toContain('12 MG Road &amp; Co')
  expect(h).toMatch(/Mumbai, Maharashtra[\s\S]*400053/)
  expect(h).toContain('9876543210')
  expect(h).toMatch(/From[\s\S]*HRK Jewellery[\s\S]*Pune, Maharashtra[\s\S]*\+91 86898 14335/)
  expect(h).toContain('#E5F60718')
})

test('paid orders tell the courier not to collect cash', () => {
  expect(packingSlipHtml(order, shop)).toMatch(/PREPAID[\s\S]*do not collect cash/i)
})

test('the bill lists each item with price and amount, then subtotal, shipping, coupon and total', () => {
  const h = packingSlipHtml(order, shop)
  expect(h).toMatch(/Kundan Ring[\s\S]*Size 7[\s\S]*Gold[\s\S]*₹950/)
  expect(h).toMatch(/Pearl Studs[\s\S]*₹949/)
  expect(h).toMatch(/Subtotal[\s\S]*₹1,899/)
  expect(h).toMatch(/Shipping[\s\S]*Free/)
  expect(h).toMatch(/Coupon FIRST10[\s\S]*−₹190/)
  expect(h).toMatch(/Total paid[\s\S]*₹1,709/)
  expect(h).toContain('412345678901')
  expect(h).toMatch(/Bill No\.?[\s\S]*E5F60718/)
  expect(h).toMatch(/cut here/i)
})

test('text typed by customers cannot run code on the slip', () => {
  const h = packingSlipHtml(order, shop)
  expect(h).not.toContain('<script>alert(1)</script>')
  expect(h).toContain('&lt;script&gt;')
})

test('an unpaid order is marked NOT PAID and never says prepaid', () => {
  const h = packingSlipHtml({ ...order, paymentStatus: 'submitted' }, shop)
  expect(h).toContain('NOT PAID')
  expect(h).not.toMatch(/PREPAID/)
})

test('many orders print together, one page each', () => {
  const h = slipsHtml([order, { ...order, _id: '64b7f0c2a1b2c3d4e5f60719' }], shop)
  expect(h.match(/class="slip"/g)).toHaveLength(2)
  expect(h).toContain('page-break-after')
  expect(h).toContain('#E5F60719')
})
