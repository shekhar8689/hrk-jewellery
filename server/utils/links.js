/*
 * Banner button links must open a real page of the shop. People type them by
 * hand, so common slips are fixed instead of leading to "Page not found":
 *   "/collections/ necklace"                → "/collections/necklaces"
 *   "https://www.hrkjewellery.in/x"          → "/x"
 *   "collections?q=combo"                    → "/collections?q=combo"
 * Returns { link } or { error } (a plain-words reason).
 */
const CATEGORIES = ['rings', 'necklaces', 'earrings', 'bracelets', 'anklets']

const shopHosts = () => (process.env.FRONTEND_URL || '').split(',')
  .map(u => { try { return new URL(u.trim()).host.replace(/^www\./, '') } catch { return '' } })
  .filter(Boolean)

function cleanLink(raw) {
  let s = String(raw ?? '').trim()
  if (!s) return { link: '' }
  if (/^https?:\/\//i.test(s)) {
    let u
    try { u = new URL(s) } catch { return { error: 'That link is not a valid address.' } }
    const host = u.host.replace(/^www\./, '')
    const own = shopHosts().includes(host) || /^hrk-jewellery[a-z0-9-]*\.vercel\.app$/.test(host)
    if (!own) return { error: 'Banner buttons must open a page on your site, e.g. /collections/necklaces or /collections?q=combo' }
    s = u.pathname + u.search + u.hash
  }
  const [beforeHash, hash = ''] = s.split('#')
  const [path0, query = ''] = beforeHash.split('?')
  let path = '/' + path0.replace(/\s+/g, '').replace(/^\/+/, '').replace(/\/+$/, '')
  const m = path.match(/^\/collections\/([^/]+)$/i)
  if (m) {
    let cat = m[1].toLowerCase()
    if (cat !== 'all' && !CATEGORIES.includes(cat)) {
      if (CATEGORIES.includes(cat + 's')) cat += 's'
      else return { error: `"${m[1]}" is not a collection. Use one of: ${CATEGORIES.map(c => '/collections/' + c).join(', ')}` }
    }
    path = '/collections/' + cat
  } else if (/^\/collections$/i.test(path)) path = '/collections'
  return { link: path + (query ? '?' + query.trim() : '') + (hash ? '#' + hash : '') }
}

module.exports = { cleanLink }
