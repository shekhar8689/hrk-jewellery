const router = require('express').Router()
const { body } = require('express-validator')
const ctrl = require('../controllers/productController')
const { protect, protectOptional, adminOnly } = require('../middleware/auth')
const { mediaUpload } = require('../config/cloudinary')

const productFiles = mediaUpload([
  { name: 'images', maxCount: 6, kind: 'image' },
  { name: 'video',  maxCount: 1, kind: 'video' },
])

// protectOptional: the admin (signed in) also sees hidden products
router.get('/', protectOptional, ctrl.getAll)
router.get('/:id', protectOptional, ctrl.getOne)

// A customer looked at / added this product to the bag (for the admin's "Popular" report)
router.post('/:id/seen', require('../controllers/statsController').seen)

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
