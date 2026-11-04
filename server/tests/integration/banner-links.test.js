const { api, makeAdmin } = require('../helpers')
const Banner = require('../../models/Banner')

let admin
beforeAll(async () => { admin = (await makeAdmin()).token; process.env.FRONTEND_URL = 'https://hrkjewellery.in,https://www.hrkjewellery.in' })
const save = link => api().post('/api/banners').set('Authorization', `Bearer ${admin}`)
  .send({ title: 'Diwali', imageUrl: 'https://res.cloudinary.com/x/image/upload/v1/a.jpg', link })

test.each([
  ['/collections/ necklace', '/collections/necklaces'],          // space + singular (the live mistake)
  ['/collections/Earrings', '/collections/earrings'],
  ['collections?q=combo', '/collections?q=combo'],                 // missing leading slash
  ['https://www.hrkjewellery.in/collections?q=combo', '/collections?q=combo'],  // full address of the shop
  ['https://hrkjewellery.in/product/abc123', '/product/abc123'],
  ['  /collections  ', '/collections'],
  ['', ''],
])('banner link %p is saved as %p', async (raw, clean) => {
  const r = await save(raw)
  expect(r.status).toBe(201)
  expect(r.body.link).toBe(clean)
})

test.each([
  ['/collections/neckless', /necklaces/],                          // unknown category: says which exist
  ['https://instagram.com/x', /page on your site/i],
])('a banner link that would lead nowhere is refused: %p', async (raw, msg) => {
  const r = await save(raw)
  expect(r.status).toBe(400)
  expect(r.body.message).toMatch(msg)
})

test('banners saved earlier with a broken link still work for customers', async () => {
  await Banner.create({ title: 'Old', image: 'x.jpg', link: '/collections/ necklace', order: -5 })
  const r = await api().get('/api/banners/active')
  expect(r.body.find(b => b.title === 'Old').link).toBe('/collections/necklaces')
})
