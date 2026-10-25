// Every admin-only endpoint must refuse visitors and customers.
const { api, makeUser, makeAdmin } = require('../helpers')

const ID = '64b7f0c2a1b2c3d4e5f60718'
const ADMIN_ROUTES = [
  ['get', '/api/orders'], ['get', `/api/orders/${ID}`], ['patch', `/api/orders/${ID}/status`], ['patch', `/api/orders/${ID}/payment`],
  ['get', '/api/users'], ['get', `/api/users/${ID}`], ['patch', `/api/users/${ID}/toggle`],
  ['post', '/api/products'], ['put', `/api/products/${ID}`], ['delete', `/api/products/${ID}`], ['patch', `/api/products/${ID}/toggle`],
  ['post', '/api/banners'], ['put', `/api/banners/${ID}`], ['delete', `/api/banners/${ID}`],
  ['get', '/api/coupons/admin'], ['post', '/api/coupons/admin'], ['put', `/api/coupons/admin/${ID}`], ['delete', `/api/coupons/admin/${ID}`],
  ['get', '/api/offer/admin'], ['put', '/api/offer'],
  ['get', '/api/payment/admin'], ['put', '/api/payment'],
  ['get', '/api/dashboard/stats'],
  ['get', '/api/admin/reviews'], ['delete', `/api/reviews/${ID}`],
  ['get', '/api/categories/admin'],
]

let customer
beforeAll(async () => { customer = (await makeUser()).token })

test.each(ADMIN_ROUTES)('%s %s: visitors get 401', async (m, url) => {
  expect((await api()[m](url).send({})).status).toBe(401)
})

test.each(ADMIN_ROUTES)('%s %s: customers get 403', async (m, url) => {
  expect((await api()[m](url).set('Authorization', `Bearer ${customer}`).send({})).status).toBe(403)
})

test('admin gets through', async () => {
  const { token } = await makeAdmin()
  expect((await api().get('/api/dashboard/stats').set('Authorization', `Bearer ${token}`)).status).toBe(200)
})

test('responses carry basic security headers', async () => {
  const r = await api().get('/api/health')
  expect(r.headers['x-content-type-options']).toBe('nosniff')
  expect(r.headers['x-frame-options']).toBe('DENY')
})

test('unknown websites are not allowed by CORS', async () => {
  const r = await api().get('/api/health').set('Origin', 'https://evil.example')
  expect(r.headers['access-control-allow-origin']).toBeUndefined()
})
