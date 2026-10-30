import { render, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { vi, test, expect, beforeEach } from 'vitest'
import ScrollToTop from './ScrollToTop'

let nav
const Grab = () => { nav = useNavigate(); return null }
const setup = () => render(
  <MemoryRouter initialEntries={['/']}>
    <ScrollToTop /><Grab />
    <Routes><Route path="*" element={<div />} /></Routes>
  </MemoryRouter>)

beforeEach(() => { window.scrollTo = vi.fn() })

test('opening a new page starts at the top', () => {
  setup(); window.scrollTo.mockClear()
  act(() => nav('/shipping-policy'))
  expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
})

test('placing an order (replace navigation to /pay) starts at the top', () => {
  setup(); window.scrollTo.mockClear()
  act(() => nav('/pay?id=AB12CD34', { replace: true }))
  expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
})

test('Back keeps the old scroll position, and filters on the same page do not jump', () => {
  setup(); act(() => nav('/faq')); window.scrollTo.mockClear()
  act(() => nav(-1))
  act(() => nav('/?search=ring'))
  expect(window.scrollTo).not.toHaveBeenCalled()
})
