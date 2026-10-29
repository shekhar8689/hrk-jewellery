/**
 * A printable packing slip: delivery label (address + phone) on top, and the
 * list of items to pack. Customer text is escaped so it can't run as code.
 */
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const rupees = n => `₹${Number(n || 0).toLocaleString('en-IN')}`

export function packingSlipHtml(order, { shopName = 'HRK Jewellery', shopPhone = '', shopAddress = '' } = {}) {
  const a = order.shippingAddress || {}
  const id = String(order._id || '').slice(-8).toUpperCase()
  const paid = order.paymentStatus === 'paid'
  const date = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
  const items = (order.items || []).map(i => `
      <tr><td>${esc(i.name)}${i.size ? ` · Size ${esc(i.size)}` : ''}${i.color ? ` · ${esc(i.color)}` : ''}</td>
          <td class="qty">× ${esc(i.quantity)}</td><td class="box"></td></tr>`).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>Packing slip #${id}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:24px;font-size:14px}
  .label{border:2px dashed #333;padding:16px 18px;border-radius:6px;max-width:420px}
  .to{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#555}
  .name{font-size:20px;font-weight:bold;margin:4px 0}
  .addr{font-size:16px;line-height:1.4}
  .from{margin-top:12px;font-size:12px;color:#444;border-top:1px solid #ccc;padding-top:8px}
  h2{font-size:16px;margin:28px 0 8px}
  table{border-collapse:collapse;width:100%;max-width:640px}
  td{border-bottom:1px solid #ddd;padding:8px 6px;vertical-align:top}
  .qty{white-space:nowrap;font-weight:bold;width:60px}
  .box{width:22px}.box:after{content:'';display:inline-block;width:14px;height:14px;border:1.5px solid #333}
  .pay{display:inline-block;margin-top:14px;padding:6px 10px;border-radius:4px;font-weight:bold}
  .ok{background:#dcfce7;color:#166534}.no{background:#fee2e2;color:#991b1b}
  @media print{body{margin:10mm}button{display:none}}
</style></head><body>
<button onclick="window.print()" style="margin-bottom:16px;padding:8px 14px">Print</button>
<div class="label">
  <div class="to">Deliver to</div>
  <div class="name">${esc(a.name)}</div>
  <div class="addr">${esc(a.street)}<br>${esc(a.city)}, ${esc(a.state)} ${esc(a.pincode)}<br>Phone: <b>${esc(a.phone)}</b></div>
  <div class="from">From: ${esc(shopName)}${shopAddress ? `, ${esc(shopAddress)}` : ''}${shopPhone ? ` · ${esc(shopPhone)}` : ''}</div>
</div>
<h2>Order #${id} · ${esc(date)}</h2>
<table>${items}</table>
<div class="pay ${paid ? 'ok' : 'no'}">${paid ? `PAID by UPI · ${rupees(order.totalAmount)}` : `NOT PAID — do not ship · ${rupees(order.totalAmount)}`}</div>
</body></html>`
}

// Opens the slip in a new tab, ready to print
export function openPackingSlip(order, shop) {
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.open(); w.document.write(packingSlipHtml(order, shop)); w.document.close()
  return true
}
