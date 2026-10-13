const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, min: 0 },
  category: {
    type: String,
    required: true,
    enum: ['rings', 'necklaces', 'earrings', 'bracelets', 'anklets'],
  },
  material: { type: String, default: '' },
  images: [{ type: String }],
  sizes: [{ type: String }],
  colors: [{ type: String }],
  isVisible: { type: Boolean, default: true },
  isNew: { type: Boolean, default: false },
  isBestseller: { type: Boolean, default: false },
  stock: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  reviews: { type: Number, default: 0 },
}, { timestamps: true })

productSchema.index({ name: 'text', description: 'text', category: 1 })
// Indexes for the storefront's most common queries (home page, collections)
productSchema.index({ isVisible: 1, createdAt: -1 })
productSchema.index({ isVisible: 1, isBestseller: 1, createdAt: -1 })
productSchema.index({ isVisible: 1, isNew: 1, createdAt: -1 })
productSchema.index({ isVisible: 1, category: 1, createdAt: -1 })

module.exports = mongoose.model('Product', productSchema)
