const Order = require('../models/Order')
const Product = require('../models/Product')
const mongoose = require('mongoose')

const PAGE_SIZE = 15

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

  const { guestInfo, shippingAddress, items, totalAmount, paymentMethod, paymentStatus, notes } = req.body

  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ message: 'Order must contain at least one item' })

  for (const item of items) {
    if (!item.product) return res.status(400).json({ message: 'Each item requires a product ID' })
    const qty = Number(item.quantity)
    if (!Number.isInteger(qty) || qty < 1 || qty > 100)
      return res.status(400).json({ message: `Invalid quantity for item "${item.name || item.product}"` })
  }

  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    // ── Validate stock for every item inside the transaction ──
    for (const item of items) {
      const product = await Product.findById(item.product).session(session)
      if (!product) {
        await session.abortTransaction()
        return res.status(400).json({ message: `Product not found: ${item.name || item.product}` })
      }
      if (!product.isVisible) {
        await session.abortTransaction()
        return res.status(400).json({ message: `"${product.name}" is no longer available` })
      }
      const qty = Number(item.quantity)
      if (product.stock < qty) {
        await session.abortTransaction()
        return res.status(400).json({
          message: `Not enough stock for "${product.name}". Only ${product.stock} left.`,
          productId: product._id,
          available: product.stock,
        })
      }
    }

    // ── Atomically deduct stock ───────────────────────────────
    for (const item of items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: -Number(item.quantity) } },
        { session }
      )
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
      items,
      totalAmount,
      paymentMethod:  paymentMethod  || 'cod',
      paymentStatus:  paymentStatus  || 'pending',
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
    await session.abortTransaction()
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

    // Restore stock when admin cancels
    if (status === 'cancelled') {
      for (const item of order.items) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } })
        }
      }
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

    order.status = 'cancelled'
    await order.save()
    res.json(order)
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}
