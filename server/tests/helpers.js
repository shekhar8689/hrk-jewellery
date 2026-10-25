const jwt = require('jsonwebtoken')
const request = require('supertest')
const app = require('../app')
const User = require('../models/User')
const Product = require('../models/Product')
const Coupon = require('../models/Coupon')
const PaymentSettings = require('../models/PaymentSettings')

let n = 0
const uid = () => `${Date.now().toString(36)}${(n++).toString(36)}`
const tokenFor = user => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' })

async function makeUser(over = {}) {
  const user = await User.create({ name: 'Riya Shah', email: `riya_${uid()}@test.com`, password: 'Secret123', ...over })
  return { user, token: tokenFor(user) }
}
const makeAdmin = () => makeUser({ name: 'Admin', role: 'admin' })

const makeProduct = (over = {}) => Product.create({
  name: 'Gold Hoop Earrings', description: 'Light gold-plated hoops for every day.',
  price: 1899, category: 'earrings', stock: 10, images: ['uploads/test.jpg'], ...over,
})

const makeCoupon = (over = {}) => Coupon.create({ code: 'FIRST10', type: 'percentage', value: 10, ...over })

const setUpi = (upiId = 'hrkjewellery@okaxis', payeeName = 'HRK Jewellery') =>
  PaymentSettings.findOneAndUpdate({ key: 'main' }, { upiId, payeeName }, { upsert: true, new: true })

const ADDRESS = { name: 'Riya Shah', phone: '9876543210', street: '12 MG Road, Andheri', city: 'Mumbai', state: 'Maharashtra', pincode: '400053' }

// Each call looks like a different visitor, so per-IP limits don't interfere
let ip = 0
const visitor = () => `10.${(ip >> 16) & 255}.${(ip >> 8) & 255}.${ip++ & 255}`
const api = () => {
  const ag = request(app)
  const wrap = m => (url) => ag[m](url).set('X-Forwarded-For', visitor())
  return { get: wrap('get'), post: wrap('post'), put: wrap('put'), patch: wrap('patch'), delete: wrap('delete') }
}

// A different valid mobile number for each order (one phone may hold only 3 unpaid orders)
let ph = 0
const newPhone = () => String(9100000000 + (Date.now() % 1e6) * 100 + (ph++ % 100))

function placeOrder({ product, qty = 1, phone = newPhone(), token, ...extra }) {
  const req = api().post('/api/orders').send({
    shippingAddress: { ...ADDRESS, phone },
    items: [{ product: String(product._id), quantity: qty }],
    ...extra,
  })
  return token ? req.set('Authorization', `Bearer ${token}`) : req
}

const shortId = order => String(order._id).slice(-8).toUpperCase()

module.exports = { newPhone, app, api, makeUser, makeAdmin, makeProduct, makeCoupon, setUpi, placeOrder, shortId, tokenFor, ADDRESS, request }
