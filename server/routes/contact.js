const router = require('express').Router()
const ctrl = require('../controllers/contactController')
const { protect, adminOnly } = require('../middleware/auth')
const { createLimiter, ipOf } = require('../utils/rateLimit')

// Max 5 messages per visitor per hour (stops spam)
const contactLimit = createLimiter({ windowMs: 60 * 60 * 1000, max: 5 })
  .middleware(ipOf, 'You have sent several messages already. Please try again in an hour, or call us.')

router.post('/',     contactLimit, ctrl.create)
router.get('/',      protect, adminOnly, ctrl.list)
router.patch('/:id', protect, adminOnly, ctrl.update)

module.exports = router
