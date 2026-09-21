import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Link } from 'react-router-dom'

const FAQS = [
  {
    category: 'Products & Quality',
    items: [
      { q: 'Are your products tarnish-free?', a: 'Yes! All HRK Jewellery products are made with high-quality tarnish-free metals and coatings that maintain their shine over time with proper care.' },
      { q: 'Are the products water-resistant?', a: 'Our jewellery is water-resistant, meaning it can withstand light contact with water. However, we recommend avoiding prolonged submersion, harsh chemicals, and perfumes to maintain the finish.' },
      { q: 'What materials do you use?', a: 'We use premium stainless steel, brass, and copper base metals with gold/silver plating. All materials are nickel-tested and safe for sensitive skin.' },
      { q: 'Are your products hypoallergenic?', a: 'Most of our products are nickel-free and suitable for sensitive skin. Check individual product descriptions for specific material information.' },
    ],
  },
  {
    category: 'Orders & Shipping',
    items: [
      { q: 'How long does delivery take?', a: 'Orders are dispatched within 1–2 business days and delivered within 3–5 business days across India. Remote areas may take up to 7 days.' },
      { q: 'Is there a free shipping threshold?', a: 'Yes! We offer FREE shipping on all orders above ₹999. A flat shipping charge of ₹99 applies to orders below this amount.' },
      { q: 'Can I track my order?', a: 'Absolutely! Once your order is dispatched, you can track it from the My Orders section in your account. You\'ll also receive SMS/email updates.' },
      { q: 'Do you deliver outside India?', a: 'Currently we only ship within India. International shipping is coming soon!' },
    ],
  },
  {
    category: 'Returns & Refunds',
    items: [
      { q: 'What is your return policy?', a: 'We offer a 30-day return window for eligible items. Items must be in original, unworn condition with all tags and packaging intact.' },
      { q: 'How do I initiate a return?', a: 'Email us at hello@hrkjewellery.com with your order number, photos of the item, and reason for return. We\'ll get back to you within 1–2 business days.' },
      { q: 'When will I receive my refund?', a: 'Refunds are processed within 5–7 business days after we receive and inspect the returned item. They\'re credited to your original payment method.' },
    ],
  },
  {
    category: 'Account & Payments',
    items: [
      { q: 'Do I need an account to place an order?', a: 'No! You can checkout as a guest. However, creating an account lets you track orders, save addresses, and leave reviews.' },
      { q: 'What payment methods do you accept?', a: 'We accept Cash on Delivery (COD) and online payments including UPI, credit/debit cards, and net banking.' },
      { q: 'Is my payment information secure?', a: 'Yes. All payments are encrypted using SSL technology. We do not store your card details on our servers.' },
      { q: 'Can I use a coupon code?', a: 'Yes! Enter your coupon code at checkout before placing your order. The discount will be applied to your order total.' },
    ],
  },
]

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100">
      <button onClick={() => setOpen(v => !v)}
        className="flex justify-between items-center w-full py-4 text-sm text-left font-medium text-gray-700 hover:text-gold-600 transition-colors"
        aria-expanded={open}>
        <span className="pr-4">{q}</span>
        {open ? <ChevronUp size={16} className="shrink-0 text-amber-500" /> : <ChevronDown size={16} className="shrink-0 text-gray-400" />}
      </button>
      {open && <p className="text-sm text-gray-500 pb-4 leading-relaxed">{a}</p>}
    </div>
  )
}

export default function FAQ() {
  useEffect(() => { document.title = 'FAQ — HRK Jewellery'; return () => { document.title = 'HRK Jewellery' } }, [])
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="font-serif text-3xl text-gray-800 mb-2">Frequently Asked Questions</h1>
        <p className="text-gray-500 text-sm">Can't find what you're looking for?{' '}
          <Link to="/contact" className="text-amber-600 hover:underline">Contact us</Link>
        </p>
      </div>

      <div className="space-y-10">
        {FAQS.map(({ category, items }) => (
          <section key={category}>
            <h2 className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-3">{category}</h2>
            <div className="bg-white border border-gray-100 rounded-2xl px-5">
              {items.map(item => <FAQItem key={item.q} {...item} />)}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
