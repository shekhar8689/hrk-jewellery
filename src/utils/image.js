/**
 * Convert any stored image path to a full URL that the browser can load.
 *
 * Why this is needed:
 *  - Local uploads are saved as paths like "uploads/image.png" or "uploads\\image.png"
 *  - External images (Cloudinary, Unsplash) are already full URLs starting with "http"
 *  - This function handles both cases cleanly
 */

// Base server URL — strip the trailing "/api" from VITE_API_URL
const SERVER = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '')

/**
 * getImageUrl(path)
 *
 * Examples:
 *   "uploads\\1234-ring.png"           → "http://localhost:5000/uploads/1234-ring.png"
 *   "uploads/1234-ring.png"            → "http://localhost:5000/uploads/1234-ring.png"
 *   "/uploads/1234-ring.png"           → "http://localhost:5000/uploads/1234-ring.png"
 *   "https://cdn.example.com/img.jpg"  → "https://cdn.example.com/img.jpg"  (unchanged)
 *   ""  or  null  or  undefined        → ""
 */
export function getImageUrl(path) {
  if (!path) return ''

  // Already a full URL — return as-is (Cloudinary, Unsplash, any CDN)
  if (path.startsWith('http://') || path.startsWith('https://')) return path

  // Fix Windows backslashes and make sure path starts with /
  const clean = path.replace(/\\/g, '/')
  const withSlash = clean.startsWith('/') ? clean : '/' + clean

  return SERVER + withSlash
}
