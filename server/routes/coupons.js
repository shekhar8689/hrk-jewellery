const router = require('express').Router()
const ctrl   = require('../controllers/couponController')
const { protect, adminOnly } = require('../middleware/auth')

// Public
router.post('/validate', ctrl.validate)

// Admin
router.get('/admin',              protect, adminOnly, ctrl.adminGetAll)
router.post('/admin',             protect, adminOnly, ctrl.adminCreate)
router.put('/admin/:id',          protect, adminOnly, ctrl.adminUpdate)
router.patch('/admin/:id/toggle', protect, adminOnly, ctrl.adminToggle)
router.delete('/admin/:id',       protect, adminOnly, ctrl.adminDelete)

module.exports = router
