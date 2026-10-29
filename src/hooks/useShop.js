import useCachedJson from './useCachedJson'
import { SHOP } from '../config/shop'

/*
 * The shop's contact details from Admin → Shop Settings (phone, WhatsApp,
 * email, address, support hours, social links). Shows the last-seen copy
 * at once and the defaults the very first time, then the latest.
 */
export default function useShop() {
  const saved = useCachedJson('/shop', null)
  return saved && typeof saved === 'object' && !Array.isArray(saved) ? { ...SHOP, ...saved } : SHOP
}
