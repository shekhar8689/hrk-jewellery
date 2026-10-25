import { test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { UserAuthProvider } from '../context/UserAuthContext'
import MyOrders from './MyOrders'

const base = { _id: '64b7f0c2a1b2c3d4e5f60718', createdAt: new Date().toISOString(), totalAmount: 1709, items: [{ name: 'Necklace', quantity: 1, price: 1709 }],
  shippingAddress: { name: 'Meera', phone: '9123456789', street: '1 Road', city: 'Pune', state: 'Maharashtra', pincode: '411001' }, statusHistory: [] }

function setup(orders) {
  localStorage.setItem('hrk_user_token', 'tok')
  global.fetch = vi.fn(async url => {
    if (url.endsWith('/auth/me')) return { ok: true, json: async () => ({ name: 'Meera', email: 'm@test.com' }) }
    if (url.endsWith('/orders/my')) return { ok: true, json: async () => orders }
    return { ok: false, json: async () => ({}) }
  })
  render(<MemoryRouter><UserAuthProvider><MyOrders /></UserAuthProvider></MemoryRouter>)
}

test('an unpaid order shows "waiting for payment" and a Pay button without opening details', async () => {
  setup([{ ...base, status: 'pending', paymentMethod: 'upi', paymentStatus: 'pending' }])
  expect(await screen.findByRole('link', { name: /Pay ₹1,709 now/ })).toHaveAttribute('href', '/pay?id=E5F60718')
  expect(screen.getByText(/Waiting for payment/i)).toBeInTheDocument()
})

test('a paid order has no Pay button and cannot be cancelled here', async () => {
  setup([{ ...base, status: 'confirmed', paymentMethod: 'upi', paymentStatus: 'paid' }])
  expect(await screen.findByText(/#E5F60718/)).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /Pay/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Cancel Order/ })).not.toBeInTheDocument()
})
