const { UPI_ID_RE, PAYEE_RE, UTR_RE, PAY_WITHIN_HOURS, upiReady } = require('../../utils/upi')

describe('UPI ID format', () => {
  test.each(['hrkjewellery@okaxis', 'shop.hrk@ybl', '9876543210@paytm', 'a_b-c@oksbi'])('accepts %s', id => {
    expect(UPI_ID_RE.test(id)).toBe(true)
  })
  test.each(['', 'hrk', '@okaxis', 'hrk@', 'hrk@@okaxis', 'hrk jewellery@okaxis', 'hrk@ok axis', 'javascript:alert(1)@x', 'HRK@OKAXIS'])('rejects %p', id => {
    expect(UPI_ID_RE.test(id)).toBe(false)
  })
})

test('payee name allows normal shop names only', () => {
  expect(PAYEE_RE.test('HRK Jewellery')).toBe(true)
  expect(PAYEE_RE.test("Riya's Gold & Co.")).toBe(true)
  expect(PAYEE_RE.test('<script>')).toBe(false)
  expect(PAYEE_RE.test('A')).toBe(false)
})

test('UPI transaction number is exactly 12 digits', () => {
  expect(UTR_RE.test('412345678901')).toBe(true)
  expect(UTR_RE.test('41234567890')).toBe(false)
  expect(UTR_RE.test('4123456789012')).toBe(false)
  expect(UTR_RE.test('41234567890a')).toBe(false)
})

test('upiReady only when a valid UPI ID is saved', () => {
  expect(upiReady({ upiId: 'hrk@okaxis' })).toBe(true)
  expect(upiReady({ upiId: '' })).toBe(false)
  expect(upiReady(null)).toBe(false)
})

test('unpaid orders are kept for 24 hours', () => {
  expect(PAY_WITHIN_HOURS).toBe(24)
})
