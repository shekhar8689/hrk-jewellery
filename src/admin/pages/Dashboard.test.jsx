import { test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../components/AdminLayout', () => ({ default: ({ children }) => <div>{children}</div> }))
const stats = vi.fn()
vi.mock('../api', () => ({ api: { stats: () => stats() } }))
import Dashboard from './Dashboard'

const base = { totalOrders: 3, totalProducts: 5, totalUsers: 1, totalRevenue: 1899, recentOrders: [], ordersByStatus: [] }

test('shows what needs doing today, each linking to the right place', async () => {
  stats.mockResolvedValue({ ...base, todo: { paymentsToCheck: 2, paidToConfirm: 1, unpaid: 4, messages: 3, lowStock: [{ _id: 'p1', name: 'Kundan Ring', stock: 1 }, { _id: 'p2', name: 'Pearl Set', stock: 0 }] } })
  render(<MemoryRouter><Dashboard /></MemoryRouter>)
  expect(await screen.findByRole('link', { name: /2.*payments? to check/i })).toHaveAttribute('href', '/admin/orders?payment=submitted')
  expect(screen.getByRole('link', { name: /1.*paid.*to confirm/i })).toHaveAttribute('href', '/admin/orders?payment=paid&status=pending')
  expect(screen.getByRole('link', { name: /3.*messages?/i })).toHaveAttribute('href', '/admin/messages')
  expect(screen.getByText('Kundan Ring')).toBeInTheDocument()
  expect(screen.getByText(/Sold out/i)).toBeInTheDocument()
})

test('says all caught up when there is nothing to do', async () => {
  stats.mockResolvedValue({ ...base, todo: { paymentsToCheck: 0, paidToConfirm: 0, unpaid: 0, messages: 0, lowStock: [] } })
  render(<MemoryRouter><Dashboard /></MemoryRouter>)
  expect(await screen.findByText(/All caught up/i)).toBeInTheDocument()
})
