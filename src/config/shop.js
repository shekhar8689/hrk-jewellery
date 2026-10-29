/*
 * The shop's contact details are edited in Admin → Shop Settings.
 * These are only the defaults shown until the saved ones load (and before
 * anything is saved).
 */
export const SHOP = {
  name:        'HRK Jewellery',
  phone:       '+91 86898 14335',
  whatsapp:    '918689814335',     // digits with country code
  email:       'hello@hrkjewellery.com',
  address:     'Mumbai, Maharashtra, India',
  supportDays: 'Monday – Saturday',
  supportTime: '10:00 AM – 6:00 PM',
  instagram:   '',
  facebook:    '',
  youtube:     '',
}

// WhatsApp chat link for the shop, optionally with a message already typed in
export function whatsappLink(text = '', shop = SHOP) {
  const phone = String(shop.phone || '').replace(/\D/g, '').slice(-10)
  const digits = String(shop.whatsapp || '').replace(/\D/g, '') || (phone ? '91' + phone : '')
  const base = `https://wa.me/${digits}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

// tel: link for the shop phone
export const telLink = (shop = SHOP) => `tel:${String(shop.phone || '').replace(/\s/g, '')}`
