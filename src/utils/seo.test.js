import { test, expect, afterEach } from 'vitest'
import { productJsonLd, applySeo } from './seo'

const p = { _id: 'p1', name: 'Kundan Ring', description: 'Hand-set kundan stones on an adjustable band. '.repeat(6), price: 2499, stock: 4,
  category: 'rings', images: ['https://res.cloudinary.com/demo/image/upload/v1/ring.jpg'], rating: 4.5, reviews: 12 }

afterEach(() => { document.head.querySelectorAll('[data-seo]').forEach(n => n.remove()) })

test('product details Google can show: name, price in INR, in stock, photo, rating', () => {
  const j = productJsonLd(p, 'https://www.hrk.in')
  expect(j).toEqual(expect.objectContaining({ '@context': 'https://schema.org', '@type': 'Product', name: 'Kundan Ring', brand: { '@type': 'Brand', name: 'HRK Jewellery' } }))
  expect(j.offers).toEqual(expect.objectContaining({ price: '2499', priceCurrency: 'INR', availability: 'https://schema.org/InStock', url: 'https://www.hrk.in/product/p1' }))
  expect(j.image[0]).toMatch(/^https:\/\//)
  expect(j.aggregateRating).toEqual({ '@type': 'AggregateRating', ratingValue: 4.5, reviewCount: 12 })
})

test('sold out products say OutOfStock; no rating without reviews', () => {
  const j = productJsonLd({ ...p, stock: 0, reviews: 0 }, 'https://www.hrk.in')
  expect(j.offers.availability).toBe('https://schema.org/OutOfStock')
  expect(j.aggregateRating).toBeUndefined()
})

test('applySeo sets the description, canonical link and structured data, and removes them again', () => {
  const undo = applySeo({ description: 'x'.repeat(400), canonical: 'https://www.hrk.in/product/p1', jsonLd: productJsonLd(p, 'https://www.hrk.in') })
  expect(document.querySelector('meta[name="description"]').content.length).toBeLessThanOrEqual(160)
  expect(document.querySelector('link[rel="canonical"]').href).toBe('https://www.hrk.in/product/p1')
  expect(JSON.parse(document.querySelector('script[type="application/ld+json"][data-seo]').textContent).name).toBe('Kundan Ring')
  undo()
  expect(document.querySelector('script[type="application/ld+json"][data-seo]')).toBeNull()
})

test('text in structured data cannot break out of the script tag', () => {
  const undo = applySeo({ jsonLd: productJsonLd({ ...p, name: '</script><script>alert(1)</script>' }, 'https://x.in') })
  expect(document.querySelector('script[type="application/ld+json"][data-seo]').textContent).not.toContain('</script>')
  undo()
})
