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

  test('no transaction number to type: "I have paid" just tells the shop', async () => {
    const calls = mockApi(order())
    renderPay({ phone: '9876543210' })
    await screen.findByText(/Pay ₹1,709 by UPI/)
    expect(screen.queryByLabelText(/transaction number/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/12-digit/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /I have paid/i }))
    expect(await screen.findByText(/We're checking your payment/)).toBeInTheDocument()
    expect(calls.find(c => c.url.endsWith('/upi-ref')).body).toEqual({ orderId: '94E7178C', phone: '9876543210' })
    expect(screen.queryByText(/Transaction number/)).not.toBeInTheDocument()
  })

  test('the QR and app buttons leave the amount for the customer to type, and the page shows the exact amount', async () => {
    Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Linux; Android 14)', configurable: true })
    mockApi(order())
    renderPay({ phone: '9876543210' })
    const btn = await screen.findByRole('link', { name: /Open UPI app/i })
    expect(btn.getAttribute('href')).toMatch(/^upi:\/\/pay\?pa=hrkjewellery%40okaxis/)
    expect(btn.getAttribute('href')).not.toMatch(/am=/)
    expect(btn.getAttribute('href')).toMatch(/tn=HRK%20Order%2094E7178C/)
    for (const a of screen.getAllByRole('link').filter(l => /^(tez|phonepe|paytmmp):/.test(l.getAttribute('href') || ''))) expect(a.getAttribute('href')).not.toMatch(/am=/)
    expect(screen.getAllByText(/type ₹1,709/i).length).toBeGreaterThan(0)
  })

  test('on a phone the QR comes first: save it, then scan it from the gallery in the UPI app', async () => {
    Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Linux; Android 14)', configurable: true })
    mockApi(order())
    renderPay({ phone: '9876543210' })
    await waitFor(() => expect(screen.getByAltText(/UPI QR code/)).toHaveAttribute('src', expect.stringMatching(/^data:image\/png/)))
    const save = screen.getByRole('link', { name: /Save QR/i })
    expect(save).toHaveAttribute('download', 'HRK-Order-94E7178C-QR.png')
    expect(screen.getByText(/Upload from gallery/i)).toBeInTheDocument()
    // the QR and the save button come before the app buttons on the page
    const app = screen.getByRole('link', { name: /Open UPI app/i })
    expect(save.compareDocumentPosition(app) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(app.className).not.toMatch(/btn-gold/)
  })

  test('business UPI ID: one-tap Pay button with the amount filled in, and the QR below it', async () => {
    Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Linux; Android 14)', configurable: true })
    mockApi(order({ payTo: { upiId: 'q123456@ybl', payeeName: 'HRK Jewellery', business: true } }))
    renderPay({ phone: '9876543210' })
    const pay = await screen.findByRole('link', { name: /^Pay ₹1,709$/ })
    expect(pay.getAttribute('href')).toMatch(/^upi:\/\/pay\?pa=q123456%40ybl/)
    expect(pay.getAttribute('href')).toMatch(/am=1709\.00/)
    expect(pay.className).toMatch(/btn-gold/)
    for (const a of screen.getAllByRole('link').filter(l => /^(tez|phonepe|paytmmp):/.test(l.getAttribute('href') || ''))) expect(a.getAttribute('href')).toMatch(/am=1709\.00/)
    await waitFor(() => expect(screen.getByAltText(/UPI QR code/)).toHaveAttribute('src', expect.stringMatching(/^data:image\/png/)))
    expect(pay.compareDocumentPosition(screen.getByAltText(/UPI QR code/)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByText(/Upload from gallery/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/type ₹1,709/i)).not.toBeInTheDocument()
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
    expect(await screen.findByText(/couldn't find your payment/)).toBeInTheDocument()
    expect(screen.getByText(/Pay ₹1,709 by UPI/)).toBeInTheDocument()
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
