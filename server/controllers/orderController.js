const Order = require('../models/Order')
const Product = require('../models/Product')
const Coupon = require('../models/Coupon')
const { shippingFor, couponDiscount } = require('../utils/pricing')
const { UTR_RE, PAY_WITHIN_HOURS, getPaymentSettings, upiReady } = require('../utils/upi')
const mongoose = require('mongoose')

const PAGE_SIZE = 15
const MAX_UNPAID_PER_PHONE = 3

// Courier fields from the admin form. Only sets the ones that were sent.
function cleanTracking(body) {
  const values = {}
  for (const [k, max] of [['courier', 60], ['trackingNumber', 80], ['trackingUrl', 300]]) {
    if (body[k] !== undefined) values[k] = String(body[k]).trim().slice(0, max)
  }
  if (values.trackingUrl && !/^https?:\/\//i.test(values.trackingUrl))
    return { error: 'Tracking link must start with https://' }
  return { values }
}

// A cancelled order gives its coupon use back
async function releaseCoupon(order) {
  if (!order.couponCode) return
  await Coupon.updateOne({ code: order.couponCode, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } })
}

// Put an order's stock and coupon use back (when it is cancelled)
async function restock(order) {
  for (const item of order.items) {
    if (item.product) await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } })
  }
  await releaseCoupon(order)
}

// Cancel UPI orders nobody paid for within PAY_WITHIN_HOURS, so their stock is
// freed. Orders where the customer sent a transaction number are kept for the
// admin to check. Runs at most every 10 minutes, when orders are placed or listed.
let lastExpiry = 0
async function expireUnpaid({ force = false } = {}) {
  if (!force && Date.now() - lastExpiry < 10 * 60 * 1000) return
  lastExpiry = Date.now()
  try {
    const cutoff = new Date(Date.now() - PAY_WITHIN_HOURS * 3600 * 1000)
    const stale = await Order.find({ paymentMethod: 'upi', paymentStatus: { $in: ['pending', 'failed'] }, status: 'pending', createdAt: { $lt: cutoff } })
    for (const order of stale) {
      // Claim it first, so two servers never restock the same order twice
      const claimed = await Order.updateOne(
        { _id: order._id, status: 'pending', paymentStatus: { $in: ['pending', 'failed'] } },
        { $set: { status: 'cancelled', notes: (order.notes ? order.notes + ' · ' : '') + `Cancelled automatically: not paid within ${PAY_WITHIN_HOURS} hours` },
          $push: { statusHistory: { status: 'cancelled', at: new Date() } } }
      )
      if (claimed.modifiedCount) await restock(order)
    }
  } catch (err) {
    console.error('Could not cancel unpaid orders:', err.message)
  }
}

// Find an order from what the customer has: the 8-character Order ID shown
// after ordering (or the full ID) plus the phone number used.
async function findCustomerOrder(body, lean = true) {
  const rawId = String(body.orderId || '').trim().replace(/^#/, '').toLowerCase()
  const phone = String(body.phone || '').replace(/\D/g, '').slice(-10)
  if (!/^[0-9a-f]{8}$|^[0-9a-f]{24}$/.test(rawId))
    return { status: 400, error: 'Enter the 8-character Order ID, e.g. 94E7178C' }
  if (!PHONE_RE.test(phone))
    return { status: 400, error: 'Enter the 10-digit mobile number used for the order' }
  let order
  if (rawId.length === 24) {
    const q = Order.findOne({ _id: rawId, 'shippingAddress.phone': phone })
    order = await (lean ? q.lean() : q)
  } else {
    const q = Order.find({ 'shippingAddress.phone': phone }).sort({ createdAt: -1 }).limit(200).select('_id')
    const hit = (await q.lean()).find(o => String(o._id).endsWith(rawId))
    if (hit) order = await (lean ? Order.findById(hit._id).lean() : Order.findById(hit._id))
  }
  if (!order) return { status: 404, error: 'No order found with that Order ID and phone number' }
  return { order }
}

// Allowed status transitions — enforces the business flow
const STATUS_TRANSITIONS = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['shipped',   'cancelled'],
  shipped:   ['delivered'],
  delivered: [],
  cancelled: [],
}

const { validateAddress, escapeRegex, toPage, PHONE_RE } = require('../utils/validation')

// ── Admin: list all orders ────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    await expireUnpaid()
    const { status, search, payment } = req.query
    const page = toPage(req.query.page)
    const filter = {}
    if (Object.keys(STATUS_TRANSITIONS).includes(status)) filter.status = status
    if (['pending', 'submitted', 'paid', 'failed'].includes(payment)) filter.paymentStatus = payment
    if (typeof search === 'string' && search.trim()) {
      const re = { $regex: escapeRegex(search.trim()), $options: 'i' }
      filter.$or = [{ 'shippingAddress.name': re }, { 'shippingAddress.phone': re }, { 'guestInfo.email': re }]
    }
    const total  = await Order.countDocuments(filter)
    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)

    res.json({ orders, total, pages: Math.ceil(total / PAGE_SIZE), page })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

// ── Admin: single order ───────────────────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email phone')
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json(order)
  } catch {
    res.status(404).json({ message: 'Order not found' })
  }
}

// ── Public / User: create order (guest or logged-in) ─────────────────────────
exports.create = async (req, res) => {
  // Validate address first (fast fail before touching DB)
  const addrErr = validateAddress(req.body.shippingAddress)
  if (addrErr) return res.status(400).json({ message: addrErr })

  // Prices, totals and payment status sent by the browser are NOT trusted —
  // everything below is recalculated from the database.
  const { guestInfo, shippingAddress, items, totalAmount, paymentMethod, couponCode, notes } = req.body

  // Orders are paid in advance by UPI — Cash on Delivery is no longer offered
  if (paymentMethod && paymentMethod !== 'upi')
    return res.status(400).json({ message: 'Cash on Delivery is not available. Please pay online by UPI.' })
  const paySettings = await getPaymentSettings()
  if (!upiReady(paySettings))
    return res.status(503).json({ message: 'Online payment is being set up. Please try again in a little while, or contact us to order.' })
  expireUnpaid()

  // One phone number may have at most 3 unpaid orders at a time, so nobody can
  // lock up the stock by placing orders they never pay for
  const unpaid = await Order.countDocuments({
    'shippingAddress.phone': req.body.shippingAddress.phone.trim(),
    paymentMethod: 'upi', status: 'pending', paymentStatus: { $in: ['pending', 'submitted', 'failed'] },
  })
  if (unpaid >= MAX_UNPAID_PER_PHONE)
    return res.status(429).json({ message: `You already have ${unpaid} unpaid orders. Please pay for them, or wait until they are checked, before placing another.` })

  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ message: 'Order must contain at least one item' })
  if (items.length > 50)
    return res.status(400).json({ message: 'Too many items in one order' })

  for (const item of items) {
    if (!item || !mongoose.isValidObjectId(item.product))
      return res.status(400).json({ message: 'Each item requires a valid product ID' })
    const qty = Number(item.quantity)
    if (!Number.isInteger(qty) || qty < 1 || qty > 100)
      return res.status(400).json({ message: `Invalid quantity for item "${item.name || item.product}"` })
  }

  const session = await mongoose.startSession()
  session.startTransaction()
  const fail = async (status, body) => { await session.abortTransaction(); return res.status(status).json(body) }

  try {
    // ── Load each product once and total its quantity across all lines ──
    // (two sizes of the same ring share one stock count)
    const ids      = [...new Set(items.map(i => String(i.product)))]
    const products = await Product.find({ _id: { $in: ids } }).session(session)
    const byId     = Object.fromEntries(products.map(p => [String(p._id), p]))
    const wanted   = {}
    for (const item of items) wanted[item.product] = (wanted[item.product] || 0) + Number(item.quantity)

    for (const id of ids) {
      const product = byId[id]
      if (!product) return fail(400, { message: 'A product in your bag no longer exists. Please remove it and try again.' })
      if (!product.isVisible) return fail(400, { message: `"${product.name}" is no longer available` })
      if (product.stock < wanted[id]) {
        return fail(400, {
          message:   `Not enough stock for "${product.name}". Only ${product.stock} left.`,
          productId: product._id,
          available: product.stock,
        })
      }
    }

    // ── Build order lines from the database (name, price, photo) ──
    const lines = []
    for (const item of items) {
      const p     = byId[String(item.product)]
      const size  = String(item.size  || '').trim()
      const color = String(item.color || '').trim()
      if (size  && p.sizes?.length  && !p.sizes.includes(size))
        return fail(400, { message: `Size "${size}" is not available for "${p.name}"` })
      if (color && p.colors?.length && !p.colors.includes(color))
        return fail(400, { message: `Colour "${color}" is not available for "${p.name}"` })
      lines.push({
        product:  p._id,
        name:     p.name,
        image:    p.images?.[0] || '',
        price:    p.price,
        quantity: Number(item.quantity),
        size,
        color,
      })
    }

    const subtotal    = lines.reduce((sum, l) => sum + l.price * l.quantity, 0)
    const shippingFee = shippingFor(subtotal)

    // ── Coupon: checked and counted here, not in the browser ──
    let discount = 0
    let coupon = null
    if (couponCode) {
      coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase().trim() }).session(session)
      const result = couponDiscount(coupon, subtotal + shippingFee)
      if (result.error) return fail(400, { message: result.error, couponError: true })
      discount = result.discount
    }

    const total = Math.max(0, Math.round((subtotal + shippingFee - discount) * 100) / 100)

    // If the bag showed a different total (price changed since it was added),
    // stop so the customer sees the real amount before ordering.
    if (totalAmount !== undefined && Math.abs(Number(totalAmount) - total) >= 1) {
      return fail(409, {
        message: `Prices in your bag have changed. The correct total is ₹${total.toLocaleString('en-IN')} — please review and place the order again.`,
        priceChanged: true,
        total,
      })
    }

    // ── Count the coupon use (only now that every check has passed) ──
    // If someone else used the last one a moment ago, stop.
    if (coupon) {
      const counted = await Coupon.updateOne(
        { _id: coupon._id, usedCount: coupon.usedCount },
        { $inc: { usedCount: 1 } },
        { session }
      )
      if (!counted.modifiedCount) return fail(400, { message: 'This coupon has just reached its usage limit', couponError: true })
    }

    // ── Atomically deduct stock ───────────────────────────────
    for (const id of ids) {
      await Product.findByIdAndUpdate(id, { $inc: { stock: -wanted[id] } }, { session })
    }

    // ── Build and save the order ─────────────────────────────
    const addr = shippingAddress
    const orderData = {
      shippingAddress: {
        name:    addr.name.trim(),
        phone:   addr.phone.trim(),
        street:  addr.street.trim(),
        city:    addr.city.trim(),
        state:   addr.state.trim(),
        pincode: addr.pincode.trim(),
      },
      items:         lines,
      subtotal,
      shippingFee,
      couponCode:    coupon ? coupon.code : '',
      discount,
      totalAmount:   total,
      paymentMethod: 'upi',
      paymentStatus: 'pending',   // set to paid by the admin after checking the bank
      payTo:         { upiId: paySettings.upiId, payeeName: paySettings.payeeName },
      statusHistory: [{ status: 'pending', at: new Date() }],
      notes: notes ? String(notes).slice(0, 500) : '',
    }

    if (req.user) {
      orderData.user = req.user._id
    } else if (guestInfo) {
      orderData.guestInfo = {
        name:  guestInfo.name  ? String(guestInfo.name).trim()                    : '',
        email: guestInfo.email ? String(guestInfo.email).toLowerCase().trim()     : '',
        phone: guestInfo.phone ? String(guestInfo.phone).trim()                   : '',
      }
    }

    const [order] = await Order.create([orderData], { session })
    await session.commitTransaction()
    res.status(201).json(order)
  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction()
    res.status(400).json({ message: err.message || 'Could not place order' })
  } finally {
    session.endSession()
  }
}

// ── Admin: update order status (enforced transitions) ────────────────────────
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })

    // Courier / tracking details can be saved with or without a status change
    const tracking = cleanTracking(req.body)
    if (tracking.error) return res.status(400).json({ message: tracking.error })
    Object.assign(order, tracking.values)

    if (!status || status === order.status) {
      await order.save()
      return res.json(order)
    }
    if (!Object.keys(STATUS_TRANSITIONS).includes(status))
      return res.status(400).json({ message: 'Invalid status value' })

    const allowed = STATUS_TRANSITIONS[order.status] || []
    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: `Cannot change status from "${order.status}" to "${status}"`,
      })
    }

    // UPI orders are packed only after the money has arrived
    if (status === 'confirmed' && order.paymentMethod === 'upi' && order.paymentStatus !== 'paid')
      return res.status(400).json({ message: 'Mark the payment as received before confirming this order.' })

    // Restore stock (and the coupon use) when admin cancels
    if (status === 'cancelled') await restock(order)

    order.status = status
    order.statusHistory.push({ status, at: new Date() })
    await order.save()
    res.json(order)
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

// ── User: my orders ───────────────────────────────────────────────────────────
exports.myOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 })
    res.json(orders)
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

// ── User: cancel own order + restore stock ────────────────────────────────────
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })

    // Users may only cancel their own orders
    if (!order.user || order.user.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized to cancel this order' })

    if (!['pending', 'confirmed'].includes(order.status))
      return res.status(400).json({ message: `Orders with status "${order.status}" cannot be cancelled` })

    // A paid order is refunded by the shop, so customers ask instead of cancelling here
    if (order.paymentStatus === 'paid' || order.paymentStatus === 'submitted')
      return res.status(400).json({ message: 'This order is already paid. Please contact us to cancel it and get a refund.' })

    await restock(order)

    order.status = 'cancelled'
    order.statusHistory.push({ status: 'cancelled', at: new Date() })
    await order.save()
    res.json(order)
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

// ── POST /api/orders/track  (public) ──────────────────────────────────────────
// Customers look up an order with its Order ID (the 8 characters shown after
// ordering, e.g. "94E7178C", or the full ID) plus the phone number used.
exports.track = async (req, res) => {
  try {
    const found = await findCustomerOrder(req.body)
    if (found.error) return res.status(found.status).json({ message: found.error })
    res.json(await customerView(found.order))
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

// What the customer sees about their order — no full street address or email
async function customerView(order) {
  const awaitingPayment = order.paymentMethod === 'upi' && order.status === 'pending'
    && ['pending', 'failed', 'submitted'].includes(order.paymentStatus)
  let payTo = null
  if (awaitingPayment) {
    payTo = order.payTo?.upiId ? order.payTo : null
    if (!payTo) { const s = await getPaymentSettings(); if (upiReady(s)) payTo = { upiId: s.upiId, payeeName: s.payeeName } }
  }
  return {
      orderId:        String(order._id).slice(-8).toUpperCase(),
      status:         order.status,
      placedAt:       order.createdAt,
      statusHistory:  (order.statusHistory || []).length ? order.statusHistory : [{ status: 'pending', at: order.createdAt }],
      items:          order.items.map(i => ({ name: i.name, image: i.image, price: i.price, quantity: i.quantity, size: i.size, color: i.color })),
      subtotal:       order.subtotal,
      shippingFee:    order.shippingFee,
      discount:       order.discount,
      couponCode:     order.couponCode,
      totalAmount:    order.totalAmount,
      paymentMethod:  order.paymentMethod,
      paymentStatus:  order.paymentStatus,
      upiRef:         order.upiRef || '',
      payTo:          payTo ? { upiId: payTo.upiId, payeeName: payTo.payeeName } : null,
      payBy:          awaitingPayment ? new Date(new Date(order.createdAt).getTime() + PAY_WITHIN_HOURS * 3600 * 1000) : null,
      courier:        order.courier || '',
      trackingNumber: order.trackingNumber || '',
      trackingUrl:    order.trackingUrl || '',
      deliverTo: {
        name:    order.shippingAddress?.name,
        city:    order.shippingAddress?.city,
        state:   order.shippingAddress?.state,
        pincode: order.shippingAddress?.pincode,
      },
  }
}

// ── POST /api/orders/upi-ref  (public) ────────────────────────────────────────
// After paying, the customer enters the 12-digit UPI transaction number
// (UTR / UPI Ref No.) so the shop can match the payment in its bank app.
exports.submitUpiRef = async (req, res) => {
  try {
    const utr = String(req.body.utr || '').replace(/\s/g, '')
    if (!UTR_RE.test(utr))
      return res.status(400).json({ message: 'Enter the 12-digit UPI transaction number (UTR / UPI Ref No.) from your payment app' })
    const found = await findCustomerOrder(req.body, false)
    if (found.error) return res.status(found.status).json({ message: found.error })
    const order = found.order
    if (order.paymentMethod !== 'upi') return res.status(400).json({ message: 'This order does not need a UPI payment' })
    if (order.status === 'cancelled') return res.status(400).json({ message: 'This order was cancelled. Please contact us if you have already paid.' })
    if (order.paymentStatus === 'paid') return res.status(400).json({ message: 'We have already received the payment for this order.' })

    // One payment can only pay for one order
    const usedElsewhere = await Order.exists({ upiRef: utr, _id: { $ne: order._id } })
    if (usedElsewhere) return res.status(400).json({ message: 'This transaction number is already used for another order. Please check the number.' })

    order.upiRef = utr
    order.paymentStatus = 'submitted'
    order.paymentSubmittedAt = new Date()
    await order.save()
    res.json(await customerView(order.toObject()))
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

// ── PATCH /api/orders/:id/payment  (admin) ────────────────────────────────────
// { received: true }  → money found in the bank: order is paid
// { received: false } → payment not found: customer is asked to check and send the number again
exports.updatePayment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    if (order.status === 'cancelled' && req.body.received !== true)
      return res.status(400).json({ message: 'This order is cancelled' })
    if (req.body.received === true) {
      order.paymentStatus = 'paid'
      order.paidAt = new Date()
    } else if (req.body.received === false) {
      if (order.paymentStatus === 'paid') return res.status(400).json({ message: 'This payment was already marked as received' })
      order.paymentStatus = 'failed'
    } else {
      return res.status(400).json({ message: 'Say whether the payment was received' })
    }
    await order.save()
    res.json(order)
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

exports.expireUnpaid = expireUnpaid
