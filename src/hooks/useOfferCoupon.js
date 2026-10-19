import { useEffect, useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// The coupon code advertised in the top bar and the home page offer banner
export const OFFER_CODE = 'FIRST10'

// One request per page load, shared by every component that asks
let cached = null
function loadOffer() {
  if (!cached) {
    cached = fetch(`${API}/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // A large amount so a minimum-order rule doesn't hide a coupon that exists
      body: JSON.stringify({ code: OFFER_CODE, orderAmount: 1e9 }),
    })
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null)
  }
  return cached
}

/**
 * The live offer coupon, or null when it doesn't exist / is switched off /
 * expired / used up — so the site never advertises a code that won't work.
 * Returns { code, label } where label is e.g. "10% off" or "₹200 off".
 */
export default function useOfferCoupon() {
  const [offer, setOffer] = useState(null)
  useEffect(() => {
    let alive = true
    loadOffer().then(c => {
      if (!alive || !c?.valid) return
      const label = c.type === 'percentage'
        ? `${c.value}% off`
        : `₹${Number(c.value).toLocaleString('en-IN')} off`
      setOffer({ code: c.code, label, description: c.description })
    })
    return () => { alive = false }
  }, [])
  return offer
}
