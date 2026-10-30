import { test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../components/AdminLayout', () => ({ default: ({ children }) => <div>{children}</div> }))
const getShop = vi.fn(), updateShop = vi.fn(), testEmail = vi.fn()
vi.mock('../api', () => ({ api: { getShop: () => getShop(), updateShop: d => updateShop(d), testEmail: () => testEmail() } }))
import ShopSettings from './ShopSettings'

const saved = { name: 'HRK Jewellery', phone: '+91 86898 14335', whatsapp: '918689814335', email: 'hello@hrkjewellery.com', address: 'Mumbai',
  supportDays: 'Monday – Saturday', supportTime: '10:00 AM – 6:00 PM', instagram: '', facebook: '', youtube: '' }

test('loads the saved details and saves a new phone number', async () => {
  getShop.mockResolvedValue(saved)
  updateShop.mockImplementation(async d => ({ ...saved, ...d, phone: '+91 91234 56780' }))
  render(<MemoryRouter><ShopSettings /></MemoryRouter>)
  const phone = await screen.findByLabelText(/Phone number/i)
  expect(phone).toHaveValue('+91 86898 14335')
  await userEvent.clear(phone); await userEvent.type(phone, '9123456780')
  await userEvent.click(screen.getByRole('button', { name: /Save/i }))
  expect(updateShop).toHaveBeenCalledWith(expect.objectContaining({ phone: '9123456780', email: 'hello@hrkjewellery.com' }))
  expect(await screen.findByText(/Saved\. The website/)).toBeInTheDocument()
  expect(screen.getByLabelText(/Phone number/i)).toHaveValue('+91 91234 56780')
})

test('shows the server message when something is wrong', async () => {
  getShop.mockResolvedValue(saved)
  updateShop.mockRejectedValue(new Error('Enter a valid email address'))
  render(<MemoryRouter><ShopSettings /></MemoryRouter>)
  await userEvent.click(await screen.findByRole('button', { name: /Save/i }))
  expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
})

test('previews the WhatsApp and call links so the admin can test them', async () => {
  getShop.mockResolvedValue(saved)
  render(<MemoryRouter><ShopSettings /></MemoryRouter>)
  expect((await screen.findByRole('link', { name: /Test WhatsApp/i })).getAttribute('href')).toBe('https://wa.me/918689814335')
  expect(screen.getByRole('link', { name: /Test call/i })).toHaveAttribute('href', 'tel:+918689814335')
})

test('test email shows the problem in plain words', async () => {
  getShop.mockResolvedValue(saved)
  testEmail.mockResolvedValue({ sent: false, to: 'admin@hrk.com', problem: "BREVO_API_KEY is Brevo's SMTP key" })
  render(<MemoryRouter><ShopSettings /></MemoryRouter>)
  await userEvent.click(await screen.findByRole('button', { name: /Send test email/i }))
  expect(await screen.findByRole('alert')).toHaveTextContent(/Not sent.*SMTP key/)
})
