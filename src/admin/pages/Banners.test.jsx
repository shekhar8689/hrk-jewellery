import { test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../components/AdminLayout', () => ({ default: ({ children }) => <div>{children}</div> }))
const list = [
  { _id: 'a', title: 'Festive', image: 'x.jpg', isActive: true, link: '/collections', style: 'text' },
  { _id: 'b', title: 'Diwali', image: 'y.jpg', isActive: true, link: '/product/1', style: 'poster' },
]
const reorderBanners = vi.fn(async ids => ids.map(id => list.find(b => b._id === id)))
vi.mock('../api', () => ({ api: { getBanners: async () => list, reorderBanners: ids => reorderBanners(ids) } }))
import Banners from './Banners'

test('banners are numbered 1, 2 and can be moved up so Diwali shows first', async () => {
  render(<MemoryRouter><Banners /></MemoryRouter>)
  expect(await screen.findByLabelText('Position 1')).toBeInTheDocument()
  expect(screen.getByText('Poster', { exact: false })).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Move Diwali up' }))
  expect(reorderBanners).toHaveBeenCalledWith(['b', 'a'])
  const headings = await screen.findAllByRole('heading', { level: 3 })
  expect(headings.map(h => h.textContent)).toEqual(['Diwali', 'Festive'])
  expect(screen.getByRole('button', { name: 'Move Diwali up' })).toBeDisabled()
})

test('choosing a number puts the banner at that place', async () => {
  const three = [...list, { _id: 'c', title: 'Combo', image: 'z.jpg', isActive: true, link: '/product/2', style: 'poster' }]
  list.splice(0, list.length, ...three); reorderBanners.mockClear()
  render(<MemoryRouter><Banners /></MemoryRouter>)
  const pick = await screen.findByRole('combobox', { name: 'Show Combo as number' })
  expect([...pick.options].map(o => o.textContent)).toEqual(['1', '2', '3'])
  await userEvent.selectOptions(pick, '1')
  expect(reorderBanners).toHaveBeenCalledWith(['c', 'a', 'b'])
  const headings = await screen.findAllByRole('heading', { level: 3 })
  expect(headings.map(h => h.textContent)).toEqual(['Combo', 'Festive', 'Diwali'])
})
