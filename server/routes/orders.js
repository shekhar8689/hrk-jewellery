const router = require('express').Router()
const ctrl = require('../controllers/orderController')
const { protect, protectOptional, adminOnly } = require('../middleware/auth')

router.get('/',           protect, adminOnly, ctrl.getAll)
router.get('/my',         protect,            ctrl.myOrders)
router.get('/:id',        protect, adminOnly, ctrl.getOne)
router.post('/',          protectOptional,    ctrl.create)          // guest or logged-in
router.patch('/:id/status', protect, adminOnly, ctrl.updateStatus)
router.patch('/:id/cancel', protect,          ctrl.cancelOrder)    // user cancels own order

module.exports = router
