const { api, makeAdmin } = require('../helpers')

// 1×1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')
let admin
beforeAll(async () => { admin = (await makeAdmin()).token })
const auth = r => r.set('Authorization', `Bearer ${admin}`)

test('a banner can have a separate photo for phones and a crop position', async () => {
  const r = await auth(api().post('/api/banners'))
    .field('title', 'Diwali Sale').field('focus', 'right')
    .attach('image', PNG, 'wide.png').attach('mobileImage', PNG, 'tall.png')
  expect(r.status).toBe(201)
  expect(r.body.image).toMatch(/^uploads\//)
  expect(r.body.mobileImage).toMatch(/^uploads\//)
  expect(r.body.mobileImage).not.toBe(r.body.image)
  expect(r.body.focus).toBe('right')

  const active = await api().get('/api/banners/active')
  expect(active.body[0]).toEqual(expect.objectContaining({ mobileImage: r.body.mobileImage, focus: 'right' }))
})

test('the phone photo is optional and can be removed again', async () => {
  const r = await auth(api().post('/api/banners')).field('title', 'No phone photo').attach('image', PNG, 'wide.png')
  expect(r.body.mobileImage).toBe('')
  expect(r.body.focus).toBe('center')

  const withPhone = await auth(api().put(`/api/banners/${r.body._id}`)).attach('mobileImage', PNG, 'tall.png')
  expect(withPhone.body.mobileImage).toMatch(/^uploads\//)
  const removed = await auth(api().put(`/api/banners/${r.body._id}`)).field('removeMobileImage', 'true')
  expect(removed.body.mobileImage).toBe('')
  expect(removed.body.image).toBe(r.body.image)
})

test('an unknown crop position is refused', async () => {
  const r = await auth(api().post('/api/banners')).field('title', 'Odd').field('focus', 'upside-down').attach('image', PNG, 'wide.png')
  expect(r.status).toBe(400)
})

test('the phone photo must be an image', async () => {
  const r = await auth(api().post('/api/banners')).field('title', 'Bad').attach('image', PNG, 'wide.png')
    .attach('mobileImage', Buffer.from('not an image'), { filename: 'x.mp4', contentType: 'video/mp4' })
  expect(r.status).toBe(400)
})
