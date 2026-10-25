const { api, makeUser, makeAdmin, makeProduct, makeCoupon, setUpi, placeOrder } = require('../helpers')
const Product = require('../../models/Product')
const Coupon = require('../../models/Coupon')
const Order = require('../../models/Order')

let admin
beforeAll(async () => { admin = (await makeAdmin()).token; await setUpi() })
const stockOf = async p => (await Product.findById(p._id)).stock

describe('Prices are decided by the server', () => {
  test('price, name and photo come from the database, not the browser', async () => {
    const p = await makeProduct()
    const r = await api().post('/api/orders').send({
      shippingAddress: require('../helpers').ADDRESS,
      items: [{ product: String(p._id), quantity: 1, price: 1, name: 'Free stuff', image: 'evil.png' }],
    })
    expect(r.status).toBe(201)
    expect(r.body.items[0]).toEqual(expect.objectContaining({ price: 1899, name: 'Gold Hoop Earrings', image: 'uploads/test.jpg' }))
    expect(r.body.totalAmount).toBe(1899)
  })

  test('shipping ₹99 is added below ₹999', async () => {
    const p = await makeProduct({ price: 499 })
    const r = await placeOrder({ product: p })
    expect(r.body).toEqual(expect.objectContaining({ subtotal: 499, shippingFee: 99, totalAmount: 598 }))
  })

  test('the browser cannot set payment status, discount or totals', async () => {
    const p = await makeProduct()
    const r = await placeOrder({ product: p, paymentStatus: 'paid', status: 'delivered', discount: 1899, subtotal: 0, upiRef: '412345678901' })
    expect(r.status).toBe(201)
    expect(r.body).toEqual(expect.objectContaining({ paymentStatus: 'pending', status: 'pending', discount: 0, totalAmount: 1899, upiRef: '' }))
  })

  test('if the bag shows an old price, the order stops and says the real total', async () => {
    const p = await makeProduct()
    const r = await placeOrder({ product: p, totalAmount: 999 })
    expect(r.status).toBe(409)
    expect(r.body).toEqual(expect.objectContaining({ priceChanged: true, total: 1899 }))
    expect(await stockOf(p)).toBe(10)
  })

  test('Cash on Delivery and other methods are refused', async () => {
    const p = await makeProduct()
    for (const m of ['cod', 'online', 'free']) expect((await placeOrder({ product: p, paymentMethod: m })).status).toBe(400)
  })
})

describe('Quantities and stock', () => {
  test.each([0, -1, 1.5, 101, 'two', null, { $gt: 0 }])('quantity %p is refused', async (qty) => {
    const p = await makeProduct()
    expect((await placeOrder({ product: p, qty })).status).toBe(400)
    expect(await stockOf(p)).toBe(10)
  })

  test('stock goes down when ordered and never below zero', async () => {
    const p = await makeProduct({ stock: 3 })
    expect((await placeOrder({ product: p, qty: 2 })).status).toBe(201)
    expect(await stockOf(p)).toBe(1)
    const r = await placeOrder({ product: p, qty: 2 })
    expect(r.status).toBe(400)
    expect(r.body.message).toMatch(/Only 1 left/)
    expect(await stockOf(p)).toBe(1)
  })

  test('the same product split over two lines counts together against stock', async () => {
    const p = await makeProduct({ stock: 3, sizes: ['6', '7'] })
    const r = await api().post('/api/orders').send({
      shippingAddress: require('../helpers').ADDRESS,
      items: [{ product: String(p._id), quantity: 2, size: '6' }, { product: String(p._id), quantity: 2, size: '7' }],
    })
    expect(r.status).toBe(400)
    expect(await stockOf(p)).toBe(3)
  })

  test('hidden or deleted products cannot be ordered', async () => {
    const hidden = await makeProduct({ isVisible: false })
    expect((await placeOrder({ product: hidden })).status).toBe(400)
    expect((await placeOrder({ product: { _id: '64b7f0c2a1b2c3d4e5f60718' } })).status).toBe(400)
  })

  test('a size or colour the product does not have is refused', async () => {
    const p = await makeProduct({ sizes: ['6', '7'], colors: ['Gold'] })
    const send = item => api().post('/api/orders').send({ shippingAddress: require('../helpers').ADDRESS, items: [{ product: String(p._id), quantity: 1, ...item }] })
    expect((await send({ size: '99' })).status).toBe(400)
    expect((await send({ color: 'Platinum' })).status).toBe(400)
    expect((await send({ size: '7', color: 'Gold' })).status).toBe(201)
  })

  test.each([[[]], [undefined], ['not a list']])('items %p is refused', async (items) => {
    const r = await api().post('/api/orders').send({ shippingAddress: require('../helpers').ADDRESS, items })
    expect(r.status).toBe(400)
  })

  test('a bad address is refused before anything changes', async () => {
    const p = await makeProduct()
    const r = await api().post('/api/orders').send({ shippingAddress: { ...require('../helpers').ADDRESS, phone: { $gt: '' } }, items: [{ product: String(p._id), quantity: 1 }] })
    expect(r.status).toBe(400)
    expect(await stockOf(p)).toBe(10)
  })
})

describe('Coupons', () => {
  test('FIRST10 takes 10% off and is counted once', async () => {
    const p = await makeProduct()
    const c = await makeCoupon({ code: 'TENOFF' })
    const r = await placeOrder({ product: p, couponCode: 'tenoff' })
    expect(r.status).toBe(201)
    expect(r.body).toEqual(expect.objectContaining({ couponCode: 'TENOFF', discount: 190, totalAmount: 1709 }))
    expect((await Coupon.findById(c._id)).usedCount).toBe(1)
  })

  test('a used-up coupon is refused and the order is not placed', async () => {
    const p = await makeProduct()
    await makeCoupon({ code: 'ONCE', maxUses: 1, usedCount: 1 })
    const r = await placeOrder({ product: p, couponCode: 'ONCE' })
    expect(r.status).toBe(400)
    expect(r.body.couponError).toBe(true)
    expect(await stockOf(p)).toBe(10)
  })

  test('a coupon with a limit of 2 can be used exactly twice', async () => {
    const p = await makeProduct()
    await makeCoupon({ code: 'TWICE', maxUses: 2 })
    const results = []
    for (let i = 0; i < 4; i++) results.push((await placeOrder({ product: p, couponCode: 'TWICE' })).status)
    expect(results.filter(s => s === 201)).toHaveLength(2)
    expect((await Coupon.findOne({ code: 'TWICE' })).usedCount).toBe(2)
  })

  test('cancelling an order gives the coupon use back', async () => {
    const p = await makeProduct()
    await makeCoupon({ code: 'BACK', maxUses: 1 })
    const r = await placeOrder({ product: p, couponCode: 'BACK' })
    await api().patch(`/api/orders/${r.body._id}/status`).set('Authorization', `Bearer ${admin}`).send({ status: 'cancelled' })
    expect((await Coupon.findOne({ code: 'BACK' })).usedCount).toBe(0)
    expect(await stockOf(p)).toBe(10)
  })

  test('public coupon check answers but never lists coupons', async () => {
    await makeCoupon({ code: 'SECRET50', value: 50 })
    expect((await api().post('/api/coupons/validate').send({ code: { $ne: null }, orderAmount: 1000 })).status).toBe(404)
    expect((await api().post('/api/coupons/validate').send({ code: 'secret50', orderAmount: 1000 })).body.discount).toBe(500)
  })
})

describe('My orders and cancelling', () => {
  test('customers only see their own orders', async () => {
    const p = await makeProduct()
    const a = await makeUser(), b = await makeUser()
    await placeOrder({ product: p, token: a.token })
    const mine = await api().get('/api/orders/my').set('Authorization', `Bearer ${b.token}`)
    expect(mine.body).toHaveLength(0)
  })

  test("a customer cannot cancel someone else's order", async () => {
    const p = await makeProduct()
    const a = await makeUser(), b = await makeUser()
    const o = await placeOrder({ product: p, token: a.token })
    expect((await api().patch(`/api/orders/${o.body._id}/cancel`).set('Authorization', `Bearer ${b.token}`)).status).toBe(403)
  })

  test('guest orders cannot be cancelled by any customer account', async () => {
    const p = await makeProduct()
    const o = await placeOrder({ product: p })
    const { token } = await makeUser()
    expect((await api().patch(`/api/orders/${o.body._id}/cancel`).set('Authorization', `Bearer ${token}`)).status).toBe(403)
  })

  test('an unpaid order can be cancelled and the stock comes back', async () => {
    const p = await makeProduct()
    const a = await makeUser()
    const o = await placeOrder({ product: p, qty: 2, token: a.token })
    expect(await stockOf(p)).toBe(8)
    const r = await api().patch(`/api/orders/${o.body._id}/cancel`).set('Authorization', `Bearer ${a.token}`)
    expect(r.status).toBe(200)
    expect(await stockOf(p)).toBe(10)
    // cancelling twice does not add stock twice
    expect((await api().patch(`/api/orders/${o.body._id}/cancel`).set('Authorization', `Bearer ${a.token}`)).status).toBe(400)
    expect(await stockOf(p)).toBe(10)
  })

  test('a paid order cannot be cancelled by the customer (refund goes through the shop)', async () => {
    const p = await makeProduct()
    const a = await makeUser()
    const o = await placeOrder({ product: p, token: a.token })
    await Order.updateOne({ _id: o.body._id }, { paymentStatus: 'paid' })
    const r = await api().patch(`/api/orders/${o.body._id}/cancel`).set('Authorization', `Bearer ${a.token}`)
    expect(r.status).toBe(400)
    expect(r.body.message).toMatch(/contact us/)
  })
})

describe('Admin order status', () => {
  test('status can only move forward in order', async () => {
    const p = await makeProduct()
    const o = await placeOrder({ product: p })
    await Order.updateOne({ _id: o.body._id }, { paymentStatus: 'paid' })
    const set = status => api().patch(`/api/orders/${o.body._id}/status`).set('Authorization', `Bearer ${admin}`).send({ status })
    expect((await set('delivered')).status).toBe(400)
    expect((await set('confirmed')).status).toBe(200)
    expect((await set('pending')).status).toBe(400)
    expect((await set('shipped')).status).toBe(200)
    expect((await set('delivered')).status).toBe(200)
    expect((await set('cancelled')).status).toBe(400)
    const steps = (await Order.findById(o.body._id)).statusHistory.map(h => h.status)
    expect(steps).toEqual(['pending', 'confirmed', 'shipped', 'delivered'])
  })

  test('tracking links must be web links', async () => {
    const p = await makeProduct()
    const o = await placeOrder({ product: p })
    const r = await api().patch(`/api/orders/${o.body._id}/status`).set('Authorization', `Bearer ${admin}`).send({ trackingUrl: 'javascript:alert(1)' })
    expect(r.status).toBe(400)
  })
})
