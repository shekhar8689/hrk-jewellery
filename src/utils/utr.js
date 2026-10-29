/**
 * The number customers type after paying. Every UPI app and your bank show
 * the same 12-digit number for a payment (Google Pay: "UPI transaction ID",
 * PhonePe: "UTR", Paytm: "UPI Ref No."). Apps also show their own longer IDs
 * with letters, which are no use for matching the payment in your bank.
 */
export function checkUtr(typed) {
  const raw = String(typed || '').trim()
  // A 12-digit run anywhere ("UTR: 4123 4567 8901")
  const compact = raw.replace(/[\s-]/g, '')
  const twelve = compact.match(/(?<!\d)\d{12}(?!\d)/)
  if (twelve && compact.replace(/^(UTR|UPI|REF|NO|[:.#])+/i, '').length <= 12) return { utr: twelve[0] }
  if (/^T\d{10,}/i.test(compact))
    return { error: "That is PhonePe's own Transaction ID. Please enter the 12-digit UTR shown on the same payment screen." }
  if (/[a-z]/i.test(compact) && compact.length >= 10)
    return { error: "That looks like the app's own ID. Please enter the 12-digit number called UPI transaction ID, UTR or UPI Ref No." }
  return { error: 'The UPI transaction number has 12 digits. Please check it in your payment app.' }
}
