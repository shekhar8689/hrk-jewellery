const { api, makeAdmin, makeUser } = require('../helpers')

const realFetch = global.fetch
const URL_ = 'https://script.google.com/macros/s/AKfycbTEST/exec'
let admin
beforeAll(async () => { admin = await makeAdmin() })
beforeEach(() => { process.env.GMAIL_SCRIPT_URL = URL_; process.env.EMAIL_SECRET = 'longsecret123'; process.env.NODE_ENV = 'production'; process.env.FRONTEND_URL = 'https://www.hrk.in' })
afterEach(() => { global.fetch = realFetch; delete process.env.GMAIL_SCRIPT_URL; delete process.env.EMAIL_SECRET; delete process.env.BREVO_API_KEY; process.env.NODE_ENV = 'test' })
const reply = (body, ok = true) => { global.fetch = jest.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => body, text: async () => JSON.stringify(body) })) }

test('reset email goes through your Gmail (Apps Script) with the secret', async () => {
  reply({ ok: true })
  const { user } = await makeUser()
  await api().post('/api/auth/forgot-password').send({ email: user.email })
  const [url, opts] = global.fetch.mock.calls[0]
  expect(url).toBe(URL_)
  const body = JSON.parse(opts.body)
  expect(body).toEqual(expect.objectContaining({ secret: 'longsecret123', to: user.email, subject: expect.stringMatching(/Reset/) }))
  expect(body.html).toMatch(/https:\/\/www\.hrk\.in\/reset-password\/[0-9a-f]{64}/)
})

test('Gmail sending is preferred over Brevo when both are set', async () => {
  process.env.BREVO_API_KEY = 'xkeysib-x'; process.env.EMAIL_FROM = 'HRK <a@b.in>'
  reply({ ok: true })
  await api().post('/api/shop/test-email').set('Authorization', `Bearer ${admin.token}`).send({})
  expect(global.fetch.mock.calls[0][0]).toBe(URL_)
})

test.each([
  [{ ok: false, error: 'wrong secret' }, /EMAIL_SECRET.*same/i],
  [{ ok: false, error: 'Service invoked too many times for one day: email.' }, /daily limit/i],
])('test email explains script problems %#', async (body, msg) => {
  reply(body)
  const r = await api().post('/api/shop/test-email').set('Authorization', `Bearer ${admin.token}`).send({})
  expect(r.body.sent).toBe(false)
  expect(r.body.problem).toMatch(msg)
})

test('a wrong script address or a missing secret is explained', async () => {
  process.env.GMAIL_SCRIPT_URL = 'https://example.com/x'
  global.fetch = jest.fn()
  let r = await api().post('/api/shop/test-email').set('Authorization', `Bearer ${admin.token}`).send({})
  expect(r.body.problem).toMatch(/script\.google\.com/)
  process.env.GMAIL_SCRIPT_URL = URL_; delete process.env.EMAIL_SECRET
  r = await api().post('/api/shop/test-email').set('Authorization', `Bearer ${admin.token}`).send({})
  expect(r.body.problem).toMatch(/EMAIL_SECRET/)
  expect(global.fetch).not.toHaveBeenCalled()
})

test('a page instead of an answer (script not shared with "Anyone") is explained', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => { throw new Error('not json') }, text: async () => '<html>Sign in</html>' }))
  const r = await api().post('/api/shop/test-email').set('Authorization', `Bearer ${admin.token}`).send({})
  expect(r.body.problem).toMatch(/Anyone/)
})
