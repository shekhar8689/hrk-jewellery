const Offer  = require('../models/Offer')
const Coupon = require('../models/Coupon')
const { couponDiscount } = require('../utils/pricing')
const { fileToUrl } = require('../config/cloudinary')

// The saved offer, or the defaults if the admin hasn't saved one yet
async function getOffer() {
  return (await Offer.findOne({ key: 'home' }).lean()) || new Offer().toObject()
}

// The coupon's live state: { code, label, description } or null if it
// doesn't exist / is switched off / expired / used up.
async function liveCoupon(code) {
  if (!code) return null
  const coupon = await Coupon.findOne({ code: String(code).toUpperCase().trim() }).lean()
  const result = couponDiscount(coupon, 1e9)   // big amount: a minimum order doesn't hide it
  if (result.error) return null
  const label = coupon.type === 'percentage'
    ? `${coupon.value}% off`
    : `₹${Number(coupon.value).toLocaleString('en-IN')} off`
  return { code: coupon.code, label, description: coupon.description || '' }
}

const shape = (o, coupon) => ({
  isActive:     o.isActive,
  badge:        o.badge,
  title:        o.title,
  subtitle:     o.subtitle,
  couponCode:   o.couponCode,
  showInTopBar: o.showInTopBar,
  buttonText:   o.buttonText,
  link:         o.link,
  image:        o.image,
  align:        o.align,
  coupon,        // live coupon info or null
})

// ── GET /api/offer  (public) ──────────────────────────────────────────────────
exports.getPublic = async (_req, res) => {
  try {
    const o = await getOffer()
    res.json(shape(o, await liveCoupon(o.couponCode)))
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

// ── GET /api/offer/admin  (admin) ─────────────────────────────────────────────
exports.adminGet = async (_req, res) => {
  try {
    const o = await getOffer()
    const coupon = await liveCoupon(o.couponCode)
    // Tell the admin page why a coupon isn't showing
    let couponProblem = ''
    if (o.couponCode && !coupon) {
      const exists = await Coupon.exists({ code: o.couponCode })
      couponProblem = exists
        ? `Coupon ${o.couponCode} is switched off, expired or used up, so the banner is hidden.`
        : `Coupon ${o.couponCode} doesn't exist yet. Create it in Admin → Coupons, or the banner stays hidden.`
    }
    res.json({ ...shape(o, coupon), couponProblem })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

// ── PUT /api/offer  (admin) ───────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const doc = (await Offer.findOne({ key: 'home' })) || new Offer({ key: 'home' })
    const b = req.body
    const text = (k, max) => { if (b[k] !== undefined) doc[k] = String(b[k]).trim().slice(0, max) }
    text('badge', 40); text('title', 60); text('subtitle', 140); text('buttonText', 30)
    if (b.couponCode !== undefined) doc.couponCode = String(b.couponCode).toUpperCase().trim().slice(0, 30)
    if (b.link !== undefined) {
      const link = String(b.link).trim()
      // Only links inside the site (/collections…) or full https links
      if (link && !/^\/[^/]/.test(link) && !/^https:\/\//.test(link))
        return res.status(400).json({ message: 'Button link must start with / (a page on your site) or https://' })
      doc.link = link || '/collections'
    }
    if (b.align !== undefined) doc.align = b.align === 'center' ? 'center' : 'left'
    if (b.isActive !== undefined) doc.isActive = b.isActive === true || b.isActive === 'true'
    if (b.showInTopBar !== undefined) doc.showInTopBar = b.showInTopBar === true || b.showInTopBar === 'true'

    const file = req.files?.image?.[0]
    const url  = String(b.imageUrl || '').trim()
    if (file)                          doc.image = fileToUrl(file)
    else if (url)                      doc.image = url
    else if (b.removeImage === 'true') doc.image = ''

    if (!doc.title && !doc.couponCode)
      return res.status(400).json({ message: 'Add a title, or a coupon code to show its discount as the title' })

    await doc.save()
    res.json(shape(doc.toObject(), await liveCoupon(doc.couponCode)))
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}
