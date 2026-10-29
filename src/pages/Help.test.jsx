import { test, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Help from './Help'
import { SHOP, whatsappLink } from '../config/shop'

const show = () => render(<MemoryRouter><Help /></MemoryRouter>)

test('chat opens WhatsApp with the shop number, call opens the phone dialer', () => {
  show()
  const chat = screen.getByRole('link', { name: /Chat on WhatsApp/i })
  expect(chat.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/91\d{10}/)
  expect(chat).toHaveAttribute('target', '_blank')
  expect(screen.getByRole('link', { name: /Call us/i })).toHaveAttribute('href', `tel:${SHOP.phone.replace(/\s/g, '')}`)
  expect(screen.getByRole('link', { name: /Email us/i })).toHaveAttribute('href', `mailto:${SHOP.email}`)
})

test('support hours come from the shop settings', () => {
  show()
  const box = screen.getByRole('region', { name: /Support hours/i })
  expect(within(box).getByText(SHOP.supportDays)).toBeInTheDocument()
  expect(within(box).getByText(SHOP.supportTime)).toBeInTheDocument()
})

test('questions open to show the answer; only things this shop really offers', async () => {
  show()
  const q = screen.getByRole('button', { name: /What payment methods are available/i })
  expect(q).toHaveAttribute('aria-expanded', 'false')
  await userEvent.click(q)
  expect(q).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByText(/UPI/, { selector: 'p' })).toBeInTheDocument()
  expect(screen.queryByText(/reward points|gift card|warranty/i)).not.toBeInTheDocument()
})

test('every policy has a short summary and a link to the full page', async () => {
  show()
  for (const name of ['Return & Refund Policy', 'Shipping Policy', 'Privacy Policy', 'Terms & Conditions', 'Cancellation Policy']) {
    expect(screen.getByRole('button', { name })).toBeInTheDocument()
  }
  await userEvent.click(screen.getByRole('button', { name: 'Return & Refund Policy' }))
  expect(screen.getByRole('link', { name: /Read the full Return & Refund Policy/i })).toHaveAttribute('href', '/return-policy')
})

test('whatsappLink adds a ready-made message', () => {
  expect(whatsappLink('Hi, about order 94E7178C')).toMatch(/\?text=Hi%2C%20about%20order%2094E7178C$/)
})

test('shows the common questions and links to the full FAQ page', () => {
  show()
  expect(screen.getByRole('button', { name: /How do I place an order/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /See all questions/i })).toHaveAttribute('href', '/faq')
})
