const PaymentSettings = require('../models/PaymentSettings')

const UPI_ID_RE   = /^[a-z0-9][a-z0-9.\-_]{1,99}@[a-z][a-z0-9]{1,63}$/
const PAYEE_RE    = /^[a-zA-Z0-9 &.'\-]{2,50}$/
const UTR_RE      = /^[0-9]{12}$/          // UPI transaction number (UTR / UPI Ref No.)

// Unpaid orders are cancelled after this long, so their stock is freed again
const PAY_WITHIN_HOURS = 24

async function getPaymentSettings() {
  return (await PaymentSettings.findOne({ key: 'main' }).lean()) || new PaymentSettings().toObject()
}

const upiReady = s => UPI_ID_RE.test(s?.upiId || '')

module.exports = { UPI_ID_RE, PAYEE_RE, UTR_RE, PAY_WITHIN_HOURS, getPaymentSettings, upiReady }
