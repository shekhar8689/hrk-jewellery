const Coupon = require('../models/Coupon')

// ── POST /api/coupons/validate  (public — validate & return discount) ─────────
exports.validate = async (req, res) => {
  try {
    const { code, orderAmount } = req.body
    if (!code) return res.status(400).json({ message: 'Coupon code is required' })

    const coupon = await Coupon.findOne({ code: String(code).toUpperCase().trim() })
    if (!coupon || !coupon.isActive)
      return res.status(404).json({ message: 'Invalid or expired coupon code' })

    if (coupon.expiresAt && new Date() > coupon.expiresAt)
      return res.status(400).json({ message: 'This coupon has expired' })

    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses)
      return res.status(400).json({ message: 'This coupon has reached its usage limit' })

    const amount = Number(orderAmount) || 0
    if (amount < coupon.minOrderAmount)
      return res.status(400).json({
        message: `Minimum order amount of ₹${coupon.minOrderAmount.toLocaleString('en-IN')} required for this coupon`,
      })

    let discount = coupon.type === 'percentage'
      ? (amount * coupon.value) / 100
      : coupon.value

    if (coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount)
    discount = Math.min(discount, amount) // can't exceed order total
    discount = Math.round(discount * 100) / 100

    res.json({
      valid:       true,
      discount,
      couponId:    coupon._id,
      code:        coupon.code,
      type:        coupon.type,
      value:       coupon.value,
      description: coupon.description,
    })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

// ── GET /api/coupons/admin  (admin) ───────────────────────────────────────────
exports.adminGetAll = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 })
    res.json(coupons)
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

// ── POST /api/coupons/admin  (admin) ──────────────────────────────────────────
exports.adminCreate = async (req, res) => {
  try {
    const { code, type, value, minOrderAmount, maxDiscount, maxUses, expiresAt, description } = req.body
    if (!code || !type || value === undefined)
      return res.status(400).json({ message: 'Code, type, and value are required' })
    if (!['percentage', 'fixed'].includes(type))
      return res.status(400).json({ message: 'Type must be percentage or fixed' })
    if (type === 'percentage' && (value <= 0 || value > 100))
      return res.status(400).json({ message: 'Percentage must be between 1 and 100' })
    if (type === 'fixed' && value <= 0)
      return res.status(400).json({ message: 'Discount value must be positive' })

    const coupon = await Coupon.create({
      code: String(code).toUpperCase().trim(),
      type,
      value:          Number(value),
      minOrderAmount: Number(minOrderAmount) || 0,
      maxDiscount:    Number(maxDiscount)    || 0,
      maxUses:        Number(maxUses)        || 0,
      expiresAt:      expiresAt || undefined,
      description:    String(description || '').trim(),
    })
    res.status(201).json(coupon)
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Coupon code already exists' })
    res.status(500).json({ message: 'Server error' })
  }
}

// ── PUT /api/coupons/admin/:id  (admin) ───────────────────────────────────────
exports.adminUpdate = async (req, res) => {
  try {
    const { code, type, value, minOrderAmount, maxDiscount, maxUses, expiresAt, description, isActive } = req.body
    const coupon = await Coupon.findById(req.params.id)
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' })

    if (code       !== undefined) coupon.code           = String(code).toUpperCase().trim()
    if (type       !== undefined) coupon.type           = type
    if (value      !== undefined) coupon.value          = Number(value)
    if (minOrderAmount !== undefined) coupon.minOrderAmount = Number(minOrderAmount)
    if (maxDiscount!== undefined) coupon.maxDiscount    = Number(maxDiscount)
    if (maxUses    !== undefined) coupon.maxUses        = Number(maxUses)
    if (expiresAt  !== undefined) coupon.expiresAt      = expiresAt || undefined
    if (description!== undefined) coupon.description    = String(description).trim()
    if (isActive   !== undefined) coupon.isActive       = Boolean(isActive)

    await coupon.save()
    res.json(coupon)
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Coupon code already exists' })
    res.status(500).json({ message: 'Server error' })
  }
}

// ── PATCH /api/coupons/admin/:id/toggle  (admin) ─────────────────────────────
exports.adminToggle = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' })
    coupon.isActive = !coupon.isActive
    await coupon.save()
    res.json(coupon)
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

// ── DELETE /api/coupons/admin/:id  (admin) ────────────────────────────────────
exports.adminDelete = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id)
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' })
    res.json({ message: 'Coupon deleted' })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}
