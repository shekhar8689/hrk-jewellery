const mongoose = require('mongoose')

// The product categories are fixed (see Product.category). This collection
// stores how each one appears in the home page "Shop by Category" section,
// so the admin can change the poster, name, order and visibility.
const SLUGS = ['rings', 'necklaces', 'earrings', 'bracelets', 'anklets']

const categorySchema = new mongoose.Schema({
  slug:     { type: String, required: true, unique: true, enum: SLUGS },
  label:    { type: String, required: true, trim: true, maxlength: 40 },
  image:    { type: String, default: '' },   // Cloudinary URL or uploads/ path
  order:    { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

categorySchema.statics.SLUGS = SLUGS

module.exports = mongoose.model('Category', categorySchema)
