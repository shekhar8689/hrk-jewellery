import { test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'

function Broken() { throw new Error('boom') }

test('if a page crashes, customers see a friendly message with a way back instead of a blank screen', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  render(<ErrorBoundary><Broken /></ErrorBoundary>)
  expect(screen.getByRole('heading', { name: /Something went wrong/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Reload/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/')
})

test('normal pages are shown as usual', () => {
  render(<ErrorBoundary><p>Shop</p></ErrorBoundary>)
  expect(screen.getByText('Shop')).toBeInTheDocument()
})
