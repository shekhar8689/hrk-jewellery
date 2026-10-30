const { api, makeAdmin, makeUser } = require('../helpers')

const realFetch = global.fetch
let admin
beforeAll(async () => { admin = await makeAdmin() })
afterEach(() => { global.fetch = realFetch; delete process.env.BREVO_API_KEY; delete process.env.EMAIL_FROM })
const brevo = (status, body) => { global.fetch = jest.fn(async () => ({ ok: status < 300, status, json: async () => body })) }
const test_ = () => api().post('/api/shop/test-email').set('Authorization', `Bearer ${admin.token}`).send({})

test('sends a test email to the admin and says so', async () => {
  process.env.BREVO_API_KEY = 'xkeysib-abc'; process.env.EMAIL_FROM = 'HRK Jewellery <hrk@gmail.com>'
  brevo(201, { messageId: '1' })
  const r = await test_()
  expect(r.body).toEqual(expect.objectContaining({ sent: true, to: admin.user.email }))
  expect(JSON.parse(global.fetch.mock.calls[0][1].body).subject).toMatch(/test/i)
})

test.each([
  [{}, null, /BREVO_API_KEY.*EMAIL_FROM.*Render/],
  [{ BREVO_API_KEY: 'xsmtpsib-abc', EMAIL_FROM: 'HRK <hrk@gmail.com>' }, null, /SMTP key.*xkeysib-/],
  [{ BREVO_API_KEY: 'xkeysib-bad', EMAIL_FROM: 'HRK <hrk@gmail.com>' }, [401, { code: 'unauthorized', message: 'Key not found' }], /rejected the API key/],
  [{ BREVO_API_KEY: 'xkeysib-ok', EMAIL_FROM: 'HRK <hrk@gmail.com>' }, [400, { code: 'invalid_parameter', message: 'Sender is not valid' }], /verified.*Senders/i],
  [{ BREVO_API_KEY: 'xkeysib-ok', EMAIL_FROM: 'HRK <hrk@gmail.com>' }, [403, { code: 'permission_denied', message: 'Your account is not activated' }], /not activated/i],
  [{ BREVO_API_KEY: 'xkeysib-ok', EMAIL_FROM: 'not an email' }, null, /EMAIL_FROM/],
])('explains the problem in plain words %#', async (env, reply, msg) => {
  Object.assign(process.env, env)
  if (reply) brevo(...reply); else global.fetch = jest.fn()
  const r = await test_()
  expect(r.body.sent).toBe(false)
  expect(r.body.problem).toMatch(msg)
})

test('only the admin can send a test email', async () => {
  const { token } = await makeUser()
  expect((await api().post('/api/shop/test-email').set('Authorization', `Bearer ${token}`)).status).toBe(403)
})
