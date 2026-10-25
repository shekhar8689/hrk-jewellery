const { escapeRegex, toPage, toLimit } = require('../utils/validation')
const Review  = require('../models/Review')
const Product = require('../models/Product')
const Order   = require('../models/Order')

function sanitize(str) {
  return String(str).replace(/<[^>]*>/g, '').trim()
}

// Recalculate product average rating using only approved reviews
async function recalcRating(productId) {
  const reviews = await Review.find({ product: productId, status: 'approved' })
  if (reviews.length === 0) {
    await Product.findByIdAndUpdate(productId, { rating: 0, reviews: 0 })
  } else {
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    await Product.findByIdAndUpdate(productId, {
      rating:  Math.round(avg * 10) / 10,
      reviews: reviews.length,
    })
  }
}

// ── GET /api/reviews/:productId  (public) — approved only ─────────────────────
exports.getProductReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId, status: 'approved' })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
    res.json(reviews)
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

// ── GET /api/reviews/featured  (public) ───────────────────────────────────────
// Newest approved 4–5 star reviews for the home page. Only reviews the admin
// has approved are shown; names are shortened to "First L." for privacy.
exports.getFeatured = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 6, 1), 12)
    const reviews = await Review.find({ status: 'approved', rating: { $gte: 4 } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('product', 'name isVisible')
      .lean()

    const shortName = (full = '') => {
      const parts = String(full).trim().split(/\s+/).filter(Boolean)
      if (!parts.length) return 'Customer'
      return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0]
    }

    res.json(reviews.map(r => ({
      _id:       r._id,
      rating:    r.rating,
      title:     r.title,
      text:      r.text,
      name:      shortName(r.userName),
      verified:  !!r.order,
      createdAt: r.createdAt,
      product:   r.product && r.product.isVisible !== false ? { _id: r.product._id, name: r.product.name } : null,
    })))
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

// ── GET /api/reviews/:productId/can  (auth) ───────────────────────────────────
// Any logged-in user can review; verified purchase badge if they have a delivered order
exports.canReview = async (req, res) => {
  try {
    const { productId } = req.params

    const existing = await Review.findOne({ user: req.user._id, product: productId })
    if (existing) return res.json({ canReview: false, reason: 'already_reviewed' })

    const order = await Order.findOne({
      user:            req.user._id,
      status:          'delivered',
      'items.product': productId,
    })

    res.json({
      canReview:         true,
      isVerifiedPurchase: !!order,
      orderId:           order?._id || null,
    })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

// ── POST /api/reviews  (auth) ─────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { productId, orderId, rating, title, text } = req.body

    const ratingNum = Number(rating)
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5)
      return res.status(400).json({ message: 'Rating must be a whole number from 1 to 5' })

    const cleanTitle = title ? sanitize(title).slice(0, 100) : ''
    const cleanText  = sanitize(text || '')
    if (cleanText.length < 10)
      return res.status(400).json({ message: 'Review must be at least 10 characters' })
    if (cleanText.length > 500)
      return res.status(400).json({ message: 'Review must not exceed 500 characters' })

    const existing = await Review.findOne({ user: req.user._id, product: productId })
    if (existing)
      return res.status(400).json({ message: 'You have already reviewed this product' })

    // Verify the order for verified-purchase badge (optional)
    let verifiedOrderId
    if (orderId) {
      const order = await Order.findOne({
        _id:             orderId,
        user:            req.user._id,
        status:          'delivered',
        'items.product': productId,
      })
      if (order) verifiedOrderId = order._id
    }

    const review = await Review.create({
      user:     req.user._id,
      product:  productId,
      order:    verifiedOrderId,
      rating:   ratingNum,
      title:    cleanTitle,
      text:     cleanText,
      userName: req.user.name,
      status:   'pending',
    })

    const populated = await Review.findById(review._id).populate('user', 'name')
    res.status(201).json(populated)
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ message: 'You have already reviewed this product' })
    res.status(500).json({ message: 'Server error' })
  }
}

// ── DELETE /api/reviews/:id  (admin) ─────────────────────────────────────────
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
    if (!review) return res.status(404).json({ message: 'Review not found' })

    const productId = review.product
    await Review.findByIdAndDelete(req.params.id)
    await recalcRating(productId)

    res.json({ message: 'Review deleted' })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

// ── GET /api/admin/reviews  (admin) ──────────────────────────────────────────
exports.adminGetReviews = async (req, res) => {
  try {
    const { status, productId, search } = req.query
    const page = toPage(req.query.page), limit = toLimit(req.query.limit, 20, 100)
    const filter = {}
    if (['pending', 'approved', 'rejected'].includes(status)) filter.status = status
    if (typeof productId === 'string' && /^[0-9a-f]{24}$/i.test(productId)) filter.product = productId
    if (typeof search === 'string' && search.trim()) filter.userName = { $regex: escapeRegex(search.trim()), $options: 'i' }

    const skip = (page - 1) * limit
    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('user', 'name email')
        .populate('product', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(filter),
    ])

    res.json({ reviews, total, page, pages: Math.ceil(total / limit) })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

// ── PUT /api/admin/reviews/:id  (admin) ───────────────────────────────────────
exports.adminUpdateReview = async (req, res) => {
  try {
    const { status, title, text } = req.body
    const review = await Review.findById(req.params.id)
    if (!review) return res.status(404).json({ message: 'Review not found' })

    const wasApproved = review.status === 'approved'

    if (status !== undefined) {
      if (!['pending', 'approved', 'rejected'].includes(status))
        return res.status(400).json({ message: 'Invalid status' })
      review.status = status
    }
    if (title !== undefined) review.title = sanitize(title).slice(0, 100)
    if (text  !== undefined) {
      const cleanText = sanitize(text)
      if (cleanText.length < 10)
        return res.status(400).json({ message: 'Review must be at least 10 characters' })
      if (cleanText.length > 500)
        return res.status(400).json({ message: 'Review must not exceed 500 characters' })
      review.text = cleanText
    }

    await review.save()

    const isNowApproved = review.status === 'approved'
    if (wasApproved !== isNowApproved) await recalcRating(review.product)

    const populated = await Review.findById(review._id)
      .populate('user', 'name email')
      .populate('product', 'name')
    res.json(populated)
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}
