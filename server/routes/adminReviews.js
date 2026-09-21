const router = require('express').Router()
const ctrl   = require('../controllers/reviewController')
const { protect, adminOnly } = require('../middleware/auth')

router.get('/',    protect, adminOnly, ctrl.adminGetReviews)
router.put('/:id', protect, adminOnly, ctrl.adminUpdateReview)

module.exports = router
