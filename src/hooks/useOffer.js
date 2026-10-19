import { useEffect, useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// One request per page load, shared by the top bar and the home page banner
let cached = null
function loadOffer() {
  if (!cached) {
    cached = fetch(`${API}/offer`)
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null)
  }
  return cached
}

/**
 * The offer set in Admin → Offer Banner, or null while loading / on error.
 * `offer.coupon` is the live coupon ({ code, label, description }) or null
 * when the code doesn't exist, is switched off, expired or used up — so the
 * site never advertises a code that won't work.
 */
export default function useOffer() {
  const [offer, setOffer] = useState(null)
  useEffect(() => {
    let alive = true
    loadOffer().then(o => { if (alive) setOffer(o) })
    return () => { alive = false }
  }, [])
  return offer
}

// Should the home page banner be shown?
export function offerBannerVisible(offer) {
  if (!offer || !offer.isActive) return false
  if (offer.couponCode && !offer.coupon) return false   // advertised code isn't usable
  return !!(offer.title || offer.coupon)
}
