const PaymentSettings = require('../models/PaymentSettings')
const { UPI_ID_RE, PAYEE_RE, getPaymentSettings, upiReady } = require('../utils/upi')

const shape = s => ({ upiId: s.upiId || '', payeeName: s.payeeName || 'HRK Jewellery', ready: upiReady(s) })

// ── GET /api/payment  (public) — is online payment set up? ───────────────────
exports.getPublic = async (_req, res) => {
  try {
    res.json({ ready: upiReady(await getPaymentSettings()) })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

// ── GET /api/payment/admin  (admin) ───────────────────────────────────────────
exports.adminGet = async (_req, res) => {
  try {
    res.json(shape(await getPaymentSettings()))
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

// ── PUT /api/payment  (admin) ─────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const upiId     = String(req.body.upiId ?? '').trim().toLowerCase()
    const payeeName = String(req.body.payeeName ?? '').trim().replace(/\s+/g, ' ')
    if (!UPI_ID_RE.test(upiId))
      return res.status(400).json({ message: 'Enter a valid UPI ID, e.g. hrkjewellery@okaxis' })
    if (!PAYEE_RE.test(payeeName))
      return res.status(400).json({ message: 'Name must be 2–50 letters or numbers, e.g. HRK Jewellery' })

    const doc = (await PaymentSettings.findOne({ key: 'main' })) || new PaymentSettings({ key: 'main' })
    doc.upiId = upiId
    doc.payeeName = payeeName
    await doc.save()
    res.json(shape(doc.toObject()))
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}
