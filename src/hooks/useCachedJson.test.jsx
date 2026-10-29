import { test, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import useCachedJson from './useCachedJson'

let resolve
beforeEach(() => {
  localStorage.clear()
  global.fetch = vi.fn(() => new Promise(r => { resolve = (data, ok = true) => r({ ok, json: async () => data }) }))
})

test('returns the copy from the last visit at once, then the fresh one', async () => {
  localStorage.setItem('hrk_cache:/categories', JSON.stringify(['old']))
  const { result } = renderHook(() => useCachedJson('/categories'))
  expect(result.current).toEqual(['old'])
  resolve(['new'])
  await waitFor(() => expect(result.current).toEqual(['new']))
  expect(JSON.parse(localStorage.getItem('hrk_cache:/categories'))).toEqual(['new'])
})

test('undefined while loading the very first time', () => {
  const { result } = renderHook(() => useCachedJson('/x'))
  expect(result.current).toBeUndefined()
})

test('a server error keeps the last good copy', async () => {
  localStorage.setItem('hrk_cache:/x', JSON.stringify({ a: 1 }))
  const { result } = renderHook(() => useCachedJson('/x'))
  resolve({ message: 'Server error' }, false)
  await new Promise(r => setTimeout(r, 20))
  expect(result.current).toEqual({ a: 1 })
})

test('a server error with nothing cached gives the fallback', async () => {
  const { result } = renderHook(() => useCachedJson('/x', []))
  resolve({ message: 'Server error' }, false)
  await waitFor(() => expect(result.current).toEqual([]))
})
