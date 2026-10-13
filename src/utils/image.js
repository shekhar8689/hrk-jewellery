/**
 * Convert any stored image path to a full URL that the browser can load.
 *
 *  - Local uploads are saved as paths like "uploads/image.png" or "uploads\\image.png"
 *  - External images (Cloudinary, Unsplash) are already full URLs starting with "http"
 *  - Cloudinary URLs are optimised on the fly: best format for the browser
 *    (WebP/AVIF), automatic quality, and resized to `width` when given.
 *    This usually makes product photos 5–10× smaller.
 */

// Base server URL — strip the trailing "/api" from VITE_API_URL
const SERVER = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')

const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/

/**
 * getImageUrl(path, width?)
 *
 *   getImageUrl("uploads/1234-ring.png")           → "<server>/uploads/1234-ring.png"
 *   getImageUrl("https://res.cloudinary.com/x/image/upload/v1/a.jpg", 600)
 *        → "https://res.cloudinary.com/x/image/upload/f_auto,q_auto,c_limit,w_600/v1/a.jpg"
 *   getImageUrl("https://cdn.example.com/img.jpg") → unchanged
 *   getImageUrl("") / null / undefined             → ""
 */
export function getImageUrl(path, width) {
  if (!path) return ''

  if (path.startsWith('http://') || path.startsWith('https://')) {
    const m = path.match(CLOUDINARY_UPLOAD)
    // Only add our transformation if the URL doesn't already have one
    if (m && !/^(f_|q_|w_|c_)/.test(m[2])) {
      const t = ['f_auto', 'q_auto']
      if (width) t.push('c_limit', `w_${Math.round(width)}`)
      return `${m[1]}${t.join(',')}/${m[2]}`
    }
    return path
  }

  // Fix Windows backslashes and make sure path starts with /
  const clean = path.replace(/\\/g, '/')
  const withSlash = clean.startsWith('/') ? clean : '/' + clean

  return SERVER + withSlash
}
