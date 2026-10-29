const { api, makeAdmin, makeProduct, setUpi, placeOrder } = require('../helpers')
const Order = require('../../models/Order')
const ContactMessage = require('../../models/ContactMessage')

let admin
beforeAll(async () => { admin = (await makeAdmin()).token; await setUpi() })

test("the dashboard lists today's to-do: payments to check, orders to pack, messages, low stock", async () => {
  const p = await makeProduct({ stock: 20 })
  await makeProduct({ name: 'Almost Gone Ring', stock: 2 })
  await makeProduct({ name: 'Sold Out Necklace', stock: 0 })
  await makeProduct({ name: 'Hidden Low', stock: 1, isVisible: false })     // hidden: not a to-do
  const a = (await placeOrder({ product: p })).body
  const b = (await placeOrder({ product: p })).body
  await placeOrder({ product: p })                                           // unpaid, nothing sent
  await Order.updateOne({ _id: a._id }, { paymentStatus: 'submitted', upiRef: '412345678901' })
  await Order.updateOne({ _id: b._id }, { paymentStatus: 'paid' })          // paid, waiting to be confirmed/packed
  await ContactMessage.create({ name: 'Riya', phone: '9876543210', message: 'Where is my order please?' })
  await ContactMessage.create({ name: 'Old', phone: '9876543210', message: 'Already answered this one', handled: true })

  const r = await api().get('/api/dashboard/stats').set('Authorization', `Bearer ${admin}`)
  expect(r.status).toBe(200)
  expect(r.body.todo).toEqual(expect.objectContaining({
    paymentsToCheck: 1,
    paidToConfirm: 1,
    unpaid: 1,
    messages: 1,
  }))
  expect(r.body.todo.lowStock.map(x => x.name).sort()).toEqual(['Almost Gone Ring', 'Sold Out Necklace'])
  expect(r.body.todo.lowStock[0]).toEqual(expect.objectContaining({ _id: expect.any(String), stock: expect.any(Number) }))
})
