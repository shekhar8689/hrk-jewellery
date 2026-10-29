import { test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Hero from './Hero'

const banner = (over = {}) => ({ _id: 'b1', title: 'Diwali Sale', image: 'https://res.cloudinary.com/demo/image/upload/v1/wide.jpg', mediaType: 'image', focus: 'center', mobileImage: '', ...over })
let resolveFetch
beforeEach(() => {
  localStorage.clear()
  global.fetch = vi.fn(() => new Promise(r => { resolveFetch = data => r({ ok: true, json: async () => data }) }))
})
const show = () => render(<MemoryRouter><Hero /></MemoryRouter>)

test('while the server is waking up, the shop name shows straight away (no spinner)', () => {
  show()
  expect(screen.getByRole('heading', { name: /Crafted for/ })).toBeInTheDocument()
})

test('banners seen on the last visit show immediately, then update', async () => {
  localStorage.setItem('hrk_banners', JSON.stringify([banner({ title: 'Old Banner' })]))
  show()
  expect(screen.getByRole('heading', { name: 'Old Banner' })).toBeInTheDocument()
  resolveFetch([banner({ title: 'New Banner' })])
  expect(await screen.findByRole('heading', { name: 'New Banner' })).toBeInTheDocument()
  expect(JSON.parse(localStorage.getItem('hrk_banners'))[0].title).toBe('New Banner')
})

test('phones get the phone photo when the admin added one', async () => {
  show()
  resolveFetch([banner({ mobileImage: 'https://res.cloudinary.com/demo/image/upload/v1/tall.jpg' })])
  await screen.findByRole('heading', { name: 'Diwali Sale' })
  const source = document.querySelector('picture source')
  expect(source.getAttribute('media')).toBe('(max-width: 767px)')
  expect(source.getAttribute('srcset')).toContain('tall.jpg')
  expect(document.querySelector('picture img').getAttribute('src')).toContain('wide.jpg')
})

test('without a phone photo, the chosen crop position is used', async () => {
  show()
  resolveFetch([banner({ focus: 'right' })])
  await screen.findByRole('heading', { name: 'Diwali Sale' })
  expect(document.querySelector('picture source')).toBeNull()
  expect(document.querySelector('img').style.objectPosition).toBe('right center')
})

test('if the server answers with an error, the shop name stays', async () => {
  show()
  resolveFetch({ message: 'Server error' })
  await waitFor(() => expect(fetch).toHaveBeenCalled())
  expect(screen.getByRole('heading', { name: /Crafted for/ })).toBeInTheDocument()
})
