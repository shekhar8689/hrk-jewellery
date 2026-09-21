const router = require('express').Router()
const { body } = require('express-validator')
const ctrl = require('../controllers/productController')
const { protect, adminOnly } = require('../middleware/auth')
const { upload } = require('../config/cloudinary')

router.get('/', ctrl.getAll)
router.get('/:id', ctrl.getOne)

router.post('/',
  protect, adminOnly,
  upload.array('images', 6),
  body('name').notEmpty(),
  body('price').isNumeric(),
  body('category').notEmpty(),
  body('description').notEmpty(),
  ctrl.create
)

router.put('/:id', protect, adminOnly, upload.array('images', 6), ctrl.update)
router.delete('/:id', protect, adminOnly, ctrl.remove)
router.patch('/:id/toggle', protect, adminOnly, ctrl.toggleVisibility)

module.exports = router
