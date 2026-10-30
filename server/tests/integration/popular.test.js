const { api, makeAdmin, makeUser, makeProduct, setUpi, placeOrder, request, app } = require('../helpers')
const Order = require('../../models/Order')

let admin
beforeAll(async () => { admin = await makeAdmin(); await setUpi() })
const seen = (p, event = 'view', ip) => {
  const r = request(app).post(`/api/products/${p._id}/seen`).send({ event }).set('User-Agent', 'Mozilla/5.0 (iPhone)')
  return ip ? r.set('X-Forwarded-For', ip) : r.set('X-Forwarded-For', `11.0.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`)
}
const report = (days = 30) => api().get(`/api/dashboard/popular?days=${days}`).set('Authorization', `Bearer ${admin.token}`)
const row = (r, p) => r.body.products.find(x => x._id === String(p._id))

test('views and add-to-bag from different visitors are counted', async () => {
  const p = await makeProduct({ name: 'Pearl Studs' })
  await seen(p); await seen(p); await seen(p); await seen(p, 'cart')
  const r = await report()
  expect(r.status).toBe(200)
  expect(row(r, p)).toEqual(expect.objectContaining({ name: 'Pearl Studs', views: 3, carts: 1 }))
})

test('the same visitor opening the product again and again counts once', async () => {
  const p = await makeProduct()
  for (let i = 0; i < 5; i++) await seen(p, 'view', '22.2.2.2')
  expect(row(await report(), p).views).toBe(1)
})

test('search-engine bots, hidden products, bad ids and unknown events are not counted', async () => {
  const p = await makeProduct(), hidden = await makeProduct({ isVisible: false })
  expect((await request(app).post(`/api/products/${p._id}/seen`).send({ event: 'view' }).set('User-Agent', 'Googlebot/2.1').set('X-Forwarded-For', '33.3.3.3')).status).toBe(204)
  await seen(hidden)
  expect((await seen(p, 'buy')).status).toBe(400)
  expect((await request(app).post('/api/products/notanid/seen').send({ event: 'view' })).status).toBe(400)
  const r = await report()
  expect(row(r, p).views).toBe(0)
  expect(row(r, hidden)?.views || 0).toBe(0)
})

test('the shop owner browsing the shop (admin token) is not counted', async () => {
  const p = await makeProduct()
  await seen(p).set('Authorization', `Bearer ${admin.token}`)
  expect(row(await report(), p).views).toBe(0)
})

test('sold = paid, not-cancelled orders in the period; products nobody viewed are listed too', async () => {
  const p = await makeProduct({ price: 500, stock: 20 })
  const a = await placeOrder({ product: p, qty: 2 }), b = await placeOrder({ product: p, qty: 1 }), c = await placeOrder({ product: p, qty: 4 })
  await Order.updateOne({ _id: a.body._id }, { paymentStatus: 'paid', status: 'confirmed' })
  await Order.updateOne({ _id: c.body._id }, { paymentStatus: 'paid', status: 'cancelled' })
  const r = row(await report(), p)
  expect(r).toEqual(expect.objectContaining({ views: 0, sold: 2, revenue: 1000, ordered: 3 }))
})

test('only the admin can see the report, and days is limited to 7/30/90/365', async () => {
  const { token } = await makeUser()
  expect((await api().get('/api/dashboard/popular').set('Authorization', `Bearer ${token}`)).status).toBe(403)
  expect((await api().get('/api/dashboard/popular')).status).toBe(401)
  const r = await report('abc')
  expect(r.status).toBe(200)
  expect(r.body.days).toBe(30)
  expect(r.body.totals).toEqual(expect.objectContaining({ views: expect.any(Number), carts: expect.any(Number), sold: expect.any(Number) }))
})
