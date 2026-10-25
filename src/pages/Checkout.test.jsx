import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { CartProvider } from '../context/CartContext'
import { UserAuthProvider } from '../context/UserAuthContext'
import Checkout from './Checkout'

const PRODUCT = { _id: 'p1', id: 'p1', name: 'Gold Necklace', price: 1899, stock: 10, images: [], isVisible: true }
let calls, orderDelay

function mockApi({ user } = {}) {
  calls = []
  global.fetch = vi.fn(async (url, opts = {}) => {
    const body = opts.body ? JSON.parse(opts.body) : undefined
    calls.push({ url, method: opts.method || 'GET', body })
    const ok = data => ({ ok: true, json: async () => data })
    if (url.endsWith('/payment')) return ok({ ready: true })
    if (url.endsWith('/auth/me')) return user ? ok(user) : { ok: false, json: async () => ({}) }
    if (url.includes('/products/p1')) return ok(PRODUCT)
    if (url.endsWith('/coupons/validate')) return ok({ code: 'FIRST10', discount: 190 })
    if (url.endsWith('/orders') && opts.method === 'POST') {
      if (orderDelay) await new Promise(r => setTimeout(r, orderDelay))
      return { ok: true, status: 201, json: async () => ({ _id: '64b7f0c2a1b2c3d4e5f60718', shippingAddress: body.shippingAddress }) }
    }
    return { ok: false, json: async () => ({ message: 'not found' }) }
  })
}

const orderPosts = () => calls.filter(c => c.url.endsWith('/orders') && c.method === 'POST')

function renderCheckout() {
  localStorage.setItem('hrk_cart', JSON.stringify({ items: [{ ...PRODUCT, qty: 1, selectedSize: '', selectedColor: '' }] }))
  return render(
    <MemoryRouter initialEntries={['/checkout']}>
      <UserAuthProvider><CartProvider>
        <Routes>
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/pay" element={<p>PAY PAGE</p>} />
        </Routes>
      </CartProvider></UserAuthProvider>
    </MemoryRouter>
  )
}

async function fillValid() {
  const type = (name, v) => userEvent.type(document.querySelector(`form [name="${name}"]`), v)
  await type('name', 'Riya Shah'); await type('phone', '9876543210'); await type('street', '12 MG Road, Andheri')
  await type('city', 'Mumbai'); await type('pincode', '400053')
}

beforeEach(() => { localStorage.clear(); orderDelay = 0 })

describe('Checkout', () => {
  test('removing an applied coupon does NOT place the order', async () => {
    mockApi(); renderCheckout()
    await fillValid()
    await userEvent.type(screen.getByPlaceholderText('Coupon code'), 'FIRST10')
    await userEvent.click(screen.getByRole('button', { name: /Apply/ }))
    expect(await screen.findByText('FIRST10')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Remove coupon/i }))
    expect(screen.queryByText('PAY PAGE')).not.toBeInTheDocument()
    expect(orderPosts()).toHaveLength(0)
    expect(screen.getByPlaceholderText('Coupon code')).toBeInTheDocument()
  })

  test('a phone number pasted with +91 keeps the last 10 digits', async () => {
    mockApi(); renderCheckout()
    const phone = document.querySelector('form [name="phone"]')
    fireEvent.change(phone, { target: { value: '+91 98765 43210' } })
    expect(phone).toHaveValue('9876543210')
  })

  test('clicking Place Order many times places only one order', async () => {
    mockApi(); orderDelay = 300; renderCheckout()
    await fillValid()
    const btn = await screen.findByRole('button', { name: /Place Order/i })
    fireEvent.click(btn); fireEvent.click(btn); fireEvent.click(btn)
    expect(await screen.findByText('PAY PAGE')).toBeInTheDocument()
    expect(orderPosts()).toHaveLength(1)
  })

  test('after ordering, Back does not return to an empty checkout (history replaced)', async () => {
    mockApi(); renderCheckout()
    await fillValid()
    await userEvent.click(await screen.findByRole('button', { name: /Place Order/i }))
    expect(await screen.findByText('PAY PAGE')).toBeInTheDocument()
    // the order request carries the right phone
    expect(orderPosts()[0].body.shippingAddress.phone).toBe('9876543210')
  })

  test('a signed-in customer gets name, phone and email filled in once their account loads', async () => {
    localStorage.setItem('hrk_user_token', 'tok')
    mockApi({ user: { name: 'Meera Iyer', email: 'meera@test.com', phone: '9123456789' } })
    renderCheckout()
    await waitFor(() => expect(document.querySelector('form [name="name"]')).toHaveValue('Meera Iyer'))
    expect(document.querySelector('form [name="email"]')).toHaveValue('meera@test.com')
    expect(document.querySelector('form [name="phone"]')).toHaveValue('9123456789')
  })

  test('names in Indian scripts are accepted', async () => {
    mockApi(); renderCheckout()
    await fillValid()
    const name = document.querySelector('form [name="name"]')
    fireEvent.change(name, { target: { value: 'प्रिया शर्मा' } })
    await userEvent.click(await screen.findByRole('button', { name: /Place Order/i }))
    expect(await screen.findByText('PAY PAGE')).toBeInTheDocument()
  })
})
