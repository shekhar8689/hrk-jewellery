import { test, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
const root = path.resolve(__dirname, '../..')
const read = f => fs.readFileSync(path.join(root, f), 'utf8')

test('sitemap.xml and robots.txt come from the server (every product listed, domain from FRONTEND_URL)', () => {
  const v = JSON.parse(read('vercel.json'))
  const r = Object.fromEntries(v.rewrites.map(x => [x.source, x.destination]))
  expect(r['/sitemap.xml']).toMatch(/^https:\/\/.+\/sitemap\.xml$/)
  expect(r['/robots.txt']).toMatch(/^https:\/\/.+\/robots\.txt$/)
  // they must come before the catch-all that sends everything to the app
  expect(v.rewrites.findIndex(x => x.source === '/sitemap.xml')).toBeLessThan(v.rewrites.findIndex(x => x.source === '/(.*)'))
  // a file in public/ would win over the rewrite and go stale
  expect(fs.existsSync(path.join(root, 'public/sitemap.xml'))).toBe(false)
  expect(fs.existsSync(path.join(root, 'public/robots.txt'))).toBe(false)
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

test('shop data is read through the website (/api) so Vercel can keep a copy while the server sleeps', () => {
  const v = JSON.parse(read('vercel.json'))
  const i = v.rewrites.findIndex(x => x.source === '/api/:path*')
  expect(i).toBeGreaterThanOrEqual(0)
  expect(v.rewrites[i].destination).toMatch(/^https:\/\/.+\/api\/:path\*$/)
  expect(i).toBeLessThan(v.rewrites.findIndex(x => x.source === '/(.*)'))
  const api = v.headers.find(h => h.source === '/api/(.*)').headers
  expect(api).toEqual(expect.arrayContaining([{ key: 'x-vercel-enable-rewrite-caching', value: '1' }]))
})

test('fonts come from the site itself, not Google', () => {
  expect(read('index.html')).not.toMatch(/fonts\.googleapis/)
})
