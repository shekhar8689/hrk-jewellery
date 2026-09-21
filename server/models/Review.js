const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  order:    { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },   // optional — verified purchase
  rating:   { type: Number, required: true, min: 1, max: 5 },
  title:    { type: String, trim: true, maxlength: 100, default: '' },
  text:     { type: String, required: true, trim: true, minlength: 10, maxlength: 500 },
  userName: { type: String, required: true },
  status:   { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, { timestamps: true })

// One review per user per product
reviewSchema.index({ user: 1, product: 1 }, { unique: true })
// Fast lookups by product + status (public listing) and status alone (admin)
reviewSchema.index({ product: 1, status: 1 })
reviewSchema.index({ status: 1 })

module.exports = mongoose.model('Review', reviewSchema)
