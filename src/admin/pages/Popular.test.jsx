import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi, test, expect, beforeEach } from 'vitest'

vi.mock('../components/AdminLayout', () => ({ default: ({ children }) => <div>{children}</div> }))
const popular = vi.fn()
vi.mock('../api', () => ({ api: { popular: (...a) => popular(...a) } }))
import Popular from './Popular'

const data = {
  days: 30, totals: { views: 60, carts: 9, sold: 4, revenue: 5996 },
  products: [
    { _id: 'a', name: 'Gold Halo Ring', views: 40, carts: 2, sold: 0, revenue: 0, stock: 3, isVisible: true },
    { _id: 'b', name: 'Rose Earrings', views: 15, carts: 6, sold: 4, revenue: 5996, stock: 0, isVisible: true },
    { _id: 'c', name: 'Old Anklet', views: 5, carts: 1, sold: 0, revenue: 0, stock: 2, isVisible: false },
  ],
}
beforeEach(() => { popular.mockReset(); popular.mockResolvedValue(data) })
const names = () => within(screen.getByRole('list', { name: 'Products ranked' })).getAllByRole('link').map(a => a.textContent)
const view = () => render(<MemoryRouter><Popular /></MemoryRouter>)

test('shows the most viewed product first, with totals', async () => {
  view()
  expect(await screen.findByText('Gold Halo Ring')).toBeTruthy()
  expect(names()).toEqual(['Gold Halo Ring', 'Rose Earrings', 'Old Anklet'])
  expect(screen.getByText('₹5,996', { selector: 'p' })).toBeTruthy()
  expect(popular).toHaveBeenCalledWith(30)
})

test('"Best selling" puts the product that sold most on top', async () => {
  view(); await screen.findByText('Gold Halo Ring')
  fireEvent.click(screen.getByRole('tab', { name: 'Best selling' }))
  expect(names()[0]).toBe('Rose Earrings')
})

test('points out products people look at but nobody buys, and marks hidden / sold out', async () => {
  view(); await screen.findByText('Gold Halo Ring')
  expect(screen.getByText(/nobody bought yet/i)).toBeTruthy()
  expect(screen.getByText(/Gold Halo Ring: 40 views/)).toBeTruthy()
  expect(screen.getByText('Hidden')).toBeTruthy()
  expect(screen.getByText('Sold out')).toBeTruthy()
})

test('changing the period loads that period', async () => {
  view(); await screen.findByText('Gold Halo Ring')
  fireEvent.click(screen.getByRole('button', { name: 'Last 7 days' }))
  expect(popular).toHaveBeenLastCalledWith(7)
})
