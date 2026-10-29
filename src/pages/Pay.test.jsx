import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Pay from './Pay'

const order = (over = {}) => ({
  orderId: '94E7178C', status: 'pending', paymentMethod: 'upi', paymentStatus: 'pending', upiRef: '',
  payTo: { upiId: 'hrkjewellery@okaxis', payeeName: 'HRK Jewellery' }, payBy: new Date(Date.now() + 864e5).toISOString(),
  totalAmount: 1709, subtotal: 1899, shippingFee: 0, discount: 190, couponCode: 'FIRST10',
  items: [{ name: 'Gold Necklace', price: 1899, quantity: 1 }],
  deliverTo: { name: 'Riya Shah', city: 'Mumbai', state: 'Maharashtra', pincode: '400053' }, ...over,
})

// A pretend API: /orders/track returns the order, /orders/upi-ref accepts the number
function mockApi(o) {
  const calls = []
  global.fetch = vi.fn(async (url, opts) => {
    const body = opts?.body ? JSON.parse(opts.body) : {}
    calls.push({ url, body })
    if (url.endsWith('/orders/track')) return { ok: true, json: async () => o }
    if (url.endsWith('/orders/upi-ref')) return { ok: true, json: async () => ({ ...o, paymentStatus: 'submitted', upiRef: body.utr }) }
    return { ok: false, json: async () => ({ message: 'not found' }) }
  })
  return calls
}

const renderPay = (state, id = '94E7178C') => render(
  <MemoryRouter initialEntries={[{ pathname: '/pay', search: `?id=${id}`, state }]}><Pay /></MemoryRouter>
)

beforeEach(() => { vi.restoreAllMocks() })

describe('Payment page', () => {
  test('shows the QR code, UPI ID and exact amount', async () => {
    const calls = mockApi(order())
    renderPay({ phone: '9876543210', justPlaced: true })
    expect(await screen.findByText(/Pay ₹1,709 by UPI/)).toBeInTheDocument()
    expect(screen.getByText('Order placed')).toBeInTheDocument()
    expect(screen.getByText('hrkjewellery@okaxis')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByAltText(/UPI QR code to pay ₹1,709/)).toHaveAttribute('src', expect.stringMatching(/^data:image\/png/)))
    expect(calls[0].body).toEqual({ orderId: '94E7178C', phone: '9876543210' })
  })

  test('refuses a transaction number that is not 12 digits, without calling the server', async () => {
    const calls = mockApi(order())
    renderPay({ phone: '9876543210' })
    const input = await screen.findByLabelText(/UPI transaction number/i)
    await userEvent.type(input, '12345678')
    await userEvent.click(screen.getByRole('button', { name: /I have paid/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/12 digits/)
    expect(calls.some(c => c.url.endsWith('/upi-ref'))).toBe(false)
  })

  test('after sending a 12-digit number it says the payment is being checked', async () => {
    const calls = mockApi(order())
    renderPay({ phone: '9876543210' })
    await userEvent.type(await screen.findByLabelText(/UPI transaction number/i), '412345678901')
    await userEvent.click(screen.getByRole('button', { name: /I have paid/i }))
    expect(await screen.findByText(/We're checking your payment/)).toBeInTheDocument()
    expect(calls.find(c => c.url.endsWith('/upi-ref')).body).toEqual({ orderId: '94E7178C', phone: '9876543210', utr: '412345678901' })
  })

  test('opened on another device: asks for the phone number first', async () => {
    const calls = mockApi(order())
    renderPay(undefined)
    expect(screen.getByLabelText(/mobile number you ordered with/i)).toBeInTheDocument()
    expect(calls).toHaveLength(0)
    await userEvent.type(screen.getByLabelText(/mobile number/i), '9876543210')
    await userEvent.click(screen.getByRole('button', { name: /Continue/ }))
    expect(await screen.findByText(/Pay ₹1,709 by UPI/)).toBeInTheDocument()
  })

  test('when the shop could not find the payment, it says so and lets the customer pay again', async () => {
    mockApi(order({ paymentStatus: 'failed', upiRef: '412345678901' }))
    renderPay({ phone: '9876543210' })
    expect(await screen.findByText(/couldn't find a payment/)).toBeInTheDocument()
    expect(screen.getByText(/Pay ₹1,709 by UPI/)).toBeInTheDocument()
  })

  test('a 14-digit number is not silently cut to 12', async () => {
    const calls = mockApi(order())
    renderPay({ phone: '9876543210' })
    const input = await screen.findByLabelText(/UPI transaction number/i)
    await userEvent.type(input, '41234567890155')
    expect(input).toHaveValue('41234567890155')
    await userEvent.click(screen.getByRole('button', { name: /I have paid/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/12 digits/)
    expect(calls.some(c => c.url.endsWith('/upi-ref'))).toBe(false)
  })

  test("pasting PhonePe's own Transaction ID explains which number to use", async () => {
    const calls = mockApi(order())
    renderPay({ phone: '9876543210' })
    await userEvent.type(await screen.findByLabelText(/UPI transaction number/i), 'T2410301234567890123456')
    await userEvent.click(screen.getByRole('button', { name: /I have paid/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/PhonePe.*UTR/)
    expect(calls.some(c => c.url.endsWith('/upi-ref'))).toBe(false)
  })

  test('a number pasted with spaces is sent as 12 digits', async () => {
    const calls = mockApi(order())
    renderPay({ phone: '9876543210' })
    await userEvent.type(await screen.findByLabelText(/UPI transaction number/i), '4123 4567 8901')
    await userEvent.click(screen.getByRole('button', { name: /I have paid/i }))
    await screen.findByText(/We're checking your payment/)
    expect(calls.find(c => c.url.endsWith('/upi-ref')).body.utr).toBe('412345678901')
  })

  test('"Order placed" is not shown once the number is sent', async () => {
    mockApi(order({ paymentStatus: 'submitted', upiRef: '412345678901' }))
    renderPay({ phone: '9876543210', justPlaced: true })
    expect(await screen.findByText(/We're checking your payment/)).toBeInTheDocument()
    expect(screen.queryByText('Order placed')).not.toBeInTheDocument()
  })

  test('a paid order shows "Payment received" and no QR', async () => {
    mockApi(order({ paymentStatus: 'paid', payTo: null }))
    renderPay({ phone: '9876543210' })
    expect(await screen.findByText('Payment received')).toBeInTheDocument()
    expect(screen.queryByAltText(/UPI QR/)).not.toBeInTheDocument()
  })
})
