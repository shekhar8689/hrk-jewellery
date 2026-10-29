import { test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Help from '../pages/Help'
import Footer from '../components/Footer'
import ChatButton from '../components/ChatButton'

const fromAdmin = { name: 'HRK Jewellery', phone: '+91 91234 56780', whatsapp: '919234567890', email: 'orders@hrk.in', address: 'Pune',
  supportDays: 'Monday – Sunday', supportTime: '9:00 AM – 9:00 PM', instagram: 'https://www.instagram.com/hrk', facebook: '', youtube: '' }

beforeEach(() => {
  localStorage.clear()
  global.fetch = vi.fn(async url => (String(url).endsWith('/shop') ? { ok: true, json: async () => fromAdmin } : { ok: false, json: async () => ({}) }))
})

test('the Help Center shows the phone, WhatsApp, email and hours saved in the admin panel', async () => {
  render(<MemoryRouter><Help /></MemoryRouter>)
  expect(await screen.findByText('+91 91234 56780')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Call us/i })).toHaveAttribute('href', 'tel:+919123456780')
  expect(screen.getByRole('link', { name: /Chat on WhatsApp/i }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/919234567890\?/)
  expect(screen.getByRole('link', { name: /Email us/i })).toHaveAttribute('href', 'mailto:orders@hrk.in')
  expect(screen.getByText('9:00 AM – 9:00 PM')).toBeInTheDocument()
})

test('the footer shows only the social links saved in the admin panel (plus WhatsApp)', async () => {
  render(<MemoryRouter><Footer /></MemoryRouter>)
  expect(await screen.findByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://www.instagram.com/hrk')
  expect(screen.getByRole('link', { name: 'WhatsApp' }).getAttribute('href')).toMatch(/wa\.me\/919234567890/)
  expect(screen.queryByRole('link', { name: 'Facebook' })).not.toBeInTheDocument()
})

test('the floating chat button uses the saved WhatsApp number', async () => {
  render(<MemoryRouter initialEntries={['/']}><ChatButton /></MemoryRouter>)
  await vi.waitFor(() => expect(screen.getByRole('link', { name: /WhatsApp/i }).getAttribute('href')).toMatch(/wa\.me\/919234567890/))
})
