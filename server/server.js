require('dotenv').config()
const express  = require('express')
const cors     = require('cors')
const path     = require('path')
const fs       = require('fs')
const connectDB = require('./config/db')

/* ── Auto-create uploads directory so file uploads never crash ── */
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
  console.log('Created uploads/ directory')
}

/* ── Connect to MongoDB, then seed admin user ── */
connectDB().then(seedAdmin)

const app = express()

/* ── CORS: allow the frontend origin ── */
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:3000',
]
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

/* ── Security headers ── */
app.use((_, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  next()
})

/* ── Serve uploaded files as static assets ── */
app.use('/uploads', express.static(uploadsDir))

/* ── API routes ── */
app.use('/api/auth',      require('./routes/auth'))
app.use('/api/products',  require('./routes/products'))
app.use('/api/orders',    require('./routes/orders'))
app.use('/api/users',     require('./routes/users'))
app.use('/api/banners',   require('./routes/banners'))
app.use('/api/dashboard', require('./routes/dashboard'))
app.use('/api/reviews',        require('./routes/reviews'))
app.use('/api/admin/reviews',  require('./routes/adminReviews'))
app.use('/api/coupons',        require('./routes/coupons'))

/* ── Health check ── */
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date() }))

/* ── Global error handler ── */
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message)
  res.status(500).json({ message: err.message || 'Server error' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`\n🚀 Server running on http://localhost:${PORT}\n`))

/* ── Seed admin account from .env if not already in DB ── */
async function seedAdmin() {
  try {
    const User     = require('./models/User')
    const email    = process.env.ADMIN_EMAIL
    const password = process.env.ADMIN_PASSWORD
    const name     = process.env.ADMIN_NAME || 'Admin'
    if (!email || !password) return

    const exists = await User.findOne({ email })
    if (!exists) {
      await User.create({ name, email, password, role: 'admin' })
      console.log(`✅ Admin account created: ${email}`)
    }
  } catch (err) {
    console.error('Admin seed error:', err.message)
  }
}
