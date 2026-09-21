const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { validationResult } = require('express-validator')
const User = require('../models/User')

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })

// Admin login — rejects non-admin accounts
exports.login = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const { email, password } = req.body
  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access only' })
    }
    res.json({ token: signToken(user._id), user })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
}

// User login — rejects admin accounts, checks isActive
exports.userLogin = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg })

  const { email, password } = req.body
  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Use the admin panel to sign in' })
    }
    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact support.' })
    }
    res.json({ token: signToken(user._id), user })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
}

exports.me = async (req, res) => {
  res.json(req.user)
}

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: 'Email is required' })

    const user = await User.findOne({ email: email.toLowerCase().trim() })
    // Always respond success to prevent email enumeration
    if (!user || user.role === 'admin') {
      return res.json({ message: 'If that email exists, a reset link has been sent.' })
    }

    const token   = crypto.randomBytes(32).toString('hex')
    const hashed  = crypto.createHash('sha256').update(token).digest('hex')
    user.passwordResetToken   = hashed
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000 // 1 hour
    await user.save({ validateBeforeSave: false })

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`

    // In production wire this to Nodemailer / Resend / SendGrid
    // For now the token is returned in the response (remove in production)
    console.log(`[DEV] Password reset link for ${email}: ${resetUrl}`)

    res.json({
      message: 'If that email exists, a reset link has been sent.',
      // Remove the line below before going to production:
      _devResetUrl: process.env.NODE_ENV !== 'production' ? resetUrl : undefined,
    })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

// ── POST /api/auth/reset-password/:token ──────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body
    if (!password || password.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters' })
    if (!/\d/.test(password))
      return res.status(400).json({ message: 'Password must contain at least one number' })

    const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex')
    const user   = await User.findOne({
      passwordResetToken:   hashed,
      passwordResetExpires: { $gt: Date.now() },
    })
    if (!user) return res.status(400).json({ message: 'Reset link is invalid or has expired' })

    user.password             = password
    user.passwordResetToken   = undefined
    user.passwordResetExpires = undefined
    await user.save()

    res.json({ message: 'Password has been reset. You can now sign in.' })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

exports.register = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg })

  const { name, email, password } = req.body
  try {
    if (!/^[a-zA-Z\s\-.']+$/.test(name.trim()) || name.trim().length < 2 || name.trim().length > 60)
      return res.status(400).json({ message: 'Name must be 2–60 characters (letters, spaces, hyphens only)' })

    if (password.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters' })
    if (!/\d/.test(password))
      return res.status(400).json({ message: 'Password must contain at least one number' })

    const normalizedEmail = email.toLowerCase().trim()
    if (await User.findOne({ email: normalizedEmail }))
      return res.status(400).json({ message: 'An account with this email already exists' })

    const user = await User.create({ name: name.trim(), email: normalizedEmail, password })
    res.status(201).json({ token: signToken(user._id), user })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
}
