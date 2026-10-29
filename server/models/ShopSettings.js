const mongoose = require('mongoose')

// The shop's contact details (one document, key "main"), edited in
// Admin → Shop Settings and shown on Contact, Help Center, footer and slips.
const shopSettingsSchema = new mongoose.Schema({
  key:         { type: String, default: 'main', unique: true },
  name:        { type: String, trim: true, maxlength: 60,  default: 'HRK Jewellery' },
  phone:       { type: String, trim: true, maxlength: 20,  default: '+91 86898 14335' },
  whatsapp:    { type: String, trim: true, maxlength: 15,  default: '' },   // digits with country code, e.g. 918689814335
  email:       { type: String, trim: true, lowercase: true, maxlength: 120, default: 'hello@hrkjewellery.com' },
  address:     { type: String, trim: true, maxlength: 200, default: 'Mumbai, Maharashtra, India' },
  supportDays: { type: String, trim: true, maxlength: 60,  default: 'Monday – Saturday' },
  supportTime: { type: String, trim: true, maxlength: 60,  default: '10:00 AM – 6:00 PM' },
  instagram:   { type: String, trim: true, maxlength: 200, default: '' },
  facebook:    { type: String, trim: true, maxlength: 200, default: '' },
  youtube:     { type: String, trim: true, maxlength: 200, default: '' },
}, { timestamps: true })

module.exports = mongoose.model('ShopSettings', shopSettingsSchema)
