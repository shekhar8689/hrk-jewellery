const router = require('express').Router()
const ctrl = require('../controllers/paymentController')
const { protect, adminOnly } = require('../middleware/auth')

router.get('/',      ctrl.getPublic)
router.get('/admin', protect, adminOnly, ctrl.adminGet)
router.put('/',      protect, adminOnly, ctrl.update)

module.exports = router
