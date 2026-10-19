const router = require('express').Router()
const ctrl   = require('../controllers/reviewController')
const { protect, adminOnly } = require('../middleware/auth')

// Simple in-memory rate limiter: max 5 review submissions per IP per hour
const _ipMap = new Map()
function reviewRateLimit(req, res, next) {
  const ip  = req.ip || req.socket?.remoteAddress || 'unknown'
  const now = Date.now()
  const win = 60 * 60 * 1000 // 1 hour

  const entry = _ipMap.get(ip)
  if (!entry || now > entry.reset) {
    _ipMap.set(ip, { count: 1, reset: now + win })
    return next()
  }
  if (entry.count >= 5)
    return res.status(429).json({ message: 'Too many submissions. Please try again later.' })
  entry.count++
  next()
}

router.get('/featured',       ctrl.getFeatured)        // must stay above /:productId
router.get('/:productId',     ctrl.getProductReviews)
router.get('/:productId/can', protect, ctrl.canReview)
router.post('/',              protect, reviewRateLimit, ctrl.create)
router.delete('/:id',         protect, adminOnly, ctrl.deleteReview)

module.exports = router
