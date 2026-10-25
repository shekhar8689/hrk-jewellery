/*
 * Checks for the delivery address sent with an order.
 * Returns an error message for the customer, or null if the address is fine.
 */
const PHONE_RE      = /^[6-9][0-9]{9}$/
const PINCODE_RE    = /^[1-9][0-9]{5}$/
const CITY_STATE_RE = /^[a-zA-Z\s\-]+$/   // letters, spaces, hyphens only

const FIELDS = ['name', 'phone', 'street', 'city', 'state', 'pincode']

function validateAddress(addr) {
  if (!addr || typeof addr !== 'object') return 'Delivery name must be 2–100 characters'
  // Every field must be plain text (blocks {"$gt": ""} style tricks and crashes)
  for (const f of FIELDS) {
    if (addr[f] !== undefined && typeof addr[f] !== 'string') return `Please enter a valid ${f === 'pincode' ? 'pincode' : f}`
  }
  const { name = '', phone = '', street = '', city = '', state = '', pincode = '' } = addr

  if (name.trim().length < 2 || name.trim().length > 100)
    return 'Delivery name must be 2–100 characters'
  if (!/^[a-zA-Z\s\-.']+$/.test(name.trim()))
    return 'Name must contain letters, spaces and hyphens only'

  if (!PHONE_RE.test(phone.trim()))
    return 'Phone must be a valid 10-digit Indian mobile number starting with 6–9'

  if (street.trim().length < 5)
    return 'Street address must be at least 5 characters'
  if (street.trim().length > 200)
    return 'Street address must be 200 characters or less'

  if (city.trim().length < 2 || city.trim().length > 50)
    return 'City must be 2–50 characters'
  if (!CITY_STATE_RE.test(city.trim()))
    return 'City name cannot contain numbers or special characters'

  if (state.trim().length < 2)
    return 'State is required'
  if (!CITY_STATE_RE.test(state.trim()))
    return 'State name cannot contain numbers or special characters'

  if (!PINCODE_RE.test(pincode.trim()))
    return 'Pincode must be a valid 6-digit Indian pincode (100000–999999)'

  return null
}

// Text from a search box, made safe to use inside a database search pattern
// (characters like "(" or "*" are matched literally instead of breaking the search)
const escapeRegex = s => String(s).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Page number / page size from the URL: whole numbers within sensible limits
const toPage  = v => Math.max(1, Math.min(parseInt(v, 10) || 1, 10000))
const toLimit = (v, def, max) => Math.max(1, Math.min(parseInt(v, 10) || def, max))

module.exports = { validateAddress, escapeRegex, toPage, toLimit, PHONE_RE, PINCODE_RE }
