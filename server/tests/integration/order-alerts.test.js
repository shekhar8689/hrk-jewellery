const { api, makeAdmin, makeUser, makeProduct, setUpi, placeOrder, shortId } = require('../helpers')
const email = require('../../utils/email')
const ShopSettings = require('../../models/ShopSettings')

let admin, spy
const as = (r, t) => r.set('Authorization', `Bearer ${t}`)
const sent = async (n = 1) => { for (let i = 0; i < 100 && spy.mock.calls.length < n; i++) await new Promise(r => setTimeout(r, 10)); return spy.mock.calls }
beforeAll(async () => { admin = (await makeAdmin()).token; await setUpi(); process.env.FRONTEND_URL = 'https://hrkjewellery.in' })
beforeEach(async () => { spy = jest.spyOn(email, 'sendEmail').mockResolvedValue({ sent: true }); await ShopSettings.updateOne({ key: 'main' }, { $set: { alertEmail: '' } }, { upsert: true }) })
afterEach(() => spy.mockRestore())
const turnOn = () => as(api().put('/api/shop/alerts'), admin).send({ alertEmail: 'Owner@Example.com' })

test('alerts are off until an email is set', async () => {
  const p = await makeProduct()
  expect((await placeOrder({ product: p })).status).toBe(201)
  await new Promise(r => setTimeout(r, 150))
  expect(spy).not.toHaveBeenCalled()
})

test('the alert email is private: admin only, never in the public shop details', async () => {
  expect((await turnOn()).body).toEqual({ alertEmail: 'owner@example.com' })
  expect((await as(api().get('/api/shop/alerts'), admin)).body).toEqual({ alertEmail: 'owner@example.com' })
  expect(JSON.stringify((await api().get('/api/shop')).body)).not.toMatch(/owner@example/)
  const { token } = await makeUser()
  expect((await as(api().get('/api/shop/alerts'), token)).status).toBe(403)
  expect((await api().put('/api/shop/alerts').send({ alertEmail: 'x@y.com' })).status).toBe(401)
  expect((await as(api().put('/api/shop/alerts'), admin).send({ alertEmail: 'not-an-email' })).status).toBe(400)
})

test('a new order emails the owner: order number, amount, items, customer', async () => {
  await turnOn()
  const p = await makeProduct({ name: 'Diwali Combo', price: 1099 })
  const r = await placeOrder({ product: p })
  expect(r.status).toBe(201)
  const [[mail]] = await sent()
  expect(mail.to).toBe('owner@example.com')
  expect(mail.subject).toMatch(new RegExp(`New order #${shortId(r.body)}.*₹1,099`))
  expect(mail.html).toMatch(/Diwali Combo/)
  expect(mail.html).toMatch(/Riya Shah/)
  expect(mail.html).toMatch(/https:\/\/hrkjewellery\.in\/admin\/orders/)
})

test('customer text in the alert cannot run as code', async () => {
  await turnOn()
  const p = await makeProduct({ name: '<img src=x onerror=alert(1)> Ring' })
  await placeOrder({ product: p })
  const [[mail]] = await sent()
  expect(mail.html).not.toMatch(/<img src=x/)
  expect(mail.html).toMatch(/&lt;img src=x/)
})

test('when the customer sends the UPI number, the owner gets "Payment to check" with the number', async () => {
  const p = await makeProduct({ price: 899 })
  const o = (await placeOrder({ product: p, phone: '9123456789' })).body
  await turnOn()
  const r = await api().post('/api/orders/upi-ref').send({ orderId: shortId(o), phone: '9123456789', utr: '412345678901' })
  expect(r.status).toBe(200)
  const calls = await sent()
  const mail = calls.find(c => /Payment to check/.test(c[0].subject))[0]
  expect(mail.subject).toMatch(new RegExp(`#${shortId(o)}`))
  expect(mail.html).toMatch(/412345678901/)
  expect(mail.html).toMatch(/payment=submitted/)
})

test('"I have paid" without a number: the email says the amount, the note to look for, and who paid', async () => {
  const p = await makeProduct({ price: 369 })
  const o = (await placeOrder({ product: p, phone: '9123456780' })).body
  await turnOn()
  const r = await api().post('/api/orders/upi-ref').send({ orderId: shortId(o), phone: '9123456780' })
  expect(r.status).toBe(200)
  const calls = await sent()
  const mail = calls.find(c => /Payment to check/.test(c[0].subject))[0]
  expect(mail.html).toMatch(new RegExp(`HRK Order ${shortId(o)}`))
  expect(mail.html).toMatch(/9123456780/)
  expect(mail.html).not.toMatch(/UPI Ref No\./)
  expect(mail.html).not.toMatch(/undefined/)
  expect(mail.text).toMatch(/₹/)
})

test('an email problem never stops an order', async () => {
  await turnOn()
  spy.mockRejectedValue(new Error('Resend is down'))
  const p = await makeProduct()
  expect((await placeOrder({ product: p })).status).toBe(201)
})

test('the admin can send a test alert', async () => {
  await turnOn()
  const r = await as(api().post('/api/shop/alerts/test'), admin).send({})
  expect(r.body).toEqual(expect.objectContaining({ sent: true, to: 'owner@example.com' }))
  expect(spy.mock.calls.some(c => /alerts test/i.test(c[0].subject))).toBe(true)
})
