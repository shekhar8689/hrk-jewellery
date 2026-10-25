const { api, makeAdmin, makeProduct } = require('../helpers')

let admin
beforeAll(async () => {
  admin = (await makeAdmin()).token
  await makeProduct({ name: 'Visible Ring', category: 'rings' })
  await makeProduct({ name: 'Secret Draft Necklace', category: 'necklaces', isVisible: false })
})

test('the public product list never shows hidden products', async () => {
  for (const q of ['', '?visible=false', '?limit=200', '?category=necklaces']) {
    const r = await api().get('/api/products' + q)
    expect(r.status).toBe(200)
    expect(r.body.products.map(p => p.name)).not.toContain('Secret Draft Necklace')
  }
})

test('a hidden product page is not found for visitors', async () => {
  const hidden = await require('../../models/Product').findOne({ isVisible: false })
  expect((await api().get(`/api/products/${hidden._id}`)).status).toBe(404)
})

test('the admin still sees hidden products', async () => {
  const r = await api().get('/api/products?limit=200').set('Authorization', `Bearer ${admin}`)
  expect(r.body.products.map(p => p.name)).toContain('Secret Draft Necklace')
})

test('database operators in the query string are ignored', async () => {
  const r = await api().get('/api/products?category[$ne]=rings&visible=true')
  expect(r.status).toBe(200)
  expect(r.body.products).toHaveLength(0)   // treated as the (unknown) category text, not an operator
})

test.each(['?page=-1', '?page=abc', '?limit=-5', '?limit=abc', '?limit=100000'])('odd paging %s does not break the list', async (q) => {
  const r = await api().get('/api/products' + q)
  expect(r.status).toBe(200)
  expect(Array.isArray(r.body.products)).toBe(true)
  expect(r.body.products.length).toBeLessThanOrEqual(200)
})

test('a bad product id gives 404, not a server error', async () => {
  expect((await api().get('/api/products/not-an-id')).status).toBe(404)
})

test.each(['(', '[a-', '.*.*.*.*.*.*.*.*.*.*!', '\\'])('admin search with odd characters %p works', async (s) => {
  for (const url of ['/api/orders', '/api/users', '/api/admin/reviews']) {
    const r = await api().get(`${url}?search=${encodeURIComponent(s)}`).set('Authorization', `Bearer ${admin}`)
    expect(r.status).toBe(200)
  }
})
