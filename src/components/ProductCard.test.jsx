import { test, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { CartProvider } from '../context/CartContext'
import { WishlistProvider } from '../context/WishlistContext'
import { UserAuthProvider } from '../context/UserAuthContext'
import ProductCard from './ProductCard'

const ring = { _id: 'r1', name: 'Solitaire Ring', price: 2499, stock: 5, images: [], sizes: ['6', '7', '8'], colors: ['Gold'] }
const studs = { _id: 's1', name: 'Pearl Studs', price: 599, stock: 5, images: [], sizes: [], colors: [] }

function renderCard(product) {
  localStorage.clear()
  render(
    <MemoryRouter initialEntries={['/']}>
      <UserAuthProvider><WishlistProvider><CartProvider>
        <Routes>
          <Route path="/" element={<ProductCard product={product} />} />
          <Route path="/product/:id" element={<p>PRODUCT PAGE</p>} />
        </Routes>
      </CartProvider></WishlistProvider></UserAuthProvider>
    </MemoryRouter>
  )
}
const bag = () => JSON.parse(localStorage.getItem('hrk_cart') || '{"items":[]}').items

test('a ring with several sizes is not added with a guessed size: it opens the product page', () => {
  renderCard(ring)
  fireEvent.click(screen.getByText(/Quick Add|Choose Size/i))
  expect(screen.getByText('PRODUCT PAGE')).toBeInTheDocument()
  expect(bag()).toHaveLength(0)
})

test('a product without options is added straight to the bag', () => {
  renderCard(studs)
  fireEvent.click(screen.getByText(/Quick Add/i))
  expect(bag()).toEqual([expect.objectContaining({ id: 's1', qty: 1, selectedSize: '', selectedColor: '' })])
})
