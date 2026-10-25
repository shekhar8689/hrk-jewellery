const { api, makeAdmin, makeProduct, setUpi, placeOrder, shortId, request, app } = require('../helpers')

let order
beforeAll(async () => {
  await setUpi()
  order = (await placeOrder({ product: await makeProduct(), phone: '9876543210' })).body
})
const track = body => api().post('/api/orders/track').send(body)

test.each([
  [() => shortId(order)], [() => '#' + shortId(order).toLowerCase()], [() => order._id],
])('finds the order by its ID form %#', async (id) => {
  const r = await track({ orderId: id(), phone: '+91 98765 43210' })
  expect(r.status).toBe(200)
  expect(r.body.orderId).toBe(shortId(order))
})

test('shows what the customer needs and nothing private', async () => {
  const r = await track({ orderId: shortId(order), phone: '9876543210' })
  const json = JSON.stringify(r.body)
  expect(r.body.deliverTo).toEqual({ name: 'Riya Shah', city: 'Mumbai', state: 'Maharashtra', pincode: '400053' })
  expect(json).not.toMatch(/MG Road|street|email|guestInfo|"_id"|"user"/)
})

test('wrong phone and unknown order give the same answer', async () => {
  const a = await track({ orderId: shortId(order), phone: '9000000000' })
  const b = await track({ orderId: 'ABCDEF12', phone: '9876543210' })
  expect(a.status).toBe(404); expect(b.status).toBe(404)
  expect(a.body).toEqual(b.body)
})

test.each([
  [{ orderId: { $ne: '' }, phone: '9876543210' }],
  [{ orderId: shortId({ _id: 'x'.repeat(24) }), phone: { $gt: '' } }],
  [{ orderId: '.*', phone: '9876543210' }],
])('database tricks are refused %#', async (body) => {
  expect((await track(body)).status).toBe(400)
})

test('after 10 tries the same visitor has to wait', async () => {
  const same = () => request(app).post('/api/orders/track').set('X-Forwarded-For', '203.0.113.9').send({ orderId: 'ABCDEF12', phone: '9000000000' })
  const codes = []
  for (let i = 0; i < 11; i++) codes.push((await same()).status)
  expect(codes.slice(0, 10).every(c => c === 404)).toBe(true)
  expect(codes[10]).toBe(429)
})
