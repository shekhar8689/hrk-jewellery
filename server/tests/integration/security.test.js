const { api, makeUser, makeProduct, setUpi, request, app, ADDRESS } = require('../helpers')

beforeAll(() => setUpi())
const from = ip => ({
  post: url => request(app).post(url).set('X-Forwarded-For', ip),
})

describe('Placing lots of fake orders to lock up stock', () => {
  test('one phone number can have at most 3 unpaid orders', async () => {
    const p = await makeProduct({ stock: 50 })
    const order = () => api().post('/api/orders').send({ shippingAddress: { ...ADDRESS, phone: '9811111111' }, items: [{ product: String(p._id), quantity: 1 }] })
    const codes = []
    for (let i = 0; i < 4; i++) { const r = await order(); codes.push(r.status === 201 ? 201 : `${r.status} ${r.body.message}`) }
    expect(codes).toEqual([201, 201, 201, expect.stringMatching(/^429 /)])
    const fourth = await order()
    expect(fourth.body.message).toMatch(/unpaid orders/)
  })

  test('one visitor can place at most 8 orders an hour', async () => {
    const p = await makeProduct({ stock: 50 })
    const codes = []
    for (let i = 0; i < 9; i++) {
      codes.push((await from('198.51.100.7').post('/api/orders').send({ shippingAddress: { ...ADDRESS, phone: `98000000${10 + i}` }, items: [{ product: String(p._id), quantity: 1 }] })).status)
    }
    expect(codes.slice(0, 8).every(c => c === 201)).toBe(true)
    expect(codes[8]).toBe(429)
  })
})

describe('Password guessing', () => {
  test('after 10 wrong passwords for an account, sign-in pauses even with the right one', async () => {
    const { user } = await makeUser()
    for (let i = 0; i < 10; i++) {
      expect((await api().post('/api/auth/user/login').send({ email: user.email, password: `Wrong${i}xyz` })).status).toBe(401)
    }
    const r = await api().post('/api/auth/user/login').send({ email: user.email, password: 'Secret123' })
    expect(r.status).toBe(429)
  })

  test('admin sign-in is protected the same way', async () => {
    for (let i = 0; i < 10; i++) await api().post('/api/auth/login').send({ email: 'boss@hrk.com', password: `Wrong${i}xyz` })
    expect((await api().post('/api/auth/login').send({ email: 'boss@hrk.com', password: 'x' })).status).toBe(429)
  })

  test('one visitor trying many different accounts is also slowed down', async () => {
    const codes = []
    for (let i = 0; i < 31; i++) codes.push((await from('198.51.100.20').post('/api/auth/user/login').send({ email: `user${i}@test.com`, password: 'Guess1234' })).status)
    expect(codes[30]).toBe(429)
  })

  test('a successful sign-in is not blocked by a few typos', async () => {
    const { user } = await makeUser()
    for (let i = 0; i < 3; i++) await api().post('/api/auth/user/login').send({ email: user.email, password: 'typo' })
    expect((await api().post('/api/auth/user/login').send({ email: user.email, password: 'Secret123' })).status).toBe(200)
  })
})

describe('Headers', () => {
  test('HSTS tells browsers to always use https', async () => {
    expect((await api().get('/api/health')).headers['strict-transport-security']).toMatch(/max-age=\d+/)
  })
  test('CORS does not allow credentials (the site uses tokens, not cookies)', async () => {
    const r = await api().get('/api/health').set('Origin', 'https://hrk-jewellery-evil.vercel.app')
    expect(r.headers['access-control-allow-credentials']).toBeUndefined()
  })
})
