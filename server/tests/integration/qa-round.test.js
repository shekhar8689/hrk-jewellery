const { api, makeProduct, setUpi, placeOrder, newPhone, ADDRESS } = require('../helpers')
const Product = require('../../models/Product')

beforeAll(() => setUpi())
const send = (p, item) => api().post('/api/orders').send({ shippingAddress: { ...ADDRESS, phone: newPhone() }, items: [{ product: String(p._id), quantity: 1, ...item }] })

describe('size and colour must be chosen', () => {
  test('a ring with several sizes cannot be ordered without a size', async () => {
    const p = await makeProduct({ sizes: ['6', '7'] })
    const r = await send(p, {})
    expect(r.status).toBe(400)
    expect(r.body.message).toMatch(/choose a size/i)
  })
  test('several colours, none chosen → refused', async () => {
    const p = await makeProduct({ colors: ['Gold', 'Silver'] })
    expect((await send(p, {})).status).toBe(400)
  })
  test('only one size → it is filled in by itself', async () => {
    const p = await makeProduct({ sizes: ['Free size'] })
    const r = await send(p, {})
    expect(r.status).toBe(201)
    expect(r.body.items[0].size).toBe('Free size')
  })
})

describe('the last piece is sold only once', () => {
  // Needs a real MongoDB (GitHub runs one). The local FerretDB stand-in can't do
  // one-step conditional updates, so there this check would be meaningless.
  const realMongo = process.env.TEST_NO_TRANSACTIONS ? test.skip : test
  realMongo('8 people ordering the last bracelet at the same moment: one gets it, stock never goes below 0', async () => {
    const p = await makeProduct({ stock: 1 })
    const rs = await Promise.all(Array.from({ length: 8 }, () => placeOrder({ product: p })))
    expect(rs.filter(r => r.status === 201)).toHaveLength(1)
    expect(rs.filter(r => r.status !== 201).every(r => r.status === 400 || r.status === 409)).toBe(true)
    expect((await Product.findById(p._id)).stock).toBe(0)
  })
  test('if one item runs out, the other items in the bag keep their stock', async () => {
    const a = await makeProduct({ stock: 5 }), b = await makeProduct({ stock: 1 })
    const other = await placeOrder({ product: b })            // someone takes the last b
    expect(other.status).toBe(201)
    const r = await api().post('/api/orders').send({ shippingAddress: { ...ADDRESS, phone: newPhone() },
      items: [{ product: String(a._id), quantity: 2 }, { product: String(b._id), quantity: 1 }] })
    expect(r.status).toBe(400)
    expect((await Product.findById(a._id)).stock).toBe(5)
  })
})

describe('bad requests get clear answers, not "server error"', () => {
  test('broken JSON → 400', async () => {
    const r = await api().post('/api/orders').set('Content-Type', 'application/json').send('{"items":[')
    expect(r.status).toBe(400)
    expect(r.body.message).toMatch(/could not be read|invalid/i)
  })
  test('a huge body → 413', async () => {
    const r = await api().post('/api/contact').set('Content-Type', 'application/json').send(`{"name":"${'a'.repeat(2_000_000)}"}`)
    expect(r.status).toBe(413)
  })
  test('another website calling the API → 403, not 500', async () => {
    const r = await api().get('/api/products').set('Origin', 'https://evil.example.com')
    expect(r.status).toBe(403)
    expect(r.headers['access-control-allow-origin']).toBeUndefined()
  })
  test('the server does not announce it runs Express', async () => {
    const r = await api().get('/api/shop')
    expect(r.headers['x-powered-by']).toBeUndefined()
  })
})
