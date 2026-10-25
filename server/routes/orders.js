const router = require('express').Router()
const ctrl = require('../controllers/orderController')
const { protect, protectOptional, adminOnly } = require('../middleware/auth')
const { createLimiter, ipOf } = require('../utils/rateLimit')

// At most 8 orders per visitor per hour, so nobody can lock up the stock with fake orders
const orderRateLimit = createLimiter({ windowMs: 60 * 60 * 1000, max: 8 })
  .middleware(ipOf, 'Too many orders from your network. Please try again in an hour or contact us.')

router.get('/',           protect, adminOnly, ctrl.getAll)
router.get('/my',         protect,            ctrl.myOrders)
router.get('/:id',        protect, adminOnly, ctrl.getOne)
router.post('/',          orderRateLimit, protectOptional, ctrl.create)          // guest or logged-in

// Order tracking lookup — max 10 tries per visitor every 15 minutes, so Order
// IDs can't be guessed by trying many combinations
const trackRateLimit = createLimiter({ windowMs: 15 * 60 * 1000, max: 10 })
  .middleware(ipOf, 'Too many attempts. Please try again in 15 minutes.')
router.post('/track',       trackRateLimit,     ctrl.track)
router.post('/upi-ref',     trackRateLimit,     ctrl.submitUpiRef)    // customer sends the UPI transaction number
router.patch('/:id/payment', protect, adminOnly, ctrl.updatePayment)
router.patch('/:id/status', protect, adminOnly, ctrl.updateStatus)
router.patch('/:id/cancel', protect,          ctrl.cancelOrder)    // user cancels own order

module.exports = router
