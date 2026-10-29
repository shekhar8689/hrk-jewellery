/**
 * Printable page per order, on A4:
 *   top    — shipping label to cut out and stick on the box
 *   bottom — the customer's bill (items, prices, total paid) to put inside
 * Customer text is escaped so it can't run as code.
 */
import { RETURN_REPORT_WINDOW } from '../../config/policy'

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const rupees = n => `₹${Number(n || 0).toLocaleString('en-IN')}`
const date = d => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

const CSS = `
  *{box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;font-size:13px}
  .bar{padding:12px 16px;background:#f3f4f6;border-bottom:1px solid #ddd}
  .bar button{padding:8px 16px;font-size:14px;cursor:pointer}
  .slip{width:190mm;margin:10mm auto;page-break-after:always;break-after:page}
  .slip:last-child{page-break-after:auto;break-after:auto}
  .label{width:150mm;min-height:100mm;border:2px solid #111;border-radius:6px;padding:6mm 7mm}
  .row{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
  .tag{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#555}
  .to-name{font-size:22px;font-weight:bold;margin:2px 0 4px}
  .to-addr{font-size:16px;line-height:1.4}
  .pin{font-size:26px;font-weight:bold;letter-spacing:.06em;margin-top:4px}
  .phone{font-size:16px;margin-top:4px}
  .order{font-size:15px;font-weight:bold;text-align:right}
  .prepaid{display:inline-block;margin-top:4px;border:2px solid #111;padding:3px 8px;font-weight:bold;font-size:12px}
  .notpaid{display:inline-block;margin-top:4px;background:#fee2e2;color:#991b1b;border:2px solid #991b1b;padding:3px 8px;font-weight:bold}
  .from{margin-top:5mm;padding-top:3mm;border-top:1px solid #999;font-size:12px;line-height:1.4}
  .cut{margin:7mm 0;border-top:2px dashed #888;text-align:center;font-size:10px;color:#666;letter-spacing:.2em}
  .cut span{position:relative;top:-8px;background:#fff;padding:0 8px}
  h2{font-size:18px;margin:0 0 2px}
  .muted{color:#555}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin:4mm 0}
  table{width:100%;border-collapse:collapse}
  th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#555;border-bottom:1.5px solid #111;padding:6px 4px}
  td{border-bottom:1px solid #ddd;padding:7px 4px;vertical-align:top}
  .r{text-align:right;white-space:nowrap}
  .tick{width:18px}td.tick:after{content:'';display:inline-block;width:12px;height:12px;border:1.5px solid #333}
  .totals td{border:none;padding:3px 4px}
  .grand td{font-size:15px;font-weight:bold;border-top:1.5px solid #111;padding-top:6px}
  .note{margin-top:5mm;font-size:11px;color:#555}
  @page{size:A4;margin:0}
  @media print{.bar{display:none}.slip{margin:8mm auto}}
`

function slip(order, { shopName = 'HRK Jewellery', shopPhone = '', shopAddress = '', shopEmail = '' } = {}) {
  const a = order.shippingAddress || {}
  const id = String(order._id || '').slice(-8).toUpperCase()
  const paid = order.paymentStatus === 'paid'
  const items = order.items || []
  const subtotal = order.subtotal || items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 0), 0)
  const rows = items.map(i => `
        <tr><td class="tick"></td>
            <td>${esc(i.name)}${i.size ? ` · Size ${esc(i.size)}` : ''}${i.color ? ` · ${esc(i.color)}` : ''}</td>
            <td class="r">${esc(i.quantity)}</td><td class="r">${rupees(i.price)}</td><td class="r">${rupees((i.price || 0) * (i.quantity || 0))}</td></tr>`).join('')

  return `
<div class="slip">
  <div class="label">
    <div class="row">
      <div class="tag">Deliver to</div>
      <div class="order">Order #${id}<br>${paid
        ? '<span class="prepaid">PREPAID · do not collect cash</span>'
        : '<span class="notpaid">NOT PAID — do not ship</span>'}</div>
    </div>
    <div class="to-name">${esc(a.name)}</div>
    <div class="to-addr">${esc(a.street)}<br>${esc(a.city)}, ${esc(a.state)}</div>
    <div class="pin">PIN ${esc(a.pincode)}</div>
    <div class="phone">Phone: <b>${esc(a.phone)}</b></div>
    <div class="from"><span class="tag">From</span><br><b>${esc(shopName)}</b>${shopAddress ? `<br>${esc(shopAddress)}` : ''}${shopPhone ? `<br>Phone: ${esc(shopPhone)}` : ''}</div>
  </div>

  <div class="cut"><span>✂ CUT HERE · STICK THE LABEL ON THE BOX · PUT THE BILL INSIDE</span></div>

  <div class="row">
    <div><h2>${esc(shopName)}</h2><div class="muted">${[shopAddress, shopPhone, shopEmail].filter(Boolean).map(esc).join(' · ')}</div></div>
    <div style="text-align:right"><h2>Bill</h2><div class="muted">Bill No. ${id}</div></div>
  </div>
  <div class="meta">
    <div><div class="tag">Bill to</div><b>${esc(a.name)}</b><br>${esc(a.street)}, ${esc(a.city)}, ${esc(a.state)} ${esc(a.pincode)}<br>Phone: ${esc(a.phone)}</div>
    <div><div class="tag">Order</div>Ordered: ${esc(date(order.createdAt))}<br>${paid
      ? `Paid: ${esc(date(order.paidAt || order.createdAt))} by UPI${order.upiRef ? `<br>UPI Ref No.: ${esc(order.upiRef)}` : ''}`
      : '<b style="color:#991b1b">Payment not received</b>'}</div>
  </div>
  <table>
    <thead><tr><th class="tick"></th><th>Item</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <table class="totals" style="margin-top:3mm;width:60%;margin-left:40%">
    <tr><td>Subtotal</td><td class="r">${rupees(subtotal)}</td></tr>
    <tr><td>Shipping</td><td class="r">${order.shippingFee ? rupees(order.shippingFee) : 'Free'}</td></tr>
    ${order.discount ? `<tr><td>Coupon ${esc(order.couponCode)}</td><td class="r">−${rupees(order.discount)}</td></tr>` : ''}
    <tr class="grand"><td>${paid ? 'Total paid' : 'Total due'}</td><td class="r">${rupees(order.totalAmount)}</td></tr>
  </table>
  <div class="note">Prices include all taxes. Thank you for shopping with ${esc(shopName)}! Damaged or wrong item? Contact us within ${RETURN_REPORT_WINDOW} of delivery with photos.</div>
</div>`
}

const page = (title, body) => `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body>
<div class="bar"><button onclick="window.print()">Print</button> &nbsp; Tip: print on A4, cut along the dashed line, stick the top half on the box.</div>
${body}
</body></html>`

// One order
export const packingSlipHtml = (order, shop) =>
  page(`Label & bill #${String(order._id || '').slice(-8).toUpperCase()}`, slip(order, shop))

// Several orders, one page each
export const slipsHtml = (orders, shop) => page(`Labels & bills (${orders.length})`, orders.map(o => slip(o, shop)).join(''))

// Write a page into a tab (opened straight away on the click, so it isn't blocked)
export const writeTab = (w, html) => { w.document.open(); w.document.write(html); w.document.close() }
const open = html => {
  const w = window.open('', '_blank')
  if (!w) return false
  writeTab(w, html)
  return true
}
export const openPackingSlip = (order, shop) => open(packingSlipHtml(order, shop))
export const openSlips = (orders, shop) => open(slipsHtml(orders, shop))
