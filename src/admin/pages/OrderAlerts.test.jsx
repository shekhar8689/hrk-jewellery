import { test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const getAlerts = vi.fn(), updateAlerts = vi.fn(), testAlert = vi.fn()
vi.mock('../api', () => ({ api: { getAlerts: () => getAlerts(), updateAlerts: d => updateAlerts(d), testAlert: () => testAlert() } }))
import OrderAlerts from './OrderAlerts'

beforeEach(() => { getAlerts.mockReset(); updateAlerts.mockReset(); testAlert.mockReset() })

test('shows that alerts are off, then saves an email', async () => {
  getAlerts.mockResolvedValue({ alertEmail: '' })
  updateAlerts.mockImplementation(async d => ({ alertEmail: d.alertEmail.toLowerCase() }))
  render(<OrderAlerts />)
  expect(await screen.findByText(/alerts are off/i)).toBeInTheDocument()
  await userEvent.type(screen.getByLabelText(/Email for order alerts/i), 'Owner@Example.com')
  await userEvent.click(screen.getByRole('button', { name: /Save alert email/i }))
  expect(updateAlerts).toHaveBeenCalledWith({ alertEmail: 'Owner@Example.com' })
  expect(await screen.findByText(/Saved\. Order alerts go to owner@example\.com/)).toBeInTheDocument()
})

test('a test alert shows where it went, or the problem in plain words', async () => {
  getAlerts.mockResolvedValue({ alertEmail: 'owner@example.com' })
  testAlert.mockResolvedValueOnce({ sent: true, to: 'owner@example.com' }).mockResolvedValueOnce({ sent: false, problem: 'Resend: verify your domain first' })
  render(<OrderAlerts />)
  const btn = await screen.findByRole('button', { name: /Send test alert/i })
  await userEvent.click(btn)
  expect(await screen.findByText(/Test alert sent to owner@example\.com/)).toBeInTheDocument()
  await userEvent.click(btn)
  expect(await screen.findByRole('alert')).toHaveTextContent(/verify your domain/)
})
