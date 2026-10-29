/**
 * ⚠️ YOUR SHOP DETAILS — shown on the Contact, Privacy, Terms and Shipping
 * pages, in the footer and on packing slips. Edit here once.
 * (The email and phone below are placeholders: replace them.)
 */
export const SHOP = {
  name:    'HRK Jewellery',
  email:   'hello@hrkjewellery.com',
  phone:   '+91 98765 43210',
  address: 'Mumbai, Maharashtra, India',
  hours:   'Mon–Sat, 10am–6pm IST',
  // Shown on the Help Center
  supportDays: 'Monday – Saturday',
  supportTime: '10:00 AM – 6:00 PM',
  // Full links to your accounts. Leave '' to hide that icon in the footer.
  social: {
    instagram: '',   // e.g. 'https://www.instagram.com/hrkjewellery'
    facebook:  '',
    youtube:   '',
    whatsapp:  '',   // e.g. 'https://wa.me/919876543210'
  },
}

// WhatsApp chat link (uses social.whatsapp, or else the shop phone number),
// optionally with a message already typed in for the customer
export function whatsappLink(text = '') {
  const digits = SHOP.phone.replace(/\D/g, '')
  const base = SHOP.social.whatsapp || `https://wa.me/${digits.length === 10 ? '91' + digits : digits}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}
