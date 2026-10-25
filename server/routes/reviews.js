const router = require('express').Router()
const ctrl   = require('../controllers/reviewController')
const { protect, adminOnly } = require('../middleware/auth')

const { createLimiter, ipOf } = require('../utils/rateLimit')

// Max 5 review submissions per visitor per hour
const reviewRateLimit = createLimiter({ windowMs: 60 * 60 * 1000, max: 5 })
  .middleware(ipOf, 'Too many submissions. Please try again later.')

router.get('/featured',       ctrl.getFeatured)        // must stay above /:productId
router.get('/:productId',     ctrl.getProductReviews)
router.get('/:productId/can', protect, ctrl.canReview)
router.post('/',              protect, reviewRateLimit, ctrl.create)
router.delete('/:id',         protect, adminOnly, ctrl.deleteReview)

module.exports = router
