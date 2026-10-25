const jwt = require('jsonwebtoken')
const User = require('../models/User')

const protect = async (req, res, next) => {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized' })
  }
  try {
    const token = auth.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = await User.findById(decoded.id).select('-password')
    if (!req.user) return res.status(401).json({ message: 'User not found' })
    // A deactivated account is locked out at once, even with a token it already has
    if (req.user.isActive === false) return res.status(401).json({ message: 'Your account has been deactivated. Please contact support.' })
    next()
  } catch {
    res.status(401).json({ message: 'Token invalid' })
  }
}

// Attaches user to req if token present, but does NOT block unauthenticated requests
const protectOptional = async (req, res, next) => {
  const auth = req.headers.authorization
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const token = auth.split(' ')[1]
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.id).select('-password')
      if (user && user.isActive !== false) req.user = user
    } catch {
      // Invalid token is silently ignored — guest checkout still works
    }
  }
  next()
}

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' })
  }
  next()
}

module.exports = { protect, protectOptional, adminOnly }
