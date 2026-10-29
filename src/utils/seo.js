/*
 * Page details for Google: description, canonical address, and structured
 * data (schema.org) so search results can show a product's price and stock.
 */
const absolute = (src, site) => {
  if (!src) return undefined
  if (/^https?:\/\//.test(src)) return src
  const api = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')
  return `${api}/${String(src).replace(/^\/+/, '')}`
}

export function productJsonLd(p, site) {
  const url = `${site}/product/${p._id}`
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: String(p.description || '').slice(0, 500),
    image: (p.images || []).slice(0, 6).map(i => absolute(i, site)).filter(Boolean),
    sku: String(p._id),
    category: p.category,
    brand: { '@type': 'Brand', name: 'HRK Jewellery' },
    offers: {
      '@type': 'Offer', url, priceCurrency: 'INR', price: String(p.price),
      availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
    ...(p.reviews > 0 && p.rating > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.reviews } } : {}),
  }
}

// Sets the tags; returns a function that puts the page back as it was
export function applySeo({ description, canonical, jsonLd } = {}) {
  const added = [], restore = []
  if (description) {
    let m = document.querySelector('meta[name="description"]')
    if (!m) { m = document.createElement('meta'); m.name = 'description'; m.setAttribute('data-seo', ''); document.head.appendChild(m); added.push(m) }
    const before = m.content
    m.content = String(description).replace(/\s+/g, ' ').trim().slice(0, 157) + (String(description).length > 157 ? '…' : '')
    restore.push(() => { m.content = before })
  }
  if (canonical) {
    const l = document.createElement('link'); l.rel = 'canonical'; l.href = canonical; l.setAttribute('data-seo', '')
    document.querySelectorAll('link[rel="canonical"]:not([data-seo])').forEach(x => { x.remove(); restore.push(() => document.head.appendChild(x)) })
    document.head.appendChild(l); added.push(l)
  }
  if (jsonLd) {
    const s = document.createElement('script'); s.type = 'application/ld+json'; s.setAttribute('data-seo', '')
    s.textContent = JSON.stringify(jsonLd).replace(/</g, '\\u003c')
    document.head.appendChild(s); added.push(s)
  }
  return () => { added.forEach(n => n.remove()); restore.forEach(f => f()) }
}
