import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Link } from 'react-router-dom'

import { FAQS } from '../config/faqs'

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
          <Link to="/help" className="text-amber-600 hover:underline">Chat, call or email us</Link>
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
