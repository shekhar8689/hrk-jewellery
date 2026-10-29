import useCachedJson from './useCachedJson'

/**
 * The offer set in Admin → Offer Banner, or null while loading / on error.
 * `offer.coupon` is the live coupon ({ code, label, description }) or null
 * when the code doesn't exist, is switched off, expired or used up — so the
 * site never advertises a code that won't work.
 */
export default function useOffer() {
  // Shown instantly from the last visit, then refreshed
  return useCachedJson('/offer', null) ?? null
}

// Should the home page banner be shown?
export function offerBannerVisible(offer) {
  if (!offer || !offer.isActive) return false
  if (offer.couponCode && !offer.coupon) return false   // advertised code isn't usable
  return !!(offer.title || offer.coupon)
}
