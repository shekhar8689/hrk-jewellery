const router = require('express').Router()
const ctrl = require('../controllers/bannerController')
const { protect, adminOnly } = require('../middleware/auth')
const { mediaUpload } = require('../config/cloudinary')

const bannerFiles = mediaUpload([
  { name: 'image', maxCount: 1, kind: 'image' },
  { name: 'video', maxCount: 1, kind: 'video' },
])

router.get('/', ctrl.getAll)
router.get('/active', ctrl.getActive)
router.post('/', protect, adminOnly, bannerFiles, ctrl.create)
router.put('/:id', protect, adminOnly, bannerFiles, ctrl.update)
router.delete('/:id', protect, adminOnly, ctrl.remove)
router.patch('/:id/toggle', protect, adminOnly, ctrl.toggle)

module.exports = router
