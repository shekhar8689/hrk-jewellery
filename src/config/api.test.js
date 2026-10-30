import { test, expect } from 'vitest'
import { API, PUBLIC_API } from './api'

test('outside Vercel (local, tests) shop data comes straight from the server', () => {
  expect(API).toMatch(/\/api$/)
  expect(PUBLIC_API).toBe(API)
})
