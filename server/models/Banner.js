const mongoose = require('mongoose')

const bannerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  badge: { type: String, default: '' },        // small tag above title (e.g. "New Collection 2025")
  cta: { type: String, default: 'Shop Now' },  // call-to-action button text
  align: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
  image: { type: String, required: true },
  link: { type: String, default: '/collections' },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { timestamps: true })

module.exports = mongoose.model('Banner', bannerSchema)
