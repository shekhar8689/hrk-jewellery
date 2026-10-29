import { test, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
const root = path.resolve(__dirname, '../..')
const read = f => fs.readFileSync(path.join(root, f), 'utf8')

test('robots.txt keeps search engines out of admin, checkout and payment pages and points to the sitemap', () => {
  const r = read('public/robots.txt')
  for (const p of ['/admin', '/checkout', '/pay', '/my-orders']) expect(r).toContain(`Disallow: ${p}`)
  expect(r).toMatch(/^Sitemap: https:\/\/.+\/sitemap\.xml$/m)
})

test('sitemap lists the main shop pages', () => {
  const s = read('public/sitemap.xml')
  expect(s).toContain('<urlset')
  expect((s.match(/<loc>/g) || []).length).toBeGreaterThanOrEqual(10)
  expect(s).not.toContain('/admin')
})

test('sharing a link shows a preview card', () => {
  const h = read('index.html')
  for (const t of ['og:title', 'og:description', 'og:image', 'twitter:card']) expect(h).toContain(t)
  expect(fs.existsSync(path.join(root, 'public/og-image.png'))).toBe(true)
})

test('the website sends security headers', () => {
  const v = JSON.parse(read('vercel.json'))
  const all = v.headers.find(h => h.source === '/(.*)').headers.map(h => h.key)
  expect(all).toEqual(expect.arrayContaining(['X-Content-Type-Options', 'X-Frame-Options', 'Strict-Transport-Security', 'Referrer-Policy']))
})
