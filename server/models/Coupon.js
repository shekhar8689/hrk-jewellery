const mongoose = require('mongoose')

const couponSchema = new mongoose.Schema({
  code:           { type: String, required: true, unique: true, uppercase: true, trim: true },
  type:           { type: String, enum: ['percentage', 'fixed'], required: true },
  value:          { type: Number, required: true, min: 0 },
  minOrderAmount: { type: Number, default: 0, min: 0 },
  maxDiscount:    { type: Number, default: 0 },           // 0 = no cap (used for percentage coupons)
  maxUses:        { type: Number, default: 0 },           // 0 = unlimited
  usedCount:      { type: Number, default: 0 },
  expiresAt:      { type: Date },
  isActive:       { type: Boolean, default: true },
  oncePerCustomer:{ type: Boolean, default: false },      // e.g. a first-order coupon: one use per phone number / account
  description:    { type: String, trim: true, default: '' },
}, { timestamps: true })

couponSchema.index({ code: 1 })

module.exports = mongoose.model('Coupon', couponSchema)
