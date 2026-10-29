const { api, makeAdmin, makeUser } = require('../helpers')

let admin
beforeAll(async () => { admin = (await makeAdmin()).token })
const save = body => api().put('/api/shop').set('Authorization', `Bearer ${admin}`).send(body)
const good = {
  phone: '+91 86898 14335', whatsapp: '8689814335', email: 'Orders@HRKJewellery.in',
  address: 'Shop 4, MG Road, Pune, Maharashtra', supportDays: 'Monday – Sunday', supportTime: '10:00 AM – 7:00 PM',
  instagram: 'https://www.instagram.com/hrkjewellery', facebook: '', youtube: '',
}

test('before anything is saved, the public endpoint answers with sensible defaults', async () => {
  const r = await api().get('/api/shop')
  expect(r.status).toBe(200)
  expect(r.body).toEqual(expect.objectContaining({ name: 'HRK Jewellery', phone: expect.any(String), supportDays: expect.any(String) }))
})

test('admin saves the details; everyone sees them; phone and email are tidied', async () => {
  const r = await save(good)
  expect(r.status).toBe(200)
  expect(r.body).toEqual(expect.objectContaining({ phone: '+91 86898 14335', whatsapp: '918689814335', email: 'orders@hrkjewellery.in', instagram: 'https://www.instagram.com/hrkjewellery' }))
  const pub = await api().get('/api/shop')
  expect(pub.body).toEqual(expect.objectContaining({ phone: '+91 86898 14335', whatsapp: '918689814335', supportTime: '10:00 AM – 7:00 PM' }))
  expect(pub.headers['cache-control']).toMatch(/no-store|max-age=(\d{1,2})\b/)
})

test('a 10-digit number is written the standard way', async () => {
  const r = await save({ ...good, phone: '9876543210' })
  expect(r.body.phone).toBe('+91 98765 43210')
})

test('WhatsApp number left empty uses the phone number', async () => {
  const r = await save({ ...good, phone: '8689814335', whatsapp: '' })
  expect(r.body.whatsapp).toBe('918689814335')
})

test.each([
  [{ phone: '12345' }, /phone/i],
  [{ phone: '5876543210' }, /phone/i],
  [{ whatsapp: '12' }, /WhatsApp/i],
  [{ email: 'not-an-email' }, /email/i],
  [{ instagram: 'javascript:alert(1)' }, /Instagram/i],
  [{ facebook: 'http://facebook.com/x' }, /Facebook/i],
  [{ address: 'x'.repeat(201) }, /address/i],
  [{ supportTime: '' }, /hours/i],
  [{ phone: { $gt: '' } }, /phone/i],
])('bad value %p is refused and nothing changes', async (change, msg) => {
  await save(good)
  const r = await save({ ...good, ...change })
  expect(r.status).toBe(400)
  expect(r.body.message).toMatch(msg)
  expect((await api().get('/api/shop')).body.phone).toBe('+91 86898 14335')
})

test('only the admin can change shop details', async () => {
  expect((await api().put('/api/shop').send(good)).status).toBe(401)
  const { token } = await makeUser()
  expect((await api().put('/api/shop').set('Authorization', `Bearer ${token}`).send(good)).status).toBe(403)
})
