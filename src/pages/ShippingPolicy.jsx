import { RETURN_REPORT_WINDOW } from '../config/policy'
import useShop from '../hooks/useShop'
import { useEffect } from 'react'
import { Truck, Clock, MapPin, Package } from 'lucide-react'

export default function ShippingPolicy() {
  const SHOP = useShop()
  useEffect(() => { document.title = 'Shipping Policy — HRK Jewellery'; return () => { document.title = 'HRK Jewellery' } }, [])
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl text-gray-800 mb-2">Shipping Policy</h1>
      <p className="text-xs text-gray-400 mb-10">Last updated: October 2026</p>

      {/* Quick reference cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {[
          { icon: Truck, title: 'Free Shipping', desc: 'On all orders above ₹999' },
          { icon: Clock, title: 'Processing Time', desc: '1–2 business days' },
          { icon: Package, title: 'Delivery Time', desc: '3–5 business days' },
          { icon: MapPin, title: 'Service Area', desc: 'All across India' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <Icon size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-7 text-sm text-gray-600 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Shipping Charges</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Orders above ₹999: <strong>FREE shipping</strong></li>
            <li>Orders below ₹999: <strong>₹99 flat shipping charge</strong></li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Processing Time</h2>
          <p>Orders are processed within 1–2 business days (Monday–Saturday, excluding public holidays). Once it ships, the Track Order page shows the courier name, tracking number and a tracking link.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Delivery Time</h2>
          <p>Standard delivery takes 3–5 business days after dispatch. Remote areas may take up to 7 business days. These are estimates and are subject to courier and weather conditions.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Order Tracking</h2>
          <p>Once your order is shipped, you can track it on the <strong>Track Order</strong> page with your Order ID and mobile number (or under <strong>My Orders</strong> if you have an account). It shows the courier name, tracking number and a link to the courier's website.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Damaged or Missing Items</h2>
          <p>If your order arrives damaged or with missing items, please contact us at <a href={`mailto:${SHOP.email}`} className="font-semibold underline">{SHOP.email}</a> within {RETURN_REPORT_WINDOW} of delivery with photos. We will resolve the issue promptly.</p>
        </section>
      </div>
    </main>
  )
}
