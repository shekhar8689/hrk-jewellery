import { useEffect } from 'react'

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">{title}</h2>
      <div className="text-gray-600 text-sm leading-relaxed space-y-2">{children}</div>
    </section>
  )
}

export default function PrivacyPolicy() {
  useEffect(() => { document.title = 'Privacy Policy — HRK Jewellery'; return () => { document.title = 'HRK Jewellery' } }, [])
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl text-gray-800 mb-2">Privacy Policy</h1>
      <p className="text-xs text-gray-400 mb-10">Last updated: January 2025</p>

      <Section title="Information We Collect">
        <p>We collect information you provide directly to us when you create an account, place an order, or contact us. This includes your name, email address, shipping address, and phone number.</p>
        <p>We also automatically collect certain information when you visit our website, including your IP address, browser type, referring URLs, and pages viewed.</p>
      </Section>

      <Section title="How We Use Your Information">
        <p>We use your information to: process and fulfil orders; communicate order updates; respond to customer service requests; send promotional communications (with your consent); improve our website and services; and comply with legal obligations.</p>
      </Section>

      <Section title="Information Sharing">
        <p>We do not sell, trade, or rent your personal information to third parties. We may share your information with trusted service providers who assist us in operating our website and conducting our business, subject to confidentiality agreements.</p>
        <p>We may disclose your information when required by law or to protect our rights and safety.</p>
      </Section>

      <Section title="Data Security">
        <p>We implement industry-standard security measures to protect your personal information. All transactions are encrypted using SSL technology. However, no method of transmission over the Internet is 100% secure.</p>
      </Section>

      <Section title="Cookies">
        <p>We use cookies to enhance your browsing experience, analyse site traffic, and personalise content. You can instruct your browser to refuse all cookies, but this may limit some features of our website.</p>
      </Section>

      <Section title="Your Rights">
        <p>You have the right to access, correct, or delete your personal information. You may also opt out of marketing communications at any time. To exercise these rights, contact us at <strong>hello@hrkjewellery.com</strong>.</p>
      </Section>

      <Section title="Changes to This Policy">
        <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page with an updated date.</p>
      </Section>

      <Section title="Contact Us">
        <p>If you have questions about this Privacy Policy, please contact us at <strong>hello@hrkjewellery.com</strong>.</p>
      </Section>
    </main>
  )
}
