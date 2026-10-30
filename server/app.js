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
app.disable("x-powered-by")   // don't tell visitors which server software runs

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
    cb(Object.assign(new Error('This website is not allowed to use the HRK API'), { status: 403 }))
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

/* ── Caching ──
 * Shop data (products, categories, banners, offer, shop details, reviews) is
 * the same for every visitor, so:
 *  - browsers reuse it for a minute (faster page-to-page navigation), and
 *  - Vercel's CDN (the website proxies these reads through /api) keeps a copy and
 *    serves it instantly, refreshing in the background. When the free Render
 *    server is asleep, customers still see products at once instead of waiting
 *    30–50 seconds.
 * Anything signed in, private, failed or not a GET is never kept by the CDN.
 */
const CDN_HEADERS = ['Vercel-CDN-Cache-Control', 'CDN-Cache-Control']
app.use('/api', (req, res, next) => {
  for (const h of CDN_HEADERS) res.setHeader(h, 'no-store')
  next()
})
const publicCache = (req, res, next) => {
  if (req.method === 'GET' && !req.headers.authorization) {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
    for (const h of CDN_HEADERS) res.setHeader(h, 'max-age=60, stale-while-revalidate=86400')
    // Only good answers are kept: a 404 or an error must not be served to others
    const writeHead = res.writeHead
    res.writeHead = function (status, ...rest) {
      if (status !== 200 && status !== 304) { for (const h of CDN_HEADERS) this.setHeader(h, 'no-store'); this.setHeader('Cache-Control', 'no-store') }
      return writeHead.call(this, status, ...rest)
    }
  } else {
    res.setHeader('Cache-Control', 'no-store')
  }
  res.setHeader('Vary', 'Authorization, Origin')
  next()
}

app.use('/api/auth',      require('./routes/auth'))
app.use('/api/products',  publicCache, require('./routes/products'))
app.use('/api/orders',    require('./routes/orders'))
app.use('/api/users',     require('./routes/users'))
app.use('/api/banners',   publicCache, require('./routes/banners'))
app.use('/api/categories', publicCache, require('./routes/categories'))
app.use('/api/offer',      publicCache, require('./routes/offer'))
app.use('/api/dashboard', require('./routes/dashboard'))
app.use('/api/reviews',        publicCache, require('./routes/reviews'))
app.use('/api/admin/reviews',  require('./routes/adminReviews'))
app.use('/api/coupons',        require('./routes/coupons'))
app.use('/api/payment',        require('./routes/payment'))
app.use('/api/contact',        require('./routes/contact'))
app.use('/api/shop',           publicCache, require('./routes/shop'))

/* ── For Google: sitemap with every product, and robots.txt (the website
 *    forwards /sitemap.xml and /robots.txt here, see vercel.json) ── */
const seo = require('./controllers/seoController')
app.get('/sitemap.xml', seo.sitemap)
app.get('/robots.txt', seo.robots)

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
  // Mistakes in the request itself get a 4xx and a plain answer
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request is too large' })
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'The request could not be read (invalid JSON)' })
  const status = err.status || err.statusCode
  if (status >= 400 && status < 500) return res.status(status).json({ message: err.message })
  // Real server problems: log the details, but don't show them to visitors
  console.error('[ERROR]', err.stack || err.message)
  res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Server error. Please try again.' : (err.message || 'Server error') })
})

module.exports = app
