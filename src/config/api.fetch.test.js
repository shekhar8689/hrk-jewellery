import { test, expect, vi, beforeEach } from 'vitest'

beforeEach(() => { vi.resetModules(); vi.unstubAllEnvs() })
const load = async () => { vi.stubEnv('VITE_PUBLIC_API_URL', '/api'); vi.stubEnv('VITE_API_URL', 'https://srv.example.com/api'); return import('./api') }

test('reads shop data through the website copy first', async () => {
  const { publicFetch } = await load()
  global.fetch = vi.fn(async () => ({ ok: true, status: 200 }))
  const r = await publicFetch('/products?x=1')
  expect(r.ok).toBe(true)
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(fetch.mock.calls[0][0]).toBe('/api/products?x=1')
})

test('if the copy fails (server waking, proxy timeout), asks the server directly', async () => {
  const { publicFetch } = await load()
  global.fetch = vi.fn()
    .mockResolvedValueOnce({ ok: false, status: 504 })
    .mockResolvedValueOnce({ ok: true, status: 200 })
  const r = await publicFetch('/shop')
  expect(r.ok).toBe(true)
  expect(fetch.mock.calls[1][0]).toBe('https://srv.example.com/api/shop')
})

test('a real "not found" is not retried', async () => {
  const { publicFetch } = await load()
  global.fetch = vi.fn(async () => ({ ok: false, status: 404 }))
  const r = await publicFetch('/products/123')
  expect(r.status).toBe(404)
  expect(fetch).toHaveBeenCalledTimes(1)
})

test('network error on the copy → server directly', async () => {
  const { publicFetch } = await load()
  global.fetch = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ok: true, status: 200 })
  expect((await publicFetch('/offer')).ok).toBe(true)
})
