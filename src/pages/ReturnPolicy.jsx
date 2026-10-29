import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PackageCheck, AlertTriangle, CheckCircle } from 'lucide-react'
import { RETURN_REPORT_WINDOW } from '../config/policy'

export default function ReturnPolicy() {
  useEffect(() => { document.title = 'Return & Refund Policy — HRK Jewellery'; return () => { document.title = 'HRK Jewellery' } }, [])

  const eligible = [
    'Item received damaged or defective',
    'Wrong item delivered',
    'Item is missing from the package',
  ]

  const notEligible = [
    'Change of mind, or the item is not liked after delivery',
    'Item has been worn, used, altered or resized',
    'Tags or packaging removed or damaged by the customer',
    `Problem reported more than ${RETURN_REPORT_WINDOW} after delivery`,
    'Custom or personalised orders',
  ]

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl text-gray-800 mb-2">Return &amp; Refund Policy</h1>
      <p className="text-xs text-gray-400 mb-4">Last updated: October 2026</p>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-10 flex items-center gap-3">
        <PackageCheck size={22} className="text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800 font-medium">
          We do not accept returns for change of mind. If your order arrives damaged, defective or wrong, tell us within {RETURN_REPORT_WINDOW} of delivery and we will replace it or refund you.
        </p>
      </div>

      <div className="space-y-8 text-sm text-gray-600 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Damaged, defective or wrong items</h2>
          <p>Please check your order as soon as it arrives. If something is wrong, contact us within <strong>{RETURN_REPORT_WINDOW} of delivery</strong>. We recommend recording a short video while opening the parcel — it helps us resolve your request quickly.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <CheckCircle size={16} className="text-green-500" /> We will replace or refund
          </h2>
          <ul className="space-y-2">
            {eligible.map(i => <li key={i} className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>{i}</li>)}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" /> Not eligible
          </h2>
          <ul className="space-y-2">
            {notEligible.map(i => <li key={i} className="flex items-start gap-2"><span className="text-red-400 mt-0.5">✕</span>{i}</li>)}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">How to report a problem</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Send us a message on the <Link to="/contact" className="text-amber-700 underline">Contact page</Link> within {RETURN_REPORT_WINDOW} of delivery, with your Order ID.</li>
            <li>Include photos of the item and the packaging (or your unboxing video).</li>
            <li>We reply within 1–2 business days and arrange a replacement or refund.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Refund timeline</h2>
          <p>Approved refunds are sent within <strong>5–7 business days</strong> to the UPI account you paid from.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Cancelling an order</h2>
          <p>You can cancel an order before it is paid from My Orders, or by contacting us. Once an order is paid and confirmed, contact us and we will help.</p>
        </section>
      </div>
    </main>
  )
}
