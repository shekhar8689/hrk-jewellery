const router = require('express').Router()
const ctrl = require('../controllers/userController')
const { protect, adminOnly } = require('../middleware/auth')

router.get('/', protect, adminOnly, ctrl.getAll)
router.get('/:id', protect, adminOnly, ctrl.getOne)
router.patch('/:id/toggle', protect, adminOnly, ctrl.toggleActive)

module.exports = router
