import { test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { CartProvider } from '../context/CartContext'
import { WishlistProvider } from '../context/WishlistContext'
import { UserAuthProvider } from '../context/UserAuthContext'
import Collections from './Collections'

const show = path => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ products: [], total: 0, pages: 1 }) }))
  return render(<MemoryRouter initialEntries={[path]}><UserAuthProvider><WishlistProvider><CartProvider>
    <Routes><Route path="/collections/:category" element={<Collections />} /><Route path="/collections" element={<Collections />} /></Routes>
  </CartProvider></WishlistProvider></UserAuthProvider></MemoryRouter>)
}

test('an unknown category says it does not exist', async () => {
  show('/collections/xyz')
  expect(await screen.findByText(/category not found/i)).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'xyz' })).not.toBeInTheDocument()
})

test('category pages have their own browser title', async () => {
  show('/collections/rings')
  await screen.findByRole('heading', { name: /Rings/i })
  expect(document.title).toMatch(/^Rings — HRK Jewellery/)
})
