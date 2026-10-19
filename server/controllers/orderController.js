const Order = require('../models/Order')
const Product = require('../models/Product')
const Coupon = require('../models/Coupon')
const { shippingFor, couponDiscount } = require('../utils/pricing')
const mongoose = require('mongoose')

const PAGE_SIZE = 15

// A cancelled order gives its coupon use back
async function releaseCoupon(order) {
  if (!order.couponCode) return
  await Coupon.updateOne({ code: order.couponCode, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } })
}

// Allowed status transitions — enforces the business flow
const STATUS_TRANSITIONS = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['shipped',   'cancelled'],
  shipped:   ['delivered'],
  delivered: [],
  cancelled: [],
}

const PHONE_RE      = /^[6-9][0-9]{9}$/
const PINCODE_RE    = /^[1-9][0-9]{5}$/
const CITY_STATE_RE = /^[a-zA-Z\s\-]+$/   // letters, spaces, hyphens only

function validateAddress(addr) {
  const { name, phone, street, city, state, pincode } = addr || {}

  if (!name || name.trim().length < 2 || name.trim().length > 100)
    return 'Delivery name must be 2–100 characters'
  if (!/^[a-zA-Z\s\-.']+$/.test(name.trim()))
    return 'Name must contain letters, spaces and hyphens only'

  if (!phone || !PHONE_RE.test(phone.trim()))
    return 'Phone must be a valid 10-digit Indian mobile number starting with 6–9'

  if (!street || street.trim().length < 5)
    return 'Street address must be at least 5 characters'

  if (!city || city.trim().length < 2 || city.trim().length > 50)
    return 'City must be 2–50 characters'
  if (!CITY_STATE_RE.test(city.trim()))
    return 'City name cannot contain numbers or special characters'

  if (!state || state.trim().length < 2)
    return 'State is required'
  if (!CITY_STATE_RE.test(state.trim()))
    return 'State name cannot contain numbers or special characters'

  if (!pincode || !PINCODE_RE.test(pincode.trim()))
    return 'Pincode must be a valid 6-digit Indian pincode (100000–999999)'

  return null
}

// ── Admin: list all orders ────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { page = 1, status, search } = req.query
    const filter = {}
    if (status) filter.status = status
    if (search) {
      filter.$or = [
        { 'shippingAddress.name':  { $regex: search, $options: 'i' } },
        { 'shippingAddress.phone': { $regex: search, $options: 'i' } },
        { 'guestInfo.email':       { $regex: search, $options: 'i' } },
      ]
    }
    const total  = await Order.countDocuments(filter)
    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)

    res.json({ orders, total, pages: Math.ceil(total / PAGE_SIZE), page: +page })
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

  // Only Cash on Delivery is accepted until a real payment gateway is connected
  if (paymentMethod && paymentMethod !== 'cod')
    return res.status(400).json({ message: 'Online payment is not available yet. Please choose Cash on Delivery.' })

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
      paymentMethod: 'cod',
      paymentStatus: 'pending',   // set to paid by the admin when cash is collected
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
    if (!Object.keys(STATUS_TRANSITIONS).includes(status))
      return res.status(400).json({ message: 'Invalid status value' })

    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })

    const allowed = STATUS_TRANSITIONS[order.status] || []
    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: `Cannot change status from "${order.status}" to "${status}"`,
      })
    }

    // Restore stock (and the coupon use) when admin cancels
    if (status === 'cancelled') {
      for (const item of order.items) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } })
        }
      }
      await releaseCoupon(order)
    }

    order.status = status
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

    // Restore stock
    for (const item of order.items) {
      if (item.product) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } })
      }
    }
    await releaseCoupon(order)

    order.status = 'cancelled'
    await order.save()
    res.json(order)
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}
