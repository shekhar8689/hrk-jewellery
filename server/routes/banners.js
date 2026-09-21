const router = require('express').Router()
const ctrl = require('../controllers/bannerController')
const { protect, adminOnly } = require('../middleware/auth')
const { upload } = require('../config/cloudinary')

router.get('/', ctrl.getAll)
router.get('/active', ctrl.getActive)
router.post('/', protect, adminOnly, upload.single('image'), ctrl.create)
router.put('/:id', protect, adminOnly, upload.single('image'), ctrl.update)
router.delete('/:id', protect, adminOnly, ctrl.remove)
router.patch('/:id/toggle', protect, adminOnly, ctrl.toggle)

module.exports = router
