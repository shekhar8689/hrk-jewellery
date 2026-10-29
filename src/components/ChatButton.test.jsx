import { test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ChatButton from './ChatButton'

const at = path => render(<MemoryRouter initialEntries={[path]}><ChatButton /></MemoryRouter>)

test('a floating WhatsApp chat button is on shop pages', () => {
  at('/collections')
  expect(screen.getByRole('link', { name: /Chat with us on WhatsApp/i }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\//)
})

test('it says which product the customer is asking about', () => {
  at('/product/abc123')
  expect(decodeURIComponent(screen.getByRole('link', { name: /WhatsApp/i }).getAttribute('href'))).toMatch(/question about a product: .*\/product\/abc123/)
})

test.each(['/checkout', '/pay', '/admin/orders'])('it stays out of the way on %s', (path) => {
  at(path)
  expect(screen.queryByRole('link', { name: /WhatsApp/i })).not.toBeInTheDocument()
})
