import { useEffect } from 'react'
import { RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react'

export default function ReturnPolicy() {
  useEffect(() => { document.title = 'Return & Refund Policy — HRK Jewellery'; return () => { document.title = 'HRK Jewellery' } }, [])

  const eligible = [
    'Item received damaged or defective',
    'Wrong item delivered',
    'Item is significantly different from the product description',
    'Item is missing from the package',
  ]

  const notEligible = [
    'Item has been worn or used',
    'Item has been altered or resized',
    'Tags have been removed',
    'Return request raised after 30 days of delivery',
    'Custom or personalised orders',
  ]

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl text-gray-800 mb-2">Return &amp; Refund Policy</h1>
      <p className="text-xs text-gray-400 mb-4">Last updated: January 2025</p>

      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-10 flex items-center gap-3">
        <RefreshCw size={22} className="text-green-500 shrink-0" />
        <p className="text-sm text-green-700 font-medium">30-day hassle-free returns on eligible items. No questions asked.</p>
      </div>

      <div className="space-y-8 text-sm text-gray-600 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Return Window</h2>
          <p>We accept return requests within <strong>30 days</strong> from the date of delivery. Items must be in their original, unworn condition with all tags and packaging intact.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <CheckCircle size={16} className="text-green-500" /> Eligible for Return
          </h2>
          <ul className="space-y-2">
            {eligible.map(i => <li key={i} className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>{i}</li>)}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" /> Not Eligible for Return
          </h2>
          <ul className="space-y-2">
            {notEligible.map(i => <li key={i} className="flex items-start gap-2"><span className="text-red-400 mt-0.5">✕</span>{i}</li>)}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">How to Initiate a Return</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Email us at <strong>hello@hrkjewellery.com</strong> with your order number and reason for return.</li>
            <li>Attach photos of the item and packaging.</li>
            <li>Our team will respond within 1–2 business days with return instructions.</li>
            <li>Pack the item securely and drop it at the designated courier point.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Refund Timeline</h2>
          <p>Once we receive and inspect the returned item, we will process your refund within <strong>5–7 business days</strong>. Refunds are sent back to the UPI account you paid from.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Exchanges</h2>
          <p>We currently do not offer direct exchanges. Please return the item for a refund and place a new order for the desired product.</p>
        </section>
      </div>
    </main>
  )
}
