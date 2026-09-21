const router = require('express').Router()
const { body } = require('express-validator')
const { login, userLogin, me, register, forgotPassword, resetPassword } = require('../controllers/authController')
const { protect } = require('../middleware/auth')

// Admin login
router.post('/login',
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  login
)

// User (storefront) login
router.post('/user/login',
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  userLogin
)

// User registration
router.post('/register',
  body('name').notEmpty().withMessage('Name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  register
)

router.get('/me', protect, me)

router.post('/forgot-password', forgotPassword)
router.post('/reset-password/:token', resetPassword)

module.exports = router
