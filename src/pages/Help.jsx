import { Link } from 'react-router-dom'
import { MessageCircle, Phone, Mail, ChevronRight, Truck } from 'lucide-react'
import Accordion from '../components/Accordion'
import usePageTitle from '../hooks/usePageTitle'
import useShop from '../hooks/useShop'
import { whatsappLink, telLink } from '../config/shop'
import { FAQS } from '../config/faqs'
import { RETURN_REPORT_WINDOW } from '../config/policy'

// Short version of each policy; the link opens the full page
const POLICIES = [
  { name: 'Return & Refund Policy', to: '/return-policy',
    text: `No returns for change of mind. If your order arrives damaged, defective, wrong or with something missing, tell us within ${RETURN_REPORT_WINDOW} of delivery with photos, and we replace it or refund you by UPI within 5–7 business days.` },
  { name: 'Shipping Policy', to: '/shipping-policy',
    text: 'Free shipping on orders above ₹999, otherwise ₹99. Orders ship within 1–2 business days of payment and arrive in 3–5 business days across India. We ship within India only.' },
  { name: 'Cancellation Policy', to: null,
    text: 'An unpaid order can be cancelled from My Orders, and cancels itself after 24 hours. A paid order can be cancelled until it ships: message or call us and we refund the full amount by UPI within 5–7 business days. Once shipped, an order cannot be cancelled.' },
  { name: 'Privacy Policy', to: '/privacy-policy',
    text: 'We use your name, phone, email and address only to deliver your order and reply to you. Payments happen in your own UPI app, so we never see your bank or card details. We never sell your data.' },
  { name: 'Terms & Conditions', to: '/terms',
    text: 'Orders are paid in full by UPI before they are processed. Prices include taxes and can change; the price shown when you order is the price you pay.' },
]

function ContactCard({ href, icon: Icon, title, sub, external }) {
  return (
    <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="flex items-center gap-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-5 py-5 transition-colors">
      <span className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center shrink-0"><Icon size={20} /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-[17px] text-gray-900">{title}</span>
        <span className="block text-sm text-gray-500 mt-0.5">{sub}</span>
      </span>
      <ChevronRight size={20} className="text-gray-400 shrink-0" aria-hidden="true" />
    </a>
  )
}

export default function Help() {
  const SHOP = useShop()
  usePageTitle('Help Center')
  // The common questions here; everything else on the FAQ page
  const questions = FAQS.find(c => c.category === 'Ordering & Payment')?.items || FAQS.flatMap(c => c.items)
  return (
    <main className="max-w-2xl mx-auto px-4 pt-8 pb-24 md:py-12">
      <h1 className="font-serif text-[1.9rem] sm:text-4xl text-gray-900 font-light mb-1">Help Center</h1>
      <p className="text-sm text-gray-500 mb-6">Questions about an order? Have your Order ID ready.</p>

      <div className="space-y-3">
        <ContactCard href={whatsappLink(`Hi ${SHOP.name}, I need help with`, SHOP)} external icon={MessageCircle} title="Chat on WhatsApp" sub="Message us; we reply during support hours" />
        <ContactCard href={telLink(SHOP)} icon={Phone} title="Call us" sub={SHOP.phone} />
        <ContactCard href={`mailto:${SHOP.email}`} icon={Mail} title="Email us" sub={SHOP.email} />
        <Link to="/track-order" className="flex items-center gap-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-5 py-5 transition-colors">
          <span className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center shrink-0"><Truck size={20} /></span>
          <span className="flex-1"><span className="block text-[17px] text-gray-900">Track your order</span><span className="block text-sm text-gray-500 mt-0.5">With your Order ID and mobile number</span></span>
          <ChevronRight size={20} className="text-gray-400 shrink-0" aria-hidden="true" />
        </Link>
      </div>

      <section aria-label="Support hours" className="mt-6 border border-gray-200 rounded-xl px-5 py-5">
        <h2 className="text-[17px] text-gray-900 font-medium pb-3 border-b border-gray-200">Support Hours</h2>
        <div className="flex justify-between gap-4 pt-3 text-sm text-gray-500">
          <span>{SHOP.supportDays}</span><span>{SHOP.supportTime}</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">Messages sent outside these hours are answered the next working day.</p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl text-gray-900 mb-1">Frequently Asked Questions</h2>
        <div>{questions.map(({ q, a }) => <Accordion key={q} title={q}><p>{a}</p></Accordion>)}</div>
        <Link to="/faq" className="inline-block mt-4 text-sm text-gold-600 hover:underline">See all questions (products, delivery, returns) →</Link>
      </section>

      <section className="mt-10">
        <h2 className="text-xl text-gray-900 mb-1">Our Policies</h2>
        <div>
          {POLICIES.map(p => (
            <Accordion key={p.name} title={p.name}>
              <p>{p.text}</p>
              {p.to && <Link to={p.to} className="inline-block text-gold-600 hover:underline">Read the full {p.name} →</Link>}
            </Accordion>
          ))}
        </div>
      </section>

      <p className="text-center text-sm text-gray-500 mt-10">
        Still need help? <Link to="/contact" className="text-gold-600 hover:underline">Send us a message</Link>
      </p>
    </main>
  )
}
