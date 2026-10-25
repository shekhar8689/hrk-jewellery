const mongoose = require('mongoose')

// Messages sent from the website's Contact page, read in Admin → Messages
const contactMessageSchema = new mongoose.Schema({
  name:    { type: String, trim: true, maxlength: 80, required: true },
  email:   { type: String, trim: true, lowercase: true, maxlength: 120, default: '' },
  phone:   { type: String, trim: true, maxlength: 15, default: '' },
  subject: { type: String, trim: true, maxlength: 120, default: '' },
  message: { type: String, trim: true, maxlength: 2000, required: true },
  handled: { type: Boolean, default: false },
}, { timestamps: true })

contactMessageSchema.index({ handled: 1, createdAt: -1 })

module.exports = mongoose.model('ContactMessage', contactMessageSchema)
