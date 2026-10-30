const { api, makeUser, makeAdmin } = require('../helpers')

const realFetch = global.fetch
let sent
beforeEach(() => {
  sent = []
  global.fetch = jest.fn(async (url, opts) => { sent.push({ url, body: JSON.parse(opts.body), headers: opts.headers }); return { ok: true, status: 201, json: async () => ({ messageId: 'x' }) } })
  process.env.BREVO_API_KEY = 'test-key'
  process.env.EMAIL_FROM = 'HRK Jewellery <hrkjewellery@gmail.com>'
  process.env.FRONTEND_URL = 'https://www.hrkjewellery.in'
  process.env.NODE_ENV = 'production'
})
afterEach(() => { global.fetch = realFetch; delete process.env.BREVO_API_KEY; process.env.NODE_ENV = 'test' })

test('forgot password emails the customer a working reset link', async () => {
  const { user } = await makeUser()
  const r = await api().post('/api/auth/forgot-password').send({ email: user.email })
  expect(r.status).toBe(200)
  expect(r.body._devResetUrl).toBeUndefined()
  expect(sent).toHaveLength(1)
  expect(sent[0].url).toBe('https://api.brevo.com/v3/smtp/email')
  expect(sent[0].headers['api-key']).toBe('test-key')
  expect(sent[0].body.to).toEqual([{ email: user.email, name: user.name }])
  expect(sent[0].body.sender).toEqual({ name: 'HRK Jewellery', email: 'hrkjewellery@gmail.com' })
  const link = sent[0].body.htmlContent.match(/https:\/\/www\.hrkjewellery\.in\/reset-password\/[0-9a-f]{64}/)[0]
  global.fetch = realFetch
  const done = await api().post(`/api/auth/reset-password/${link.split('/').pop()}`).send({ password: 'NewJewels99' })
  expect(done.status).toBe(200)
})

test('no email is sent for unknown addresses, and the answer looks the same', async () => {
  const r = await api().post('/api/auth/forgot-password').send({ email: 'nobody@test.com' })
  expect(r.status).toBe(200)
  expect(sent).toHaveLength(0)
})

test('admin can make a reset link for a customer (to send on WhatsApp)', async () => {
  const { user } = await makeUser({ phone: '9876543210' })
  const { token } = await makeAdmin()
  const r = await api().post(`/api/users/${user._id}/reset-link`).set('Authorization', `Bearer ${token}`)
  expect(r.status).toBe(200)
  expect(r.body.link).toMatch(/^https:\/\/www\.hrkjewellery\.in\/reset-password\/[0-9a-f]{64}$/)
  expect(r.body.expiresInMinutes).toBe(60)
  global.fetch = realFetch
  expect((await api().post(`/api/auth/reset-password/${r.body.link.split('/').pop()}`).send({ password: 'NewJewels99' })).status).toBe(200)
})

test('customers cannot make reset links, and admin accounts cannot be reset this way', async () => {
  const a = await makeUser(), b = await makeUser()
  expect((await api().post(`/api/users/${b.user._id}/reset-link`).set('Authorization', `Bearer ${a.token}`)).status).toBe(403)
  const admin = await makeAdmin()
  const r = await api().post(`/api/users/${admin.user._id}/reset-link`).set('Authorization', `Bearer ${admin.token}`)
  expect(r.status).toBe(400)
})
