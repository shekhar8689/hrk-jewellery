const router = require('express').Router()
const { body } = require('express-validator')
const ctrl = require('../controllers/productController')
const { protect, adminOnly } = require('../middleware/auth')
const { mediaUpload } = require('../config/cloudinary')

const productFiles = mediaUpload([
  { name: 'images', maxCount: 6, kind: 'image' },
  { name: 'video',  maxCount: 1, kind: 'video' },
])

router.get('/', ctrl.getAll)
router.get('/:id', ctrl.getOne)

router.post('/',
  protect, adminOnly,
  productFiles,
  body('name').notEmpty(),
  body('price').isNumeric(),
  body('category').notEmpty(),
  body('description').notEmpty(),
  ctrl.create
)

router.put('/:id', protect, adminOnly, productFiles, ctrl.update)
router.delete('/:id', protect, adminOnly, ctrl.remove)
router.patch('/:id/toggle', protect, adminOnly, ctrl.toggleVisibility)

module.exports = router
