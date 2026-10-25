/**
 * UPI payment links. The same link is used for the QR code (scanned with any
 * UPI app) and for the "Pay with UPI app" buttons on phones.
 */
const enc = encodeURIComponent

const params = ({ upiId, payeeName, amount, note }) =>
  `pa=${enc(upiId)}&pn=${enc(payeeName || '')}&am=${Number(amount).toFixed(2)}&cu=INR&tn=${enc((note || '').slice(0, 50))}`

// Works with every UPI app (Android shows a list of apps to choose from)
export const upiLink = p => `upi://pay?${params(p)}`

// Opens one particular app (needed on iPhone, where upi:// does not show a list)
export const UPI_APPS = [
  { name: 'Google Pay', link: p => `tez://upi/pay?${params(p)}` },
  { name: 'PhonePe',    link: p => `phonepe://pay?${params(p)}` },
  { name: 'Paytm',      link: p => `paytmmp://pay?${params(p)}` },
]

export const isPhone = () =>
  typeof navigator !== 'undefined' &&
  (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.matchMedia?.('(pointer: coarse)').matches)

export const isIOS = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent)

export const orderNote = shortId => `HRK Order ${shortId}`

// Remember the phone number used for an order in this browser tab, so the
// payment page can reload the order without asking again
export const rememberPhone = (shortId, phone) => { try { sessionStorage.setItem(`hrk_pay_${shortId}`, phone) } catch { /* private mode */ } }
export const recallPhone   = shortId => { try { return sessionStorage.getItem(`hrk_pay_${shortId}`) || '' } catch { return '' } }

// An order still waiting for the customer to pay (or to pay again)
export const needsPayment = o => o?.paymentMethod === 'upi' && o.status === 'pending' && ['pending', 'failed'].includes(o.paymentStatus)
