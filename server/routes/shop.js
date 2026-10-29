const router = require('express').Router()
const ctrl = require('../controllers/shopController')
const { protect, adminOnly } = require('../middleware/auth')

router.get('/', ctrl.get)
router.put('/', protect, adminOnly, ctrl.update)

module.exports = router
