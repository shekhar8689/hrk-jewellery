const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const Product = require('../models/Product')
const ProductStat = require('../models/ProductStat')
const Order = require('../models/Order')
const User = require('../models/User')
const { createLimiter, ipOf } = require('../utils/rateLimit')

const IST = 5.5 * 60 * 60 * 1000
const dayKey = (t = Date.now()) => new Date(t + IST).toISOString().slice(0, 10)
const EVENTS = { view: 'views', cart: 'carts' }
const BOT_RE = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|whatsapp|curl|wget|python|axios/i

// One visitor counts once per product per event every 6 hours (refreshing doesn't inflate it)
const once = createLimiter({ windowMs: 6 * 60 * 60 * 1000, max: 1 })
// And one address can't flood the counters
const flood = createLimiter({ windowMs: 60 * 60 * 1000, max: 300 })

const isAdmin = async req => {
  const auth = req.headers.authorization || ''
  if (!auth.startsWith('Bearer ')) return false
  try {
    const { id } = jwt.verify(auth.slice(7), process.env.JWT_SECRET)
    const u = await User.findById(id).select('role')
    return u?.role === 'admin'
  } catch { return false }
}

// POST /api/products/:id/seen  { event: 'view' | 'cart' }  (public)
exports.seen = async (req, res) => {
  const { id } = req.params
  const field = EVENTS[req.body?.event]
  if (!mongoose.isValidObjectId(id) || !field) return res.status(400).json({ message: 'Unknown product or event' })
  try {
    const ip = ipOf(req)
    if (BOT_RE.test(req.get('user-agent') || '')) return
    if (!flood.hit(ip) || !once.hit(`${ip}|${id}|${field}`)) return
    if (await isAdmin(req)) return                       // the shop owner checking the shop
    if (!(await Product.exists({ _id: id, isVisible: { $ne: false } }))) return
    await ProductStat.updateOne({ product: id, day: dayKey() }, { $inc: { [field]: 1 } }, { upsert: true })
  } catch (err) { console.error('Could not count product view:', err.message) }
  finally { res.status(204).end() }                      // always "ok": the shopper never waits on errors
}

// GET /api/dashboard/popular?days=30  (admin)
exports.popular = async (req, res) => {
  try {
    const days  = [7, 30, 90, 365].includes(Number(req.query.days)) ? Number(req.query.days) : 30
    const since = Date.now() - (days - 1) * 24 * 60 * 60 * 1000
    const fromDay = dayKey(since)
    const fromDate = new Date(new Date(fromDay + 'T00:00:00+05:30'))

    const [products, stats, orders] = await Promise.all([
      Product.find().select('name images price stock category isVisible').lean(),
      ProductStat.find({ day: { $gte: fromDay } }).lean(),
      Order.find({ createdAt: { $gte: fromDate }, status: { $ne: 'cancelled' } }).select('items paymentStatus').lean(),
    ])

    const by = {}
    const get = id => (by[id] ||= { views: 0, carts: 0, ordered: 0, sold: 0, revenue: 0 })
    for (const s of stats) { const r = get(String(s.product)); r.views += s.views || 0; r.carts += s.carts || 0 }
    for (const o of orders) for (const it of o.items || []) {
      if (!it.product) continue
      const r = get(String(it.product))
      r.ordered += it.quantity || 0
      if (o.paymentStatus === 'paid') { r.sold += it.quantity || 0; r.revenue += (it.price || 0) * (it.quantity || 0) }
    }

    const rows = products.map(p => ({
      _id: String(p._id), name: p.name, image: p.images?.[0] || '', price: p.price, stock: p.stock,
      category: p.category, isVisible: p.isVisible !== false, ...get(String(p._id)),
    })).sort((a, b) => b.views - a.views || b.sold - a.sold || b.carts - a.carts)

    const totals = rows.reduce((t, r) => ({ views: t.views + r.views, carts: t.carts + r.carts, sold: t.sold + r.sold, revenue: t.revenue + r.revenue }), { views: 0, carts: 0, sold: 0, revenue: 0 })
    res.json({ days, since: fromDay, totals, products: rows })
  } catch (err) {
    console.error('Popular report failed:', err.message)
    res.status(500).json({ message: 'Could not load the report' })
  }
}
