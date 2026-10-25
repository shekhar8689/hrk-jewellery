const router = require('express').Router()
const ctrl = require('../controllers/orderController')
const { protect, protectOptional, adminOnly } = require('../middleware/auth')

router.get('/',           protect, adminOnly, ctrl.getAll)
router.get('/my',         protect,            ctrl.myOrders)
router.get('/:id',        protect, adminOnly, ctrl.getOne)
router.post('/',          protectOptional,    ctrl.create)          // guest or logged-in

// Order tracking lookup — max 10 tries per IP every 15 minutes, so Order IDs
// can't be guessed by trying many combinations
const _tries = new Map()
function trackRateLimit(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown'
  const now = Date.now()
  const entry = _tries.get(ip)
  if (!entry || now > entry.reset) { _tries.set(ip, { count: 1, reset: now + 15 * 60 * 1000 }); return next() }
  if (entry.count >= 10) return res.status(429).json({ message: 'Too many attempts. Please try again in 15 minutes.' })
  entry.count++
  next()
}
router.post('/track',       trackRateLimit,     ctrl.track)
router.post('/upi-ref',     trackRateLimit,     ctrl.submitUpiRef)    // customer sends the UPI transaction number
router.patch('/:id/payment', protect, adminOnly, ctrl.updatePayment)
router.patch('/:id/status', protect, adminOnly, ctrl.updateStatus)
router.patch('/:id/cancel', protect,          ctrl.cancelOrder)    // user cancels own order

module.exports = router
