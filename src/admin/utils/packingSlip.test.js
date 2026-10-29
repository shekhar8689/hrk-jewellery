import { test, expect } from 'vitest'
import { packingSlipHtml } from './packingSlip'

const order = {
  _id: '64b7f0c2a1b2c3d4e5f60718', createdAt: '2026-10-29T10:00:00Z', totalAmount: 1709, paymentMethod: 'upi', paymentStatus: 'paid', upiRef: '412345678901',
  shippingAddress: { name: 'Riya <script>alert(1)</script> Shah', phone: '9876543210', street: '12 MG Road & Co', city: 'Mumbai', state: 'Maharashtra', pincode: '400053' },
  items: [{ name: 'Kundan Ring', quantity: 2, size: '7', color: 'Gold', price: 950 }],
}

test('has the order ID, full delivery address, phone and items to pack', () => {
  const html = packingSlipHtml(order, { shopName: 'HRK Jewellery', shopPhone: '+91 90000 00000' })
  expect(html).toContain('#E5F60718')
  expect(html).toContain('12 MG Road &amp; Co')
  expect(html).toContain('Mumbai, Maharashtra 400053')
  expect(html).toContain('9876543210')
  expect(html).toMatch(/Kundan Ring[\s\S]*Size 7[\s\S]*Gold[\s\S]*× 2/)
  expect(html).toContain('PAID by UPI')
  expect(html).toContain('HRK Jewellery')
})

test('text typed by customers cannot run code on the slip', () => {
  const html = packingSlipHtml(order, { shopName: 'HRK Jewellery' })
  expect(html).not.toContain('<script>alert(1)</script>')
  expect(html).toContain('&lt;script&gt;')
})

test('an unpaid order is clearly marked NOT PAID so it is not shipped by mistake', () => {
  expect(packingSlipHtml({ ...order, paymentStatus: 'submitted' }, {})).toContain('NOT PAID')
})
