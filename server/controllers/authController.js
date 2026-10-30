const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { validationResult } = require('express-validator')
const User = require('../models/User')
const { sendEmail, siteUrl, resetEmail } = require('../utils/email')

// New one-hour reset link for a customer (only a hash of it is stored)
async function makeResetLink(user) {
  const token = crypto.randomBytes(32).toString('hex')
  user.passwordResetToken   = crypto.createHash('sha256').update(token).digest('hex')
  user.passwordResetExpires = Date.now() + 60 * 60 * 1000
  await user.save({ validateBeforeSave: false })
  return `${siteUrl()}/reset-password/${token}`
}
exports.makeResetLink = makeResetLink
const { createLimiter, ipOf } = require('../utils/rateLimit')

// Sign-in limits: 10 wrong passwords per account, and 30 failed sign-ins per
// visitor, every 15 minutes. Stops password guessing.
const accountFails = createLimiter({ windowMs: 15 * 60 * 1000, max: 10 })
const visitorFails = createLimiter({ windowMs: 15 * 60 * 1000, max: 30 })
const TOO_MANY = { message: 'Too many sign-in attempts. Please wait 15 minutes and try again, or reset your password.' }
const loginBlocked = (req, email) => accountFails.blocked(email) || visitorFails.blocked(ipOf(req))
const loginFailed  = (req, email) => { accountFails.hit(email); visitorFails.hit(ipOf(req)) }

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })

// Admin login — rejects non-admin accounts
exports.login = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const { email, password } = req.body
  try {
    if (typeof password !== 'string') return res.status(400).json({ message: 'Password required' })
    const key = 'admin:' + email.toLowerCase().trim()
    if (loginBlocked(req, key)) return res.status(429).json(TOO_MANY)
    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user || !(await user.comparePassword(password))) {
      loginFailed(req, key)
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    accountFails.reset(key)
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
    if (typeof password !== 'string') return res.status(400).json({ message: 'Password required' })
    const key = 'user:' + email.toLowerCase().trim()
    if (loginBlocked(req, key)) return res.status(429).json(TOO_MANY)
    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user || !(await user.comparePassword(password))) {
      loginFailed(req, key)
      return res.status(401).json({ message: 'Invalid email or password' })
    }
    accountFails.reset(key)
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
    if (!email || typeof email !== 'string') return res.status(400).json({ message: 'Email is required' })

    const user = await User.findOne({ email: email.toLowerCase().trim() })
    // Always respond success to prevent email enumeration
    if (!user || user.role === 'admin') {
      return res.json({ message: 'If that email exists, a reset link has been sent.' })
    }

    const resetUrl = await makeResetLink(user)
    if (process.env.NODE_ENV !== 'production') console.log(`[DEV] Password reset link for ${email}: ${resetUrl}`)

    const mail = resetEmail(user.name, resetUrl)
    await sendEmail({ to: user.email, toName: user.name, subject: mail.subject, html: mail.html, text: mail.text })

    res.json({
      message: 'If that email exists, a reset link has been sent.',
      // Only when testing on your own computer:
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
    if (!/^[\p{L}\p{M}\s\-.']+$/u.test(name.trim()) || name.trim().length < 2 || name.trim().length > 60)
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
