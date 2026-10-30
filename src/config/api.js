// The server (Render). Used for everything personal: sign-in, orders, payment, admin.
export const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Shop data everyone sees the same (products, categories, banners, offer, shop
// details, reviews). On Vercel it is read through the website's own /api, so
// Vercel's CDN can hand out a recent copy instantly even while the free server
// is waking up. Elsewhere (your computer, tests) it goes straight to the server.
// eslint-disable-next-line no-undef
export const PUBLIC_API = import.meta.env.VITE_PUBLIC_API_URL || (__ON_VERCEL__ ? '/api' : API)

// Fetch shop data: the CDN copy first; if that fails (e.g. the proxy gave up
// while the server was waking), ask the server directly like before.
export async function publicFetch(path, options) {
  if (PUBLIC_API === API) return fetch(`${API}${path}`, options)
  try {
    const r = await fetch(`${PUBLIC_API}${path}`, options)
    if (r.ok || (r.status >= 400 && r.status < 500)) return r
  } catch { /* fall through */ }
  return fetch(`${API}${path}`, options)
}
