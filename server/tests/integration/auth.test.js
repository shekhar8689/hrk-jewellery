const { api, makeUser, makeAdmin } = require('../helpers')
const User = require('../../models/User')

describe('Customer accounts', () => {
  test('register → login → /me', async () => {
    const reg = await api().post('/api/auth/register').send({ name: 'Ananya Rao', email: 'Ananya@Test.com', password: 'Jewels2026' })
    expect(reg.status).toBe(201)
    expect(reg.body.user).not.toHaveProperty('password')
    const login = await api().post('/api/auth/user/login').send({ email: 'ananya@test.com', password: 'Jewels2026' })
    expect(login.status).toBe(200)
    const me = await api().get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`)
    expect(me.body.email).toBe('ananya@test.com')
    expect(me.body).not.toHaveProperty('password')
  })

  test('nobody can make themselves admin when registering', async () => {
    const reg = await api().post('/api/auth/register').send({ name: 'Evil User', email: 'evil@test.com', password: 'Jewels2026', role: 'admin', isActive: true })
    expect(reg.status).toBe(201)
    expect((await User.findOne({ email: 'evil@test.com' })).role).toBe('user')
  })

  test('weak passwords and duplicate emails are refused', async () => {
    expect((await api().post('/api/auth/register').send({ name: 'A User', email: 'a@test.com', password: 'short1' })).status).toBe(400)
    expect((await api().post('/api/auth/register').send({ name: 'A User', email: 'a@test.com', password: 'longbutnonumber' })).status).toBe(400)
    await api().post('/api/auth/register').send({ name: 'A User', email: 'a@test.com', password: 'Jewels2026' })
    const dup = await api().post('/api/auth/register').send({ name: 'A User', email: 'A@TEST.com', password: 'Jewels2026' })
    expect(dup.status).toBe(400)
  })

  test('wrong password gives the same message as unknown email', async () => {
    const { user } = await makeUser()
    const a = await api().post('/api/auth/user/login').send({ email: user.email, password: 'Wrong1234' })
    const b = await api().post('/api/auth/user/login').send({ email: 'nobody@test.com', password: 'Wrong1234' })
    expect(a.status).toBe(401); expect(b.status).toBe(401)
    expect(a.body.message).toBe(b.body.message)
  })

  test.each([
    ['/api/auth/login'], ['/api/auth/user/login'],
  ])('%s: database tricks in email/password are refused', async (url) => {
    await makeAdmin()
    for (const body of [
      { email: { $gt: '' }, password: { $gt: '' } },
      { email: { $ne: null }, password: 'x' },
      { email: 'admin@x.com', password: { $ne: null } },
    ]) {
      const r = await api().post(url).send(body)
      expect(r.status).toBeGreaterThanOrEqual(400); expect(r.status).toBeLessThan(500)
      expect(r.body.token).toBeUndefined()
    }
  })

  test('customers cannot sign in to the admin panel', async () => {
    const { user } = await makeUser()
    const r = await api().post('/api/auth/login').send({ email: user.email, password: 'Secret123' })
    expect(r.status).toBe(403)
    expect(r.body.token).toBeUndefined()
  })

  test('a deactivated customer cannot sign in', async () => {
    const { user } = await makeUser({ isActive: false })
    const r = await api().post('/api/auth/user/login').send({ email: user.email, password: 'Secret123' })
    expect(r.status).toBe(403)
  })

  test('a deactivated customer is also locked out of a token they already have', async () => {
    const { user, token } = await makeUser()
    await User.updateOne({ _id: user._id }, { isActive: false })
    const r = await api().get('/api/auth/me').set('Authorization', `Bearer ${token}`)
    expect(r.status).toBe(401)
  })

  test.each(['garbage', 'Bearer', 'Bearer abc.def.ghi'])('bad token %p is refused', async (h) => {
    expect((await api().get('/api/auth/me').set('Authorization', h)).status).toBe(401)
  })

  test('a token signed with another secret, or with "alg: none", is refused', async () => {
    const jwt = require('jsonwebtoken')
    const { user } = await makeUser()
    const forged = jwt.sign({ id: user._id }, 'guessed-secret')
    const none = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url') + '.' +
      Buffer.from(JSON.stringify({ id: String(user._id) })).toString('base64url') + '.'
    for (const t of [forged, none]) expect((await api().get('/api/auth/me').set('Authorization', `Bearer ${t}`)).status).toBe(401)
  })
})

describe('Password reset', () => {
  test('full reset flow; link works only once', async () => {
    const { user } = await makeUser()
    const r = await api().post('/api/auth/forgot-password').send({ email: user.email })
    expect(r.status).toBe(200)
    const token = r.body._devResetUrl.split('/').pop()
    expect((await api().post(`/api/auth/reset-password/${token}`).send({ password: 'NewJewels99' })).status).toBe(200)
    expect((await api().post(`/api/auth/reset-password/${token}`).send({ password: 'Another99x' })).status).toBe(400)
    expect((await api().post('/api/auth/user/login').send({ email: user.email, password: 'NewJewels99' })).status).toBe(200)
  })

  test('the reset link is never sent back in production', async () => {
    const { user } = await makeUser()
    process.env.NODE_ENV = 'production'
    try {
      const r = await api().post('/api/auth/forgot-password').send({ email: user.email })
      expect(r.body._devResetUrl).toBeUndefined()
    } finally { process.env.NODE_ENV = 'test' }
  })

  test('the reset link is not written to the server log in production', async () => {
    const { user } = await makeUser()
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {})
    process.env.NODE_ENV = 'production'
    try {
      await api().post('/api/auth/forgot-password').send({ email: user.email })
      expect(spy.mock.calls.flat().join(' ')).not.toMatch(/reset-password/)
    } finally { process.env.NODE_ENV = 'test'; spy.mockRestore() }
  })

  test('same answer for unknown emails (no account guessing)', async () => {
    const r = await api().post('/api/auth/forgot-password').send({ email: 'nobody@test.com' })
    expect(r.status).toBe(200)
    expect(r.body._devResetUrl).toBeUndefined()
  })

  test('a non-text email is refused cleanly', async () => {
    const r = await api().post('/api/auth/forgot-password').send({ email: { $gt: '' } })
    expect(r.status).toBe(400)
  })

  test('admins cannot be reset through the public form', async () => {
    const { user } = await makeAdmin()
    const r = await api().post('/api/auth/forgot-password').send({ email: user.email })
    expect(r.body._devResetUrl).toBeUndefined()
  })
})
