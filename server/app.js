/*
 * The Express app (routes, security headers, CORS). server.js connects to the
 * database and starts it; tests load this file directly.
 */
const express  = require('express')
const cors     = require('cors')
const compression = require('compression')
const path     = require('path')
const fs       = require('fs')

/* ── Auto-create uploads directory so file uploads never crash ── */
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
  console.log('Created uploads/ directory')
}

const { trustProxySetting } = require('./utils/config')

const app = express()

// Render runs the app behind one proxy: trust it so req.ip is the visitor's
// address (needed for the per-visitor limits). Elsewhere X-Forwarded-For is
// ignored, because visitors could fake it. Override with TRUST_PROXY.
app.set('trust proxy', trustProxySetting(process.env))

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
  // No cookies are used (sign-in is a token sent in a header), so other sites
  // never get to send credentials
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
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
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
app.use('/api/categories', publicCache, require('./routes/categories'))
app.use('/api/offer',      publicCache, require('./routes/offer'))
app.use('/api/dashboard', require('./routes/dashboard'))
app.use('/api/reviews',        require('./routes/reviews'))
app.use('/api/admin/reviews',  require('./routes/adminReviews'))
app.use('/api/coupons',        require('./routes/coupons'))
app.use('/api/payment',        require('./routes/payment'))

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

module.exports = app
