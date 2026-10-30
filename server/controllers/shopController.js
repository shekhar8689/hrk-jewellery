const ShopSettings = require('../models/ShopSettings')

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FIELDS = ['name', 'phone', 'whatsapp', 'email', 'address', 'supportDays', 'supportTime', 'instagram', 'facebook', 'youtube']

const getShop = async () => (await ShopSettings.findOne({ key: 'main' }).lean()) || new ShopSettings().toObject()

// Indian mobile number from what was typed: "+91 86898 14335", "08689814335" → "8689814335"
const tenDigits = v => { const d = String(v).replace(/\D/g, ''); return d.length > 10 ? d.slice(-10) : d }

const shape = s => {
  const phone10 = tenDigits(s.phone || '')
  return {
    name: s.name, phone: s.phone, email: s.email, address: s.address,
    supportDays: s.supportDays, supportTime: s.supportTime,
    whatsapp: s.whatsapp || (phone10.length === 10 ? '91' + phone10 : ''),
    instagram: s.instagram, facebook: s.facebook, youtube: s.youtube,
  }
}

// ── GET /api/shop  (public) ───────────────────────────────────────────────────
exports.get = async (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=60')
    res.json(shape(await getShop()))
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

// ── PUT /api/shop  (admin) ────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const b = req.body || {}
    for (const f of FIELDS) {
      if (b[f] !== undefined && typeof b[f] !== 'string') return res.status(400).json({ message: `Please enter a valid ${f === 'phone' ? 'phone number' : f}` })
    }
    const doc = (await ShopSettings.findOne({ key: 'main' })) || new ShopSettings({ key: 'main' })
    const next = { ...shape(doc.toObject()), whatsapp: doc.whatsapp, ...b }

    const p = tenDigits(next.phone || '')
    if (!/^[6-9][0-9]{9}$/.test(p)) return res.status(400).json({ message: 'Enter a valid 10-digit mobile phone number' })
    next.phone = `+91 ${p.slice(0, 5)} ${p.slice(5)}`

    const w = (next.whatsapp || '').trim()
    if (w) {
      const wd = w.replace(/\D/g, '')
      const w10 = wd.length === 12 && wd.startsWith('91') ? wd.slice(2) : wd
      if (!/^[6-9][0-9]{9}$/.test(w10)) return res.status(400).json({ message: 'Enter a valid 10-digit WhatsApp number, or leave it empty to use the phone number' })
      next.whatsapp = '91' + w10
    } else next.whatsapp = ''

    next.email = String(next.email || '').trim().toLowerCase()
    if (!EMAIL_RE.test(next.email) || next.email.length > 120) return res.status(400).json({ message: 'Enter a valid email address' })

    const text = (k, label, max, required = true) => {
      const v = String(next[k] || '').trim().replace(/\s+/g, ' ')
      if ((required && !v) || v.length > max) return `${label} must be ${required ? '1' : '0'}–${max} characters`
      next[k] = v
      return null
    }
    const textErr = text('name', 'Shop name', 60) || text('address', 'The address', 200) ||
      text('supportDays', 'Support hours (days)', 60) || text('supportTime', 'Support hours (time)', 60)
    if (textErr) return res.status(400).json({ message: textErr })

    for (const [k, label] of [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['youtube', 'YouTube']]) {
      const v = String(next[k] || '').trim()
      if (v && (!/^https:\/\/[^\s<>"']+$/.test(v) || v.length > 200)) return res.status(400).json({ message: `${label} link must start with https://` })
      next[k] = v
    }

    for (const f of FIELDS) doc[f] = next[f]
    await doc.save()
    res.json(shape(doc.toObject()))
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

// ── POST /api/shop/test-email  (admin) ─────────────────────────────────────────
// Sends a test email to the admin and explains in plain words if it fails
exports.testEmail = async (req, res) => {
  const { sendEmail } = require('../utils/email')
  const to = req.user.email
  const r = await sendEmail({
    to, subject: 'HRK Jewellery test email',
    text: 'It works! Password reset emails will reach your customers.',
    html: '<p>It works! Password reset emails will reach your customers.</p>',
  })
  res.json(r.sent ? { sent: true, to } : { sent: false, to, problem: r.problem })
}
