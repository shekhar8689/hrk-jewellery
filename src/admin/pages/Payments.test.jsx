import { test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../components/AdminLayout', () => ({ default: ({ children }) => <div>{children}</div> }))
const updatePaymentSettings = vi.fn(async d => ({ ...d, ready: true }))
vi.mock('../api', () => ({ api: {
  getPaymentSettings: async () => ({ upiId: 'kambleh240@okaxis', payeeName: 'HRK Jewellery', business: false, ready: true }),
  updatePaymentSettings: d => updatePaymentSettings(d),
} }))
import Payments from './Payments'

test('the business UPI switch is saved with the UPI ID', async () => {
  render(<MemoryRouter><Payments /></MemoryRouter>)
  const box = await screen.findByRole('checkbox', { name: /business UPI ID/i })
  expect(box).not.toBeChecked()
  const id = screen.getByPlaceholderText(/hrkjewellery@okaxis/)
  await userEvent.clear(id); await userEvent.type(id, 'q123456@ybl')
  await userEvent.click(box)
  await userEvent.click(screen.getByRole('button', { name: /Save UPI ID/i }))
  expect(updatePaymentSettings).toHaveBeenCalledWith({ upiId: 'q123456@ybl', payeeName: 'HRK Jewellery', business: true })
  expect(await screen.findByText(/one tap/i)).toBeInTheDocument()
})
