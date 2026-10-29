import { test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Footer from './Footer'
import { SHOP } from '../config/shop'

test('social icons only appear for accounts that are filled in, and link to them', () => {
  render(<MemoryRouter><Footer /></MemoryRouter>)
  const links = screen.queryAllByRole('link', { name: /Instagram|Facebook|YouTube|WhatsApp/ })
  expect(links.every(a => a.getAttribute('href') && a.getAttribute('href') !== '#')).toBe(true)
  const filled = Object.values(SHOP.social).filter(Boolean).length
  expect(links).toHaveLength(filled)
  expect(document.querySelectorAll('footer a[href="#"]')).toHaveLength(0)
})

test('newsletter sign-up is really saved (as a message for the shop)', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({}) }))
  render(<MemoryRouter><Footer /></MemoryRouter>)
  await userEvent.type(screen.getByPlaceholderText(/email address/i), 'riya@test.com')
  await userEvent.click(screen.getByRole('button', { name: /Subscribe/i }))
  expect(await screen.findByText(/on the list/i)).toBeInTheDocument()
  const [url, opts] = fetch.mock.calls[0]
  expect(url).toMatch(/\/contact$/)
  expect(JSON.parse(opts.body)).toEqual(expect.objectContaining({ email: 'riya@test.com', subject: 'Newsletter sign-up' }))
})
