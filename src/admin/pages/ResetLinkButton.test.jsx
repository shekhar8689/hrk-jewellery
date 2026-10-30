import { test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
const resetLink = vi.fn()
vi.mock('../api', () => ({ api: { userResetLink: id => resetLink(id) } }))
import ResetLinkButton from './ResetLinkButton'

test('makes a reset link the admin can copy or send on WhatsApp to the customer', async () => {
  resetLink.mockResolvedValue({ link: 'https://www.hrk.in/reset-password/abc', expiresInMinutes: 60, phone: '9876543210' })
  render(<ResetLinkButton user={{ _id: 'u1', name: 'Riya' }} />)
  await userEvent.click(screen.getByRole('button', { name: /Reset link/i }))
  expect(resetLink).toHaveBeenCalledWith('u1')
  expect(await screen.findByDisplayValue('https://www.hrk.in/reset-password/abc')).toBeInTheDocument()
  const wa = screen.getByRole('link', { name: /Send on WhatsApp/i }).getAttribute('href')
  expect(wa).toMatch(/^https:\/\/wa\.me\/919876543210\?text=/)
  expect(decodeURIComponent(wa)).toContain('https://www.hrk.in/reset-password/abc')
  expect(screen.getByText(/1 hour/)).toBeInTheDocument()
})

test('without a saved phone, WhatsApp lets the admin pick the chat', async () => {
  resetLink.mockResolvedValue({ link: 'https://x.in/reset-password/abc', expiresInMinutes: 60, phone: '' })
  render(<ResetLinkButton user={{ _id: 'u2', name: 'Ana' }} />)
  await userEvent.click(screen.getByRole('button', { name: /Reset link/i }))
  expect((await screen.findByRole('link', { name: /Send on WhatsApp/i })).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/\?text=/)
})
