const Product = require('../models/Product')
const { validationResult } = require('express-validator')

const DEFAULT_PAGE_SIZE = 12

exports.getAll = async (req, res) => {
  try {
    const { page = 1, category, search, visible, isNew, isBestseller, limit } = req.query
    const filter = {}
    if (category && category !== 'all') filter.category = category
    if (search) filter.$text = { $search: search }
    if (visible !== undefined) filter.isVisible = visible === 'true'
    if (isNew !== undefined) filter.isNew = isNew === 'true'
    if (isBestseller !== undefined) filter.isBestseller = isBestseller === 'true'

    const pageSize = limit ? Math.min(Number(limit), 200) : DEFAULT_PAGE_SIZE
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

    res.json({ products, total, pages: Math.ceil(total / pageSize), page: +page })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
}

exports.getOne = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean()
    if (!product) return res.status(404).json({ message: 'Product not found' })
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

    const uploadedImages = req.files?.map(f =>
      // Cloudinary gives a full https URL in f.path; local disk gives a filename
      (/^https?:\/\//.test(f.path || '') ? f.path : `uploads/${f.filename}`)
    ) || []
    const urlImages = req.body.imageUrls
      ? req.body.imageUrls.split('\n').map(s => s.trim()).filter(Boolean)
      : []
    const images = [...uploadedImages, ...urlImages]

    const data = { ...req.body, images, price, stock, originalPrice }
    if (typeof data.sizes === 'string') data.sizes = data.sizes.split(',').map(s => s.trim()).filter(Boolean)
    if (typeof data.colors === 'string') data.colors = data.colors.split(',').map(s => s.trim()).filter(Boolean)
    if (data.isNew !== undefined)        data.isNew        = data.isNew        === 'true' || data.isNew        === true
    if (data.isBestseller !== undefined) data.isBestseller = data.isBestseller === 'true' || data.isBestseller === true

    delete data.imageUrls
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

    const uploadedImages = req.files?.map(f =>
      // Cloudinary gives a full https URL in f.path; local disk gives a filename
      (/^https?:\/\//.test(f.path || '') ? f.path : `uploads/${f.filename}`)
    ) || []
    const urlImages = updates.imageUrls
      ? updates.imageUrls.split('\n').map(s => s.trim()).filter(Boolean)
      : []
    const newImages = [...uploadedImages, ...urlImages]
    if (newImages.length) updates.images = newImages

    if (typeof updates.sizes === 'string') updates.sizes = updates.sizes.split(',').map(s => s.trim()).filter(Boolean)
    if (typeof updates.colors === 'string') updates.colors = updates.colors.split(',').map(s => s.trim()).filter(Boolean)
    if (updates.isNew !== undefined) updates.isNew = updates.isNew === 'true' || updates.isNew === true
    if (updates.isBestseller !== undefined) updates.isBestseller = updates.isBestseller === 'true' || updates.isBestseller === true

    delete updates.imageUrls
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
