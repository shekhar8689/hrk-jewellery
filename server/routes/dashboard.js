const router = require('express').Router()
const { getStats } = require('../controllers/dashboardController')
const { protect, adminOnly } = require('../middleware/auth')

router.get('/stats', protect, adminOnly, getStats)

module.exports = router
