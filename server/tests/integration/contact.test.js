const { api, makeAdmin, request, app } = require('../helpers')

let admin
beforeAll(async () => { admin = (await makeAdmin()).token })
const good = { name: 'Riya Shah', email: 'riya@test.com', phone: '9876543210', subject: 'Order 94E7178C', message: 'I paid but the page did not update. Please check.' }

test('a visitor sends a message and the admin reads it', async () => {
  const r = await api().post('/api/contact').send(good)
  expect(r.status).toBe(201)
  expect(r.body).toEqual({ message: expect.stringMatching(/received/i) })     // nothing else echoed back
  const list = await api().get('/api/contact').set('Authorization', `Bearer ${admin}`)
  expect(list.body.messages[0]).toEqual(expect.objectContaining({ name: 'Riya Shah', email: 'riya@test.com', subject: 'Order 94E7178C', handled: false }))
  expect(list.body.unhandled).toBe(1)
})

test('admin marks a message as handled', async () => {
  const list = await api().get('/api/contact').set('Authorization', `Bearer ${admin}`)
  const id = list.body.messages[0]._id
  const r = await api().patch(`/api/contact/${id}`).set('Authorization', `Bearer ${admin}`).send({ handled: true })
  expect(r.body.handled).toBe(true)
})

test.each([
  [{ ...good, name: '' }, /name/i],
  [{ ...good, email: 'not-an-email', phone: '' }, /email/i],
  [{ ...good, message: 'hi' }, /message/i],
  [{ ...good, message: 'x'.repeat(2001) }, /message/i],
  [{ ...good, email: { $gt: '' } }, /email/i],
])('bad message %# is refused', async (body, msg) => {
  const r = await api().post('/api/contact').send(body)
  expect(r.status).toBe(400)
  expect(r.body.message).toMatch(msg)
})

test('a phone number alone (no email) is enough to reply', async () => {
  expect((await api().post('/api/contact').send({ ...good, email: '' })).status).toBe(201)
})

test('only the admin can read messages', async () => {
  expect((await api().get('/api/contact')).status).toBe(401)
})

test('one visitor can send at most 5 messages an hour', async () => {
  const codes = []
  for (let i = 0; i < 6; i++) codes.push((await request(app).post('/api/contact').set('X-Forwarded-For', '198.51.100.40').send(good)).status)
  expect(codes).toEqual([201, 201, 201, 201, 201, 429])
})
