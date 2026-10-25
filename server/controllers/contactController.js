const ContactMessage = require('../models/ContactMessage')
const { toPage } = require('../utils/validation')

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[6-9][0-9]{9}$/
const text = v => (typeof v === 'string' ? v.trim() : v === undefined ? '' : null)   // null = not text
const PAGE_SIZE = 20

// ── POST /api/contact  (public) ───────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const name = text(req.body.name), email = text(req.body.email), phone = text(req.body.phone)
    const subject = text(req.body.subject), message = text(req.body.message)
    if (!name || name.length < 2 || name.length > 80) return res.status(400).json({ message: 'Please enter your name' })
    if (email === null || (email && !EMAIL_RE.test(email))) return res.status(400).json({ message: 'Please enter a valid email address' })
    const digits = phone === null ? null : phone.replace(/\D/g, '').slice(-10)
    if (digits === null || (phone && !PHONE_RE.test(digits))) return res.status(400).json({ message: 'Please enter a valid 10-digit mobile number' })
    if (!email && !digits) return res.status(400).json({ message: 'Please give an email address or mobile number so we can reply' })
    if (subject === null) return res.status(400).json({ message: 'Please enter a valid subject' })
    if (!message || message.length < 10) return res.status(400).json({ message: 'Your message must be at least 10 characters' })
    if (message.length > 2000) return res.status(400).json({ message: 'Your message must be 2000 characters or less' })

    await ContactMessage.create({ name, email, phone: digits, subject: subject.slice(0, 120), message })
    res.status(201).json({ message: 'Message received. We usually reply within 24 hours.' })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

// ── GET /api/contact  (admin) ─────────────────────────────────────────────────
exports.list = async (req, res) => {
  try {
    const page = toPage(req.query.page)
    const filter = req.query.show === 'open' ? { handled: false } : {}
    const [messages, total, unhandled] = await Promise.all([
      ContactMessage.find(filter).sort({ handled: 1, createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
      ContactMessage.countDocuments(filter),
      ContactMessage.countDocuments({ handled: false }),
    ])
    res.json({ messages, total, unhandled, page, pages: Math.ceil(total / PAGE_SIZE) })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

// ── PATCH /api/contact/:id  (admin) ───────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const msg = await ContactMessage.findByIdAndUpdate(req.params.id, { handled: req.body.handled === true }, { new: true })
    if (!msg) return res.status(404).json({ message: 'Message not found' })
    res.json(msg)
  } catch {
    res.status(404).json({ message: 'Message not found' })
  }
}
