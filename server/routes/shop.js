const router = require('express').Router()
const ctrl = require('../controllers/shopController')
const { protect, adminOnly } = require('../middleware/auth')

router.get('/', ctrl.get)
router.put('/', protect, adminOnly, ctrl.update)
router.post('/test-email', protect, adminOnly, ctrl.testEmail)
router.get('/alerts', protect, adminOnly, ctrl.getAlerts)
router.put('/alerts', protect, adminOnly, ctrl.updateAlerts)
router.post('/alerts/test', protect, adminOnly, ctrl.testAlert)

module.exports = router
