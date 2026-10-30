// Tells the server a customer looked at a product or added it to the bag,
// for the admin's "Popular products" report. Never slows down or breaks the page.
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export function trackProduct(id, event) {
  try {
    if (!id) return
    if (event === 'view') {
      const key = `seen_${id}`
      if (sessionStorage.getItem(key)) return            // once per product per visit
      sessionStorage.setItem(key, '1')
    }
    const headers = { 'Content-Type': 'application/json' }
    const admin = localStorage.getItem('admin_token')     // the owner's own browsing isn't counted
    if (admin) headers.Authorization = `Bearer ${admin}`
    fetch(`${API}/products/${id}/seen`, { method: 'POST', headers, body: JSON.stringify({ event }), keepalive: true }).catch(() => {})
  } catch { /* storage blocked (private mode) — skip */ }
}
