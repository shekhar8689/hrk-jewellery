const cloudinary = require('cloudinary').v2
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const multer = require('multer')
const path = require('path')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const storage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'hrk-jewellery', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] },
})

// Absolute path so files land in the same folder server.js serves at /uploads,
// no matter which directory the process was started from.
const uploadsDir = path.join(__dirname, '..', 'uploads')
const localStorage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) =>
    cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')),
})

const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
)

const upload = multer({
  storage: useCloudinary ? storage : localStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Only images allowed'))
  },
})

/* ── Photos + videos (banners, products, category posters) ──────────────────
 * Same as `upload`, but also accepts MP4 / WebM / MOV videos. Photos keep the
 * 5 MB limit; videos may be up to 50 MB (Cloudinary's free plan allows 100 MB).
 */
const IMAGE_MAX = 5 * 1024 * 1024
const VIDEO_MAX = 50 * 1024 * 1024
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

// Some phones upload videos with a generic type, so also go by the extension
const VIDEO_EXT = /\.(mp4|webm|mov)$/i
const isVideoFile = (file) => VIDEO_TYPES.includes(file.mimetype) || (file.mimetype === 'application/octet-stream' && VIDEO_EXT.test(file.originalname || ''))

const mediaCloudStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isVideo = isVideoFile(file)
    return isVideo
      ? { folder: 'hrk-jewellery/videos', resource_type: 'video', allowed_formats: ['mp4', 'webm', 'mov'] }
      : { folder: 'hrk-jewellery', resource_type: 'image', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] }
  },
})

const mediaMulter = multer({
  storage: useCloudinary ? mediaCloudStorage : localStorage,
  limits: { fileSize: VIDEO_MAX },
  fileFilter: (req, file, cb) => {
    if (isVideoFile(file) && file.mimetype === 'application/octet-stream') {
      file.mimetype = 'video/' + (file.originalname.split('.').pop().toLowerCase() === 'mov' ? 'quicktime' : file.originalname.split('.').pop().toLowerCase())
    }
    if (file.mimetype.startsWith('image/') || VIDEO_TYPES.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Only images (JPG, PNG, WebP) or videos (MP4, WebM, MOV) are allowed'))
  },
})

// Wraps multer so oversized photos get a clear message and upload errors
// come back as 400s instead of crashing into the generic 500 handler.
const mediaUpload = (fields) => (req, res, next) => {
  mediaMulter.fields(fields.map(({ name, maxCount }) => ({ name, maxCount })))(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Video must be 50 MB or smaller' : err.message
      return res.status(400).json({ message: msg })
    }
    const all = Object.values(req.files || {}).flat()
    const bigImage = all.find(f => f.mimetype.startsWith('image/') && f.size > IMAGE_MAX)
    if (bigImage) return res.status(400).json({ message: `${bigImage.originalname}: photos must be 5 MB or smaller` })
    const wrongType = fields.find(({ name, kind }) =>
      (req.files?.[name] || []).some(f => kind && !f.mimetype.startsWith(kind + '/')))
    if (wrongType) return res.status(400).json({ message: `Please choose a ${wrongType.kind} file for "${wrongType.name}"` })
    next()
  })
}

// Turn an uploaded file into what we store: a full Cloudinary URL, or a
// local "uploads/<file>" path when Cloudinary isn't configured.
const fileToUrl = (file) =>
  /^https?:\/\//.test(file.path || '') ? file.path : `uploads/${file.filename}`

module.exports = { upload, mediaUpload, fileToUrl, cloudinary, useCloudinary }
