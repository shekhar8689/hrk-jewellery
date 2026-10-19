const router = require('express').Router()
const ctrl = require('../controllers/offerController')
const { protect, adminOnly } = require('../middleware/auth')
const { mediaUpload } = require('../config/cloudinary')

const offerImage = mediaUpload([{ name: 'image', maxCount: 1, kind: 'image' }])

router.get('/',      ctrl.getPublic)
router.get('/admin', protect, adminOnly, ctrl.adminGet)
router.put('/',      protect, adminOnly, offerImage, ctrl.update)

module.exports = router
