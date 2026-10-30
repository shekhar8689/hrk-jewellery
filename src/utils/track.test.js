import { describe, test, expect, vi, beforeEach } from 'vitest'
import { trackProduct } from './track'

beforeEach(() => { sessionStorage.clear(); localStorage.clear(); global.fetch = vi.fn(() => Promise.resolve({ ok: true })) })

describe('trackProduct', () => {
  test('sends a view once per product per visit', () => {
    trackProduct('p1', 'view'); trackProduct('p1', 'view'); trackProduct('p2', 'view')
    expect(fetch).toHaveBeenCalledTimes(2)
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toMatch(/\/products\/p1\/seen$/)
    expect(JSON.parse(opts.body)).toEqual({ event: 'view' })
    expect(opts.keepalive).toBe(true)
  })
  test('add to bag is sent each time (the server counts one per visitor)', () => {
    trackProduct('p1', 'cart'); trackProduct('p1', 'cart')
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  test("the shop owner's own browsing carries the admin login so it isn't counted", () => {
    localStorage.setItem('admin_token', 'abc')
    trackProduct('p1', 'view')
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer abc')
  })
  test('never breaks the page when offline', () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('offline')))
    expect(() => trackProduct('p1', 'view')).not.toThrow()
    expect(() => trackProduct(undefined, 'view')).not.toThrow()
  })
})
