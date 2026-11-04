/*
 * Emails the shop owner when something needs them:
 *   - a new order was placed (waiting for the customer to pay)
 *   - the customer sent their UPI transaction number (check it in the bank app)
 * Goes to Admin → Shop Settings → Order alerts. Never throws and never delays
 * the customer: call it without await after answering the request.
 */
const ShopSettings = require('../models/ShopSettings')
const email = require('./email')

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const rupees = n => `₹${Number(n || 0).toLocaleString('en-IN')}`
const shortId = o => String(o._id).slice(-8).toUpperCase()

async function alertTo() {
  const s = await ShopSettings.findOne({ key: 'main' }).select('alertEmail').lean()
  return (s && s.alertEmail) || ''
}

function layout(heading, intro, order, extraRows, button) {
  const a = order.shippingAddress || {}
  const items = (order.items || []).map(i => `
    <tr><td style="padding:6px 0;border-bottom:1px solid #eee">${esc(i.name)}${i.size ? ` · Size ${esc(i.size)}` : ''}${i.color ? ` · ${esc(i.color)}` : ''}</td>
        <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:center">× ${esc(i.quantity)}</td>
        <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right">${rupees((i.price || 0) * (i.quantity || 0))}</td></tr>`).join('')
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#111">
<h2 style="font-weight:normal;margin:0 0 4px">HRK <span style="color:#c2662d">Jewellery</span></h2>
<h3 style="margin:16px 0 6px">${heading}</h3>
<p style="margin:0 0 14px;color:#444">${intro}</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">
  <tr><td style="color:#666;padding:3px 0">Order</td><td style="text-align:right"><b>#${shortId(order)}</b></td></tr>
  <tr><td style="color:#666;padding:3px 0">Amount</td><td style="text-align:right"><b>${rupees(order.totalAmount)}</b></td></tr>
  ${extraRows}
  <tr><td style="color:#666;padding:3px 0">Customer</td><td style="text-align:right">${esc(a.name)} · ${esc(a.phone)}</td></tr>
  <tr><td style="color:#666;padding:3px 0">Deliver to</td><td style="text-align:right">${esc(a.city)}, ${esc(a.state)} ${esc(a.pincode)}</td></tr>
</table>
<table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:14px">${items}</table>
${order.couponCode ? `<p style="font-size:13px;color:#666">Coupon ${esc(order.couponCode)}: −${rupees(order.discount)}</p>` : ''}
<p style="margin:22px 0"><a href="${esc(button.href)}" style="display:inline-block;background:#c2662d;color:#fff;padding:12px 22px;text-decoration:none;border-radius:4px">${esc(button.label)}</a></p>
<p style="font-size:12px;color:#888">You get these emails because an order alert address is set in Admin → Shop Settings.</p></div>`
}

async function send(build) {
  try {
    const to = await alertTo()
    if (!to) return { sent: false, skipped: true }
    const { subject, html, text } = build()
    return await email.sendEmail({ to, subject, html, text })
  } catch (err) {
    console.error('Order alert not sent:', err.message)
    return { sent: false, problem: err.message }
  }
}

const notifyNewOrder = order => send(() => {
  const url = `${email.siteUrl()}/admin/orders`
  return {
    subject: `🛍️ New order #${shortId(order)} · ${rupees(order.totalAmount)}`,
    text: `New order #${shortId(order)} for ${rupees(order.totalAmount)} from ${order.shippingAddress?.name}. Waiting for UPI payment. ${url}`,
    html: layout('New order placed', 'The customer is now paying by UPI. You get another email when they send the transaction number.',
      order, '<tr><td style="color:#666;padding:3px 0">Payment</td><td style="text-align:right">Waiting for UPI payment</td></tr>',
      { href: url, label: 'Open Orders' }),
  }
})

const notifyPaymentSubmitted = order => send(() => {
  const url = `${email.siteUrl()}/admin/orders?payment=submitted`
  return {
    subject: `💰 Payment to check · #${shortId(order)} · ${rupees(order.totalAmount)}`,
    text: `Order #${shortId(order)}: customer paid ${rupees(order.totalAmount)}, UPI Ref ${order.upiRef}. Check your bank/UPI app, then mark Payment received. ${url}`,
    html: layout('Payment to check', `Find <b>UPI Ref ${esc(order.upiRef)}</b> for <b>${rupees(order.totalAmount)}</b> in your bank or UPI app, then click <b>Payment received</b> on the order.`,
      order, `<tr><td style="color:#666;padding:3px 0">UPI Ref No.</td><td style="text-align:right"><b>${esc(order.upiRef)}</b></td></tr>`,
      { href: url, label: 'Check payment' }),
  }
})

module.exports = { notifyNewOrder, notifyPaymentSubmitted, alertTo }
