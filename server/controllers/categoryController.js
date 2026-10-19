const Category = require('../models/Category')
const Product  = require('../models/Product')
const { fileToUrl } = require('../config/cloudinary')

const SLUGS = Category.SLUGS
const titleCase = s => s.charAt(0).toUpperCase() + s.slice(1)

// Defaults for categories the admin hasn't edited yet. The first four match
// what the home page showed before; Anklets starts hidden.
const defaults = slug => ({
  slug,
  label:    titleCase(slug),
  image:    '',
  order:    SLUGS.indexOf(slug),
  isActive: slug !== 'anklets',
})

// All five categories, with saved settings merged over the defaults
async function allCategories() {
  const saved = await Category.find().lean()
  const bySlug = Object.fromEntries(saved.map(c => [c.slug, c]))
  return SLUGS.map(slug => ({ ...defaults(slug), ...(bySlug[slug] || {}) }))
}

// When no poster has been uploaded, use the newest photo of a visible product
// in that category — real store content, never a fixed placeholder image.
async function withFallbackImages(list) {
  return Promise.all(list.map(async c => {
    if (c.image) return { ...c, imageSource: 'poster' }
    const p = await Product.findOne(
      { category: c.slug, isVisible: true, 'images.0': { $exists: true } },
      'images'
    ).sort({ createdAt: -1 }).lean()
    return { ...c, image: p?.images?.[0] || '', imageSource: p ? 'product' : 'none' }
  }))
}

// ── GET /api/categories  (public) — visible categories for the home page ──────
exports.getPublic = async (_req, res) => {
  try {
    const list = (await allCategories()).filter(c => c.isActive).sort((a, b) => a.order - b.order)
    const out  = await withFallbackImages(list)
    res.json(out.map(({ slug, label, image, imageSource, order }) => ({ slug, label, image, imageSource, order })))
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

// ── GET /api/categories/admin  (admin) — all five, including hidden ones ──────
exports.adminGetAll = async (_req, res) => {
  try {
    const list = (await allCategories()).sort((a, b) => a.order - b.order)
    const out  = await withFallbackImages(list)
    // Tell the admin page which image is a real uploaded poster
    res.json(out.map(c => ({ ...c, poster: c.imageSource === 'poster' ? c.image : '' })))
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

// ── PUT /api/categories/:slug  (admin) — update poster / name / order ─────────
exports.update = async (req, res) => {
  try {
    const { slug } = req.params
    if (!SLUGS.includes(slug)) return res.status(404).json({ message: 'Category not found' })

    const doc = (await Category.findOne({ slug })) || new Category(defaults(slug))

    if (req.body.label !== undefined) {
      const label = String(req.body.label).trim()
      if (label.length < 2) return res.status(400).json({ message: 'Name must be at least 2 characters' })
      doc.label = label.slice(0, 40)
    }
    if (req.body.order !== undefined && req.body.order !== '') {
      const order = Number(req.body.order)
      if (!Number.isFinite(order)) return res.status(400).json({ message: 'Order must be a number' })
      doc.order = order
    }
    if (req.body.isActive !== undefined) doc.isActive = req.body.isActive === true || req.body.isActive === 'true'

    const file = req.files?.image?.[0]
    const url  = String(req.body.imageUrl || '').trim()
    if (file)                                 doc.image = fileToUrl(file)
    else if (url)                             doc.image = url
    else if (req.body.removeImage === 'true') doc.image = ''

    await doc.save()
    res.json(doc)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

// ── PATCH /api/categories/:slug/toggle  (admin) — show / hide on home page ────
exports.toggle = async (req, res) => {
  try {
    const { slug } = req.params
    if (!SLUGS.includes(slug)) return res.status(404).json({ message: 'Category not found' })
    const doc = (await Category.findOne({ slug })) || new Category(defaults(slug))
    doc.isActive = !doc.isActive
    await doc.save()
    res.json(doc)
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}
