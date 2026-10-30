const { api, makeAdmin, makeUser } = require('../helpers')

const realFetch = global.fetch
let admin
beforeAll(async () => { admin = await makeAdmin() })
beforeEach(() => {
  process.env.RESEND_API_KEY = 're_test_123'
  process.env.EMAIL_FROM = 'HRK Jewellery <orders@hrkjewellery.in>'
  process.env.NODE_ENV = 'production'; process.env.FRONTEND_URL = 'https://www.hrkjewellery.in'
})
afterEach(() => {
  global.fetch = realFetch
  for (const k of ['RESEND_API_KEY', 'EMAIL_FROM', 'GMAIL_SCRIPT_URL', 'EMAIL_SECRET', 'BREVO_API_KEY']) delete process.env[k]
  process.env.NODE_ENV = 'test'
})
const reply = (status, body) => { global.fetch = jest.fn(async () => ({ ok: status < 300, status, json: async () => body, text: async () => JSON.stringify(body) })) }
const testEmail = () => api().post('/api/shop/test-email').set('Authorization', `Bearer ${admin.token}`).send({})

test('reset email is sent through Resend from your own domain', async () => {
  reply(200, { id: 'abc' })
  const { user } = await makeUser()
  await api().post('/api/auth/forgot-password').send({ email: user.email })
  const [url, opts] = global.fetch.mock.calls[0]
  expect(url).toBe('https://api.resend.com/emails')
  expect(opts.headers.Authorization).toBe('Bearer re_test_123')
  const body = JSON.parse(opts.body)
  expect(body).toEqual(expect.objectContaining({ from: 'HRK Jewellery <orders@hrkjewellery.in>', to: [user.email], subject: expect.stringMatching(/Reset/) }))
  expect(body.html).toMatch(/https:\/\/www\.hrkjewellery\.in\/reset-password\/[0-9a-f]{64}/)
})

test('Resend is used before the Gmail script and Brevo when its key is set', async () => {
  process.env.GMAIL_SCRIPT_URL = 'https://script.google.com/macros/s/X/exec'; process.env.EMAIL_SECRET = 'longsecret123'; process.env.BREVO_API_KEY = 'xkeysib-1'
  reply(200, { id: 'abc' })
  const r = await testEmail()
  expect(r.body.sent).toBe(true)
  expect(global.fetch.mock.calls[0][0]).toBe('https://api.resend.com/emails')
})

test.each([
  [403, { name: 'validation_error', message: 'You can only send testing emails to your own email address (a@b.com). To send emails to other recipients, please verify a domain at resend.com/domains' }, /verify your domain/i],
  [403, { name: 'validation_error', message: 'The hrkjewellery.in domain is not verified. Please, add and verify your domain on https://resend.com/domains' }, /verify your domain/i],
  [401, { name: 'missing_api_key', message: 'Missing API key' }, /RESEND_API_KEY/],
  [400, { name: 'validation_error', message: 'API key is invalid' }, /RESEND_API_KEY/],
  [429, { name: 'daily_quota_exceeded', message: 'You have reached your daily email sending quota.' }, /daily limit/i],
])('Resend problem %# is explained in plain words', async (status, body, msg) => {
  reply(status, body)
  const r = await testEmail()
  expect(r.body.sent).toBe(false)
  expect(r.body.problem).toMatch(msg)
})

test.each([
  ['a key that is not a Resend key', { RESEND_API_KEY: 'xkeysib-abc' }, /re_/],
  ['no EMAIL_FROM', { EMAIL_FROM: '' }, /EMAIL_FROM/],
  ['a Gmail address as sender', { EMAIL_FROM: 'HRK <shop@gmail.com>' }, /your own domain/i],
])('settings problem explained before sending: %s', async (_, env, msg) => {
  Object.assign(process.env, env)
  global.fetch = jest.fn()
  const r = await testEmail()
  expect(r.body.problem).toMatch(msg)
  expect(global.fetch).not.toHaveBeenCalled()
})
