import { test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Contact from './Contact'

function setup(response = { ok: true, json: async () => ({ message: 'Message received.' }) }) {
  global.fetch = vi.fn(async () => response)
  render(<MemoryRouter><Contact /></MemoryRouter>)
}

test('the message is really sent to the shop', async () => {
  setup()
  await userEvent.type(screen.getByLabelText(/Name/), 'Riya Shah')
  await userEvent.type(screen.getByLabelText(/Mobile/), '9876543210')
  await userEvent.type(screen.getByLabelText(/Message/), 'Where is my order 94E7178C?')
  await userEvent.click(screen.getByRole('button', { name: /Send Message/ }))
  expect(await screen.findByText(/Message Sent/)).toBeInTheDocument()
  const [url, opts] = fetch.mock.calls[0]
  expect(url).toMatch(/\/contact$/)
  expect(JSON.parse(opts.body)).toEqual(expect.objectContaining({ name: 'Riya Shah', phone: '9876543210', message: 'Where is my order 94E7178C?' }))
})

test('if sending fails, the customer is told and the text is kept', async () => {
  setup({ ok: false, json: async () => ({ message: 'You have sent several messages already.' }) })
  await userEvent.type(screen.getByLabelText(/Name/), 'Riya Shah')
  await userEvent.type(screen.getByLabelText(/Email/), 'riya@test.com')
  await userEvent.type(screen.getByLabelText(/Message/), 'Where is my order 94E7178C?')
  await userEvent.click(screen.getByRole('button', { name: /Send Message/ }))
  expect(await screen.findByText(/several messages already/)).toBeInTheDocument()
  expect(screen.queryByText(/Message Sent/)).not.toBeInTheDocument()
  expect(screen.getByLabelText(/Message/)).toHaveValue('Where is my order 94E7178C?')
})

test('needs an email or a mobile number to reply to', async () => {
  setup()
  await userEvent.type(screen.getByLabelText(/Name/), 'Riya Shah')
  await userEvent.type(screen.getByLabelText(/Message/), 'Where is my order 94E7178C?')
  await userEvent.click(screen.getByRole('button', { name: /Send Message/ }))
  expect(screen.getByText(/email or mobile number/i)).toBeInTheDocument()
  expect(fetch).not.toHaveBeenCalled()
})

test('phone and email are tappable links', () => {
  setup()
  expect(screen.getAllByRole('link').some(a => a.getAttribute('href')?.startsWith('tel:'))).toBe(true)
  expect(screen.getAllByRole('link').some(a => a.getAttribute('href')?.startsWith('mailto:'))).toBe(true)
})
