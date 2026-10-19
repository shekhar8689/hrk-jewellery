const Banner = require('../models/Banner')
const { fileToUrl } = require('../config/cloudinary')

// Pick the uploaded file for a field, or the pasted URL, or nothing
const pick = (req, field, urlField) => {
  const file = req.files?.[field]?.[0]
  if (file) return fileToUrl(file)
  const url = (req.body[urlField] || '').trim()
  return url || undefined
}

// Fields that must never be copied straight from the form
const strip = ({ imageUrl, videoUrl, removeImage, _id, __v, createdAt, updatedAt, ...rest }) => rest

exports.getAll = async (_req, res) => {
  try {
    const banners = await Banner.find().sort({ order: 1, createdAt: -1 }).lean()
    res.json(banners)
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

exports.getActive = async (_req, res) => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ order: 1 }).lean()
    res.json(banners)
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

exports.create = async (req, res) => {
  try {
    const mediaType = req.body.mediaType === 'video' ? 'video' : 'image'
    const image = pick(req, 'image', 'imageUrl') || ''
    const video = mediaType === 'video' ? (pick(req, 'video', 'videoUrl') || '') : ''

    if (mediaType === 'image' && !image)
      return res.status(400).json({ message: 'Image required (upload a file or paste a URL)' })
    if (mediaType === 'video' && !video)
      return res.status(400).json({ message: 'Video required (upload a video or paste a video URL)' })

    const banner = await Banner.create({ ...strip(req.body), mediaType, image, video })
    res.status(201).json(banner)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

exports.update = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id)
    if (!banner) return res.status(404).json({ message: 'Banner not found' })

    const updates   = strip(req.body)
    const mediaType = req.body.mediaType === 'video' ? 'video' : req.body.mediaType === 'image' ? 'image' : banner.mediaType
    delete updates.image
    delete updates.video

    const newImage = pick(req, 'image', 'imageUrl')
    const newVideo = pick(req, 'video', 'videoUrl')
    if (newImage) banner.image = newImage
    else if (req.body.removeImage === 'true' && mediaType === 'video') banner.image = ''
    if (newVideo) banner.video = newVideo

    Object.assign(banner, updates, { mediaType })
    if (mediaType === 'image' && !banner.image)
      return res.status(400).json({ message: 'Image required (upload a file or paste a URL)' })
    if (mediaType === 'video' && !banner.video)
      return res.status(400).json({ message: 'Video required (upload a video or paste a video URL)' })

    await banner.save()
    res.json(banner)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

exports.remove = async (req, res) => {
  try {
    await Banner.findByIdAndDelete(req.params.id)
    res.json({ message: 'Banner deleted' })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

exports.toggle = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id)
    if (!banner) return res.status(404).json({ message: 'Banner not found' })
    banner.isActive = !banner.isActive
    await banner.save()
    res.json(banner)
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}
