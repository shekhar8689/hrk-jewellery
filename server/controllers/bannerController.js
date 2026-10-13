const Banner = require('../models/Banner')

// Cloudinary gives a full https URL in file.path; local disk gives a filename
const fileToImage = (file) =>
  /^https?:\/\//.test(file.path || '') ? file.path : `uploads/${file.filename}`

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
    // Accept uploaded file (normalize path) or a pasted URL
    const image = req.file ? fileToImage(req.file) : (req.body.imageUrl || '')
    if (!image) return res.status(400).json({ message: 'Image required (upload a file or paste a URL)' })

    const { imageUrl, ...rest } = req.body
    const banner = await Banner.create({ ...rest, image })
    res.status(201).json(banner)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

exports.update = async (req, res) => {
  try {
    const { imageUrl, ...rest } = req.body
    const updates = { ...rest }
    if (req.file) {
      updates.image = fileToImage(req.file)
    } else if (imageUrl) {
      updates.image = imageUrl
    }
    const banner = await Banner.findByIdAndUpdate(req.params.id, updates, { new: true })
    if (!banner) return res.status(404).json({ message: 'Banner not found' })
    res.json(banner)
  } catch (err) {
    res.status(500).json({ message: err.message })
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
