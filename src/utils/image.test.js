import { test, expect } from 'vitest'
import { getImageUrl, getVideoUrl, getVideoPoster } from './image'

const CL = 'https://res.cloudinary.com/demo/image/upload/v1/hrk/ring.jpg'

test('empty paths give an empty string', () => {
  expect(getImageUrl('')).toBe('')
  expect(getImageUrl(null)).toBe('')
})
test('local uploads point at the API server (Windows slashes fixed)', () => {
  expect(getImageUrl('uploads\\a.png')).toBe('http://localhost:5000/uploads/a.png')
  expect(getImageUrl('/uploads/a.png')).toBe('http://localhost:5000/uploads/a.png')
})
test('Cloudinary images get automatic format, quality and size', () => {
  expect(getImageUrl(CL, 600)).toBe('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_600/v1/hrk/ring.jpg')
  expect(getImageUrl(CL)).toBe('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/hrk/ring.jpg')
})
test('Cloudinary images that already have settings are left alone', () => {
  const t = 'https://res.cloudinary.com/demo/image/upload/w_100/v1/a.jpg'
  expect(getImageUrl(t, 600)).toBe(t)
})
test('other websites are unchanged', () => {
  expect(getImageUrl('https://images.unsplash.com/photo-1')).toBe('https://images.unsplash.com/photo-1')
})
test('videos: Cloudinary gets f_auto,q_auto and a poster frame', () => {
  const v = 'https://res.cloudinary.com/demo/video/upload/v1/hrk/clip.mp4'
  expect(getVideoUrl(v)).toBe('https://res.cloudinary.com/demo/video/upload/f_auto,q_auto/v1/hrk/clip.mp4')
  expect(getVideoPoster(v, 800)).toBe('https://res.cloudinary.com/demo/video/upload/so_0,f_auto,q_auto,c_limit,w_800/v1/hrk/clip.jpg')
  expect(getVideoPoster('uploads/clip.mp4')).toBe('')
})
