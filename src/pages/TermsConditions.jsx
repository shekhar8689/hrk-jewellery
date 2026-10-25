import { useEffect } from 'react'

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">{title}</h2>
      <div className="text-gray-600 text-sm leading-relaxed space-y-2">{children}</div>
    </section>
  )
}

export default function TermsConditions() {
  useEffect(() => { document.title = 'Terms & Conditions — HRK Jewellery'; return () => { document.title = 'HRK Jewellery' } }, [])
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl text-gray-800 mb-2">Terms &amp; Conditions</h1>
      <p className="text-xs text-gray-400 mb-10">Last updated: January 2025</p>

      <Section title="Acceptance of Terms">
        <p>By accessing and using the HRK Jewellery website, you accept and agree to be bound by these Terms and Conditions. If you do not agree, please do not use our website.</p>
      </Section>

      <Section title="Products and Pricing">
        <p>All prices are listed in Indian Rupees (₹) and are inclusive of applicable taxes. We reserve the right to change prices at any time without prior notice. Prices displayed at the time of order confirmation are final.</p>
        <p>We strive to ensure product images accurately represent the actual product. Slight variations in colour may occur due to monitor settings.</p>
      </Section>

      <Section title="Orders and Payment">
        <p>By placing an order, you confirm that all information provided is accurate. We reserve the right to cancel any order if we suspect fraudulent activity or if an item is out of stock.</p>
        <p>Payment must be made in full by UPI before an order is processed. Orders that are not paid within 24 hours are cancelled automatically. Cash on Delivery is not available.</p>
      </Section>

      <Section title="Shipping">
        <p>We aim to dispatch orders within 1–2 business days. Estimated delivery times are 3–5 business days within India. Delivery times are estimates and not guaranteed.</p>
        <p>We are not responsible for delays caused by courier services, natural disasters, or other circumstances beyond our control.</p>
      </Section>

      <Section title="Returns and Refunds">
        <p>Please refer to our <strong>Return Policy</strong> for full details on returns, exchanges, and refunds.</p>
      </Section>

      <Section title="Intellectual Property">
        <p>All content on this website — including images, text, logos, and designs — is the property of HRK Jewellery and is protected by copyright laws. You may not reproduce, distribute, or use our content without prior written permission.</p>
      </Section>

      <Section title="Limitation of Liability">
        <p>HRK Jewellery shall not be liable for any indirect, incidental, or consequential damages arising from your use of our website or products. Our maximum liability shall not exceed the amount paid for the order in question.</p>
      </Section>

      <Section title="Governing Law">
        <p>These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra.</p>
      </Section>

      <Section title="Contact">
        <p>For questions about these Terms, contact us at <strong>hello@hrkjewellery.com</strong>.</p>
      </Section>
    </main>
  )
}
