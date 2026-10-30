const mongoose = require('mongoose')

// How many people looked at / added a product to their bag, one row per product per day (India time)
const productStatSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  day:     { type: String, required: true },          // 'YYYY-MM-DD'
  views:   { type: Number, default: 0 },
  carts:   { type: Number, default: 0 },
})
productStatSchema.index({ product: 1, day: 1 }, { unique: true })
productStatSchema.index({ day: 1 })

module.exports = mongoose.model('ProductStat', productStatSchema)
