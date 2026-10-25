const mongoose = require('mongoose')

// Where customers send UPI payments (one document, key "main"), edited in
// Admin → Payments.
const paymentSettingsSchema = new mongoose.Schema({
  key:       { type: String, default: 'main', unique: true },
  upiId:     { type: String, trim: true, lowercase: true, maxlength: 100, default: '' },   // e.g. hrkjewellery@okaxis
  payeeName: { type: String, trim: true, maxlength: 50, default: 'HRK Jewellery' },       // shown in the customer's UPI app
}, { timestamps: true })

module.exports = mongoose.model('PaymentSettings', paymentSettingsSchema)
