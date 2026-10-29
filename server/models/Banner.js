const mongoose = require('mongoose')

const bannerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  badge: { type: String, default: '' },        // small tag above title (e.g. "New Collection 2025")
  cta: { type: String, default: 'Shop Now' },  // call-to-action button text
  align: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
  // A slide shows either a photo or a video
  mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
  // Photo slide: the picture. Video slide: optional cover shown while the video loads.
  image: { type: String, default: '', required: function () { return this.mediaType !== 'video' } },
  video: { type: String, default: '', required: function () { return this.mediaType === 'video' } },
  // Optional tall photo used on phones (a wide photo gets its sides cut off on a tall phone screen)
  mobileImage: { type: String, default: '' },
  // Which part of the wide photo to keep when the screen cuts it
  focus: { type: String, enum: ['left', 'center', 'right', 'top', 'bottom'], default: 'center' },
  link: { type: String, default: '/collections' },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { timestamps: true })

module.exports = mongoose.model('Banner', bannerSchema)
