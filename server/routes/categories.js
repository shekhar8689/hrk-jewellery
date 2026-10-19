const router = require('express').Router()
const ctrl = require('../controllers/categoryController')
const { protect, adminOnly } = require('../middleware/auth')
const { mediaUpload } = require('../config/cloudinary')

const posterFile = mediaUpload([{ name: 'image', maxCount: 1, kind: 'image' }])

router.get('/',               ctrl.getPublic)
router.get('/admin',          protect, adminOnly, ctrl.adminGetAll)
router.put('/:slug',          protect, adminOnly, posterFile, ctrl.update)
router.patch('/:slug/toggle', protect, adminOnly, ctrl.toggle)

module.exports = router
