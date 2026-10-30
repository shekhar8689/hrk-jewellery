const { api, makeAdmin, makeProduct, setUpi } = require('../helpers')

const CDN = 'vercel-cdn-cache-control'
let admin, p
beforeAll(async () => { admin = await makeAdmin(); await setUpi(); p = await makeProduct() })

test.each([
  '/api/products', `/api/products/__ID__`, '/api/categories', '/api/banners/active', '/api/offer', '/api/shop', '/api/reviews/featured',
])('shop data %s may be kept by the CDN and served while the server wakes up', async url => {
  const r = await api().get(url.replace('__ID__', p._id))
  expect(r.status).toBe(200)
  expect(r.headers[CDN]).toMatch(/max-age=60/)
  expect(r.headers[CDN]).toMatch(/stale-while-revalidate=86400/)
})

test.each([
  ['admin (signed in) product list', r => r.get('/api/products').set('Authorization', `Bearer ${admin.token}`)],
  ['UPI payment details', r => r.get('/api/payment')],
  ['a product that does not exist', r => r.get('/api/products/000000000000000000000000')],
  ['health check', r => r.get('/api/health')],
  ['placing an order', r => r.post('/api/orders').send({})],
])('never kept by the CDN: %s', async (_, call) => {
  const r = await call(api())
  expect(r.headers[CDN]).toBe('no-store')
})
