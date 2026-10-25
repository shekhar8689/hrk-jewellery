const { api, makeAdmin, makeProduct, setUpi, placeOrder, shortId } = require('../helpers')
const Order = require('../../models/Order')
const Product = require('../../models/Product')
const PaymentSettings = require('../../models/PaymentSettings')

let admin
beforeAll(async () => { admin = (await makeAdmin()).token })
const auth = r => r.set('Authorization', `Bearer ${admin}`)
const sendRef = (order, utr, phone = order.shippingAddress.phone) => api().post('/api/orders/upi-ref').send({ orderId: shortId(order), phone, utr })

describe('UPI settings', () => {
  test('checkout is closed until the shop saves a UPI ID', async () => {
    await PaymentSettings.deleteMany({})
    const p = await makeProduct()
    expect((await api().get('/api/payment')).body).toEqual({ ready: false })
    const r = await placeOrder({ product: p })
    expect(r.status).toBe(503)
    expect((await Product.findById(p._id)).stock).toBe(10)
  })

  test('admin saves the UPI ID; the public endpoint never shows it', async () => {
    const r = await auth(api().put('/api/payment')).send({ upiId: ' HRK@OKAXIS ', payeeName: 'HRK Jewellery' })
    expect(r.body).toEqual({ upiId: 'hrk@okaxis', payeeName: 'HRK Jewellery', ready: true })
    expect((await api().get('/api/payment')).body).toEqual({ ready: true })
  })

  test.each([
    [{ upiId: 'nope', payeeName: 'HRK' }],
    [{ upiId: 'hrk@okaxis', payeeName: '<img src=x onerror=alert(1)>' }],
    [{ upiId: { $ne: '' }, payeeName: 'HRK Jewellery' }],
  ])('bad settings %p are refused', async (body) => {
    expect((await auth(api().put('/api/payment')).send(body)).status).toBe(400)
  })
})

describe('Paying for an order', () => {
  beforeAll(() => setUpi('shop@okaxis', 'HRK Jewellery'))

  test('the order remembers which UPI ID to pay, even if the shop changes it later', async () => {
    const o = (await placeOrder({ product: await makeProduct() })).body
    await setUpi('newshop@ybl')
    const t = await api().post('/api/orders/track').send({ orderId: shortId(o), phone: o.shippingAddress.phone })
    expect(t.body.payTo).toEqual({ upiId: 'shop@okaxis', payeeName: 'HRK Jewellery' })
    await setUpi('shop@okaxis')
  })

  test('full journey: pay → send number → shop checks → paid → confirm', async () => {
    const o = (await placeOrder({ product: await makeProduct() })).body
    const confirm = () => auth(api().patch(`/api/orders/${o._id}/status`)).send({ status: 'confirmed' })
    expect((await confirm()).status).toBe(400)                       // not paid yet

    const sent = await sendRef(o, '4123 4567 8901')
    expect(sent.status).toBe(200)
    expect(sent.body).toEqual(expect.objectContaining({ paymentStatus: 'submitted', upiRef: '412345678901' }))
    expect(sent.body).not.toHaveProperty('shippingAddress')           // no full address in the reply
    expect((await confirm()).status).toBe(400)                       // a number alone is not money

    expect((await auth(api().patch(`/api/orders/${o._id}/payment`)).send({ received: true })).body.paymentStatus).toBe('paid')
    expect((await confirm()).status).toBe(200)
    expect((await sendRef(o, '412345678999')).status).toBe(400)      // can't change it after paid
  })

  test('"not received" lets the customer correct the number', async () => {
    const o = (await placeOrder({ product: await makeProduct() })).body
    await sendRef(o, '512345678901')
    const r = await auth(api().patch(`/api/orders/${o._id}/payment`)).send({ received: false })
    expect(r.body.paymentStatus).toBe('failed')
    expect((await sendRef(o, '512345678902')).body.paymentStatus).toBe('submitted')
  })

  test('one transaction number can only pay one order', async () => {
    const a = (await placeOrder({ product: await makeProduct() })).body
    const b = (await placeOrder({ product: await makeProduct() })).body
    expect((await sendRef(a, '612345678901')).status).toBe(200)
    const r = await sendRef(b, '612345678901')
    expect(r.status).toBe(400)
    expect(r.body.message).toMatch(/already used/)
  })

  test.each(['12345', '1234567890123', 'abcdefghijkl', '', null, { $gt: '' }])('transaction number %p is refused', async (utr) => {
    const o = (await placeOrder({ product: await makeProduct() })).body
    expect((await sendRef(o, utr)).status).toBe(400)
    expect((await Order.findById(o._id)).paymentStatus).toBe('pending')
  })

  test('the number needs the phone used for the order', async () => {
    const o = (await placeOrder({ product: await makeProduct() })).body
    expect((await sendRef(o, '712345678901', '9000000000')).status).toBe(404)
  })

  test('only the admin can mark a payment received', async () => {
    const o = (await placeOrder({ product: await makeProduct() })).body
    expect((await api().patch(`/api/orders/${o._id}/payment`).send({ received: true })).status).toBe(401)
    expect((await auth(api().patch(`/api/orders/${o._id}/payment`)).send({ received: 'yes' })).status).toBe(400)
  })

  test('dashboard revenue counts only money received', async () => {
    await Order.deleteMany({})
    const paid = (await placeOrder({ product: await makeProduct() })).body
    await placeOrder({ product: await makeProduct() })               // unpaid
    await auth(api().patch(`/api/orders/${paid._id}/payment`)).send({ received: true })
    expect((await auth(api().get('/api/dashboard/stats'))).body.totalRevenue).toBe(1899)
  })
})

describe('Unpaid orders expire after 24 hours', () => {
  beforeAll(() => setUpi('shop@okaxis'))
  const { expireUnpaid } = require('../../controllers/orderController')

  test('old unpaid orders are cancelled and their stock returned; others are kept', async () => {
    const p = await makeProduct({ stock: 10 })
    const old = (await placeOrder({ product: p, qty: 3 })).body
    const oldButSent = (await placeOrder({ product: p, qty: 1 })).body
    const fresh = (await placeOrder({ product: p, qty: 1 })).body
    await sendRef(oldButSent, '812345678901')
    const dayAgo = new Date(Date.now() - 25 * 3600e3)
    await Order.collection.updateMany({ _id: { $in: [old, oldButSent].map(o => new (require('mongoose').Types.ObjectId)(o._id)) } }, { $set: { createdAt: dayAgo } })
    expect((await Product.findById(p._id)).stock).toBe(5)

    await expireUnpaid({ force: true })

    expect((await Order.findById(old._id)).status).toBe('cancelled')
    expect((await Order.findById(oldButSent._id)).status).toBe('pending')   // customer says they paid: shop decides
    expect((await Order.findById(fresh._id)).status).toBe('pending')
    expect((await Product.findById(p._id)).stock).toBe(8)

    await expireUnpaid({ force: true })                                    // running again changes nothing
    expect((await Product.findById(p._id)).stock).toBe(8)
  })
})
