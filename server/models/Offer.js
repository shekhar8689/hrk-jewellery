const mongoose = require('mongoose')

// The home page offer banner (one document, key "home"), edited in
// Admin → Offer Banner.
const offerSchema = new mongoose.Schema({
  key:          { type: String, default: 'home', unique: true },
  isActive:     { type: Boolean, default: true },
  badge:        { type: String, trim: true, maxlength: 40,  default: 'Limited Time Offer' },
  title:        { type: String, trim: true, maxlength: 60,  default: '' },   // empty → uses the coupon's discount, e.g. "10% Off"
  subtitle:     { type: String, trim: true, maxlength: 140, default: '' },
  couponCode:   { type: String, trim: true, uppercase: true, maxlength: 30, default: 'FIRST10' },
  showInTopBar: { type: Boolean, default: true },   // also mention the code in the announcement bar
  buttonText:   { type: String, trim: true, maxlength: 30,  default: 'Shop Now' },
  link:         { type: String, trim: true, maxlength: 200, default: '/collections' },
  image:        { type: String, default: '' },     // Cloudinary URL or uploads/ path
  align:        { type: String, enum: ['left', 'center'], default: 'left' },
}, { timestamps: true })

module.exports = mongoose.model('Offer', offerSchema)
