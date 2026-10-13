require('dotenv').config()
const express  = require('express')
const cors     = require('cors')
const compression = require('compression')
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
// FRONTEND_URL may hold several comma-separated origins; trailing slashes are ignored
const normalizeOrigin = (o) => o.trim().replace(/\/+$/, '')
const allowedOrigins = [
  ...(process.env.FRONTEND_URL || '').split(',').filter(Boolean).map(normalizeOrigin),
  'http://localhost:5173',
  'http://localhost:3000',
]
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) return cb(null, true)
    // Allow this project's Vercel preview deployments
    if (/^https:\/\/hrk-jewellery[a-z0-9-]*\.vercel\.app$/.test(origin)) return cb(null, true)
    cb(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))

app.use(compression())   // gzip API responses (product lists shrink ~70–80%)
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

/* ── Short browser/CDN caching for public, logged-out GET requests ──
 * Product and banner lists change rarely, so letting browsers reuse them for a
 * minute makes page-to-page navigation much faster. Requests that carry an
 * Authorization header (admin panel, logged-in users) are never cached, so the
 * admin always sees fresh data right after an edit.
 */
const publicCache = (req, res, next) => {
  if (req.method === 'GET' && !req.headers.authorization) {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  } else {
    res.setHeader('Cache-Control', 'no-store')
  }
  res.setHeader('Vary', 'Authorization, Origin')
  next()
}

/* ── API routes ── */
app.use('/api/auth',      require('./routes/auth'))
app.use('/api/products',  publicCache, require('./routes/products'))
app.use('/api/orders',    require('./routes/orders'))
app.use('/api/users',     require('./routes/users'))
app.use('/api/banners',   publicCache, require('./routes/banners'))
app.use('/api/dashboard', require('./routes/dashboard'))
app.use('/api/reviews',        require('./routes/reviews'))
app.use('/api/admin/reviews',  require('./routes/adminReviews'))
app.use('/api/coupons',        require('./routes/coupons'))

/* ── Health check ── */
const { useCloudinary } = require('./config/cloudinary')
if (!useCloudinary) {
  console.warn('⚠️  Cloudinary is NOT configured — uploads are saved to local disk.' +
    ' On Render this disk is wiped on every deploy/restart, so images will disappear.' +
    ' Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.')
}
app.get('/api/health', (_, res) => res.json({
  status: 'ok',
  time: new Date(),
  imageStorage: useCloudinary ? 'cloudinary' : 'local-disk (not persistent on Render)',
}))

/* ── Global error handler ── */
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message)
  res.status(500).json({ message: err.message || 'Server error' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`\n🚀 Server running on http://localhost:${PORT}\n`))

/* ── Ensure the admin account in the DB matches ADMIN_EMAIL / ADMIN_PASSWORD ──
 * Previously this only created the admin when missing, so if an admin already
 * existed in Atlas with a different (older) password, the password set on Render
 * never took effect and login returned 401. The env vars are now the source of
 * truth: on every boot the admin is created, or its password/role is synced.
 */
async function seedAdmin() {
  try {
    const User     = require('./models/User')
    const email    = (process.env.ADMIN_EMAIL || '').toLowerCase().trim()
    const password = process.env.ADMIN_PASSWORD
    const name     = process.env.ADMIN_NAME || 'Admin'
    if (!email || !password) {
      console.warn('⚠️  ADMIN_EMAIL / ADMIN_PASSWORD not set — admin account not created or synced')
      return
    }

    const user = await User.findOne({ email })
    if (!user) {
      await User.create({ name, email, password, role: 'admin' })
      console.log(`✅ Admin account created: ${email}`)
      return
    }

    let changed = false
    if (user.role !== 'admin') { user.role = 'admin'; changed = true }
    if (!user.isActive)        { user.isActive = true; changed = true }
    if (!(await user.comparePassword(password))) {
      user.password = password            // hashed by the pre-save hook
      changed = true
    }
    if (changed) {
      await user.save()
      console.log(`✅ Admin account synced with env: ${email}`)
    }
  } catch (err) {
    console.error('Admin seed error:', err.message)
  }
}
