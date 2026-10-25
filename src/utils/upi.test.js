import { describe, test, expect } from 'vitest'
import { upiLink, UPI_APPS, needsPayment, orderNote, rememberPhone, recallPhone } from './upi'

const pay = { upiId: 'hrkjewellery@okaxis', payeeName: 'HRK Jewellery', amount: 1709, note: orderNote('94E7178C') }

describe('upiLink', () => {
  test('has the UPI ID, name, exact amount in rupees and order note', () => {
    expect(upiLink(pay)).toBe('upi://pay?pa=hrkjewellery%40okaxis&pn=HRK%20Jewellery&am=1709.00&cu=INR&tn=HRK%20Order%2094E7178C')
  })
  test('keeps paise', () => {
    expect(upiLink({ ...pay, amount: 1709.1 })).toContain('am=1709.10')
  })
  test('special characters in the name cannot add or change fields', () => {
    const link = upiLink({ ...pay, payeeName: 'Shop&am=1&pa=thief@ybl' })
    const params = new URLSearchParams(link.split('?')[1])
    expect(params.get('pa')).toBe('hrkjewellery@okaxis')
    expect(params.get('am')).toBe('1709.00')
    expect(params.getAll('am')).toHaveLength(1)
  })
  test('note is cut to 50 characters', () => {
    const params = new URLSearchParams(upiLink({ ...pay, note: 'x'.repeat(80) }).split('?')[1])
    expect(params.get('tn')).toHaveLength(50)
  })
})

test('app-specific links use each app and the same details', () => {
  const links = UPI_APPS.map(a => a.link(pay))
  expect(links.map(l => l.split('?')[0])).toEqual(['tez://upi/pay', 'phonepe://pay', 'paytmmp://pay'])
  for (const l of links) expect(l).toContain('am=1709.00')
})

describe('needsPayment', () => {
  const o = { paymentMethod: 'upi', status: 'pending', paymentStatus: 'pending' }
  test.each([
    [o, true],
    [{ ...o, paymentStatus: 'failed' }, true],
    [{ ...o, paymentStatus: 'submitted' }, false],
    [{ ...o, paymentStatus: 'paid' }, false],
    [{ ...o, status: 'cancelled' }, false],
    [{ ...o, paymentMethod: 'cod' }, false],
    [null, false],
  ])('%o → %s', (order, expected) => { expect(!!needsPayment(order)).toBe(expected) })
})

test('remembers the phone number per order in this tab', () => {
  rememberPhone('ABCDEF12', '9876543210')
  expect(recallPhone('ABCDEF12')).toBe('9876543210')
  expect(recallPhone('00000000')).toBe('')
})
