const Product = require('../models/Product')
const { fileToUrl } = require('../config/cloudinary')
const { validationResult } = require('express-validator')
const { toPage, toLimit } = require('../utils/validation')

const CATEGORIES = ['rings', 'necklaces', 'earrings', 'bracelets', 'anklets']
const isAdmin = req => req.user?.role === 'admin'

const DEFAULT_PAGE_SIZE = 12

exports.getAll = async (req, res) => {
  try {
    const { category, search, visible, isNew, isBestseller } = req.query
    const page = toPage(req.query.page)
    const filter = {}
    // Only plain text values are used, so "?category[$ne]=x" can't turn into a database operator
    if (category !== undefined && category !== 'all') filter.category = CATEGORIES.includes(category) ? category : '__none__'
    if (typeof search === 'string' && search.trim()) filter.$text = { $search: search.slice(0, 100) }
    // Hidden products are for the admin only
    if (!isAdmin(req)) filter.isVisible = true
    else if (visible !== undefined) filter.isVisible = visible === 'true'
    if (isNew !== undefined) filter.isNew = isNew === 'true'
    if (isBestseller !== undefined) filter.isBestseller = isBestseller === 'true'

    const pageSize = toLimit(req.query.limit, DEFAULT_PAGE_SIZE, 200)
    // Run the count and the page query at the same time; .lean() returns plain
    // objects, which is much faster than full Mongoose documents for read-only lists
    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
    ])

    res.json({ products, total, pages: Math.ceil(total / pageSize), page })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
}

exports.getOne = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean()
    if (!product || (!product.isVisible && !isAdmin(req))) return res.status(404).json({ message: 'Product not found' })
    res.json(product)
  } catch {
    res.status(404).json({ message: 'Product not found' })
  }
}

exports.create = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  try {
    const price         = Number(req.body.price)
    const stock         = req.body.stock !== undefined ? Number(req.body.stock) : 0
    const originalPrice = req.body.originalPrice ? Number(req.body.originalPrice) : 0

    if (isNaN(price) || price <= 0)
      return res.status(400).json({ message: 'Price must be a positive number' })
    if (isNaN(stock) || stock < 0 || !Number.isInteger(stock))
      return res.status(400).json({ message: 'Stock must be a non-negative whole number' })
    if (req.body.originalPrice && (isNaN(originalPrice) || originalPrice < 0))
      return res.status(400).json({ message: 'Original price must be a non-negative number' })
    if (!req.body.name || String(req.body.name).trim().length < 2)
      return res.status(400).json({ message: 'Product name must be at least 2 characters' })
    if (!req.body.description || String(req.body.description).trim().length < 10)
      return res.status(400).json({ message: 'Description must be at least 10 characters' })

    const uploadedImages = (req.files?.images || []).map(fileToUrl)
    const urlImages = req.body.imageUrls
      ? req.body.imageUrls.split('\n').map(s => s.trim()).filter(Boolean)
      : []
    const images = [...uploadedImages, ...urlImages]

    const data = { ...req.body, images, price, stock, originalPrice }
    if (typeof data.sizes === 'string') data.sizes = data.sizes.split(',').map(s => s.trim()).filter(Boolean)
    if (typeof data.colors === 'string') data.colors = data.colors.split(',').map(s => s.trim()).filter(Boolean)
    if (data.isNew !== undefined)        data.isNew        = data.isNew        === 'true' || data.isNew        === true
    if (data.isBestseller !== undefined) data.isBestseller = data.isBestseller === 'true' || data.isBestseller === true

    const videoFile = req.files?.video?.[0]
    data.video = videoFile ? fileToUrl(videoFile) : String(req.body.videoUrl || '').trim()

    delete data.imageUrls
    delete data.videoUrl
    delete data.removeVideo
    const product = await Product.create(data)
    res.status(201).json(product)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.update = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ message: 'Product not found' })

    const updates = { ...req.body }

    const uploadedImages = (req.files?.images || []).map(fileToUrl)
    const urlImages = updates.imageUrls
      ? updates.imageUrls.split('\n').map(s => s.trim()).filter(Boolean)
      : []
    const newImages = [...uploadedImages, ...urlImages]
    if (newImages.length) updates.images = newImages

    if (typeof updates.sizes === 'string') updates.sizes = updates.sizes.split(',').map(s => s.trim()).filter(Boolean)
    if (typeof updates.colors === 'string') updates.colors = updates.colors.split(',').map(s => s.trim()).filter(Boolean)
    if (updates.isNew !== undefined) updates.isNew = updates.isNew === 'true' || updates.isNew === true
    if (updates.isBestseller !== undefined) updates.isBestseller = updates.isBestseller === 'true' || updates.isBestseller === true

    // Video: a new upload or pasted link replaces it; "removeVideo" clears it
    const videoFile = req.files?.video?.[0]
    const videoUrl  = String(updates.videoUrl || '').trim()
    if (videoFile)                          updates.video = fileToUrl(videoFile)
    else if (videoUrl)                      updates.video = videoUrl
    else if (updates.removeVideo === 'true') updates.video = ''
    else                                     delete updates.video

    delete updates.imageUrls
    delete updates.videoUrl
    delete updates.removeVideo
    Object.assign(product, updates)
    await product.save()
    res.json(product)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.remove = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id)
    res.json({ message: 'Product deleted' })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

exports.toggleVisibility = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ message: 'Product not found' })
    product.isVisible = !product.isVisible
    await product.save()
    res.json(product)
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}
