const { api, makeProduct } = require('../helpers')

const before = process.env.FRONTEND_URL
afterAll(() => { process.env.FRONTEND_URL = before })

beforeAll(async () => {
  process.env.FRONTEND_URL = 'https://www.hrkjewellery.in/, https://hrk-jewellery.vercel.app'
  await makeProduct({ name: 'Visible Ring', category: 'rings' })
  await makeProduct({ name: 'Hidden Ring', category: 'rings', isVisible: false })
})

test('sitemap lists the main pages and every visible product on the shop domain', async () => {
  const r = await api().get('/sitemap.xml')
  expect(r.status).toBe(200)
  expect(r.headers['content-type']).toMatch(/xml/)
  const Product = require('../../models/Product')
  const vis = await Product.findOne({ name: 'Visible Ring' }), hid = await Product.findOne({ name: 'Hidden Ring' })
  expect(r.text).toContain('<loc>https://www.hrkjewellery.in/</loc>')
  expect(r.text).toContain('<loc>https://www.hrkjewellery.in/help</loc>')
  expect(r.text).toContain(`<loc>https://www.hrkjewellery.in/product/${vis._id}</loc>`)
  expect(r.text).not.toContain(String(hid._id))
  expect(r.text).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/)
  expect(r.text).not.toContain('/admin')
})

test('robots.txt keeps private pages out and points at the sitemap on the shop domain', async () => {
  const r = await api().get('/robots.txt')
  expect(r.status).toBe(200)
  expect(r.text).toContain('Disallow: /admin')
  expect(r.text).toContain('Disallow: /checkout')
  expect(r.text).toContain('Sitemap: https://www.hrkjewellery.in/sitemap.xml')
})
