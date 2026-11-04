const { api, makeAdmin, makeUser } = require('../helpers')
const Banner = require('../../models/Banner')

let admin
beforeAll(async () => { admin = (await makeAdmin()).token })
beforeEach(() => Banner.deleteMany({}))
const as = (r, t = admin) => r.set('Authorization', `Bearer ${t}`)
const add = (title, extra = {}) => as(api().post('/api/banners')).send({ title, imageUrl: 'https://res.cloudinary.com/x/image/upload/v1/a.jpg', ...extra })

test('a banner can be a poster (its text is already in the picture)', async () => {
  const r = await add('Diwali poster', { style: 'poster' })
  expect(r.status).toBe(201)
  expect(r.body.style).toBe('poster')
  expect((await add('Plain')).body.style).toBe('text')
  expect((await add('Bad', { style: 'weird' })).status).toBe(400)
})

test('the admin puts banners in order 1, 2, 3 and the website shows them in that order', async () => {
  const a = (await add('A')).body, b = (await add('B')).body, c = (await add('C')).body
  const r = await as(api().put('/api/banners/reorder')).send({ ids: [c._id, a._id, b._id] })
  expect(r.status).toBe(200)
  expect(r.body.map(x => x.title)).toEqual(['C', 'A', 'B'])
  const live = await api().get('/api/banners/active')
  expect(live.body.map(x => x.title)).toEqual(['C', 'A', 'B'])
})

test('new banners go to the end instead of tying at 0', async () => {
  await add('First'); await add('Second'); await add('Third')
  expect((await api().get('/api/banners/active')).body.map(x => x.title)).toEqual(['First', 'Second', 'Third'])
})

test('reorder needs the admin and real banner ids', async () => {
  const a = (await add('A')).body
  const { token } = await makeUser()
  expect((await as(api().put('/api/banners/reorder'), token).send({ ids: [a._id] })).status).toBe(403)
  expect((await as(api().put('/api/banners/reorder')).send({ ids: ['nope'] })).status).toBe(400)
  expect((await as(api().put('/api/banners/reorder')).send({ ids: 'x' })).status).toBe(400)
})
