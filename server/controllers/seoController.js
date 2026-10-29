const Product = require('../models/Product')

// The shop's public address: the first FRONTEND_URL (set on Render).
// Buying a domain later = change FRONTEND_URL; sitemap and robots follow.
const siteUrl = () => ((process.env.FRONTEND_URL || 'https://hrk-jewellery.vercel.app').split(',')[0] || '').trim().replace(/\/+$/, '')

const PAGES = ['/', '/collections', '/collections/rings', '/collections/necklaces', '/collections/earrings', '/collections/bracelets',
  '/collections/anklets', '/help', '/track-order', '/about', '/contact', '/faq', '/shipping-policy', '/return-policy', '/privacy-policy', '/terms']

const xmlEsc = s => String(s).replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]))
const day = d => new Date(d || Date.now()).toISOString().slice(0, 10)

// ── GET /sitemap.xml ──────────────────────────────────────────────────────────
exports.sitemap = async (_req, res) => {
  try {
    const base = siteUrl()
    const products = await Product.find({ isVisible: true }).select('_id updatedAt').sort({ updatedAt: -1 }).limit(5000).lean()
    const urls = [
      ...PAGES.map(p => `  <url><loc>${xmlEsc(base + p)}</loc></url>`),
      ...products.map(p => `  <url><loc>${xmlEsc(`${base}/product/${p._id}`)}</loc><lastmod>${day(p.updatedAt)}</lastmod></url>`),
    ]
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`)
  } catch {
    res.status(500).send('Server error')
  }
}

// ── GET /robots.txt ───────────────────────────────────────────────────────────
exports.robots = (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.send(['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /checkout', 'Disallow: /pay', 'Disallow: /my-orders',
    'Disallow: /reset-password', '', `Sitemap: ${siteUrl()}/sitemap.xml`, ''].join('\n'))
}
