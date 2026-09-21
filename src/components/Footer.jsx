import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Instagram, Facebook, Youtube, Twitter } from 'lucide-react'

const links = {
  'Shop': [
    { label: 'New Arrivals', to: '/collections?filter=new' },
    { label: 'Rings',        to: '/collections/rings' },
    { label: 'Necklaces',   to: '/collections/necklaces' },
    { label: 'Earrings',    to: '/collections/earrings' },
    { label: 'Bracelets',   to: '/collections/bracelets' },
    { label: 'Anklets',     to: '/collections/anklets' },
  ],
  'Help': [
    { label: 'My Orders',         to: '/my-orders' },
    { label: 'Returns & Exchange', to: '/return-policy' },
    { label: 'Shipping Info',     to: '/shipping-policy' },
    { label: 'FAQs',              to: '/faq' },
    { label: 'Contact Us',        to: '/contact' },
  ],
  'Company': [
    { label: 'About Us',      to: '/about' },
    { label: 'Privacy Policy',to: '/privacy-policy' },
    { label: 'Terms of Use',  to: '/terms' },
    { label: 'Wishlist',      to: '/wishlist' },
  ],
}

export default function Footer() {
  const [email,      setEmail]      = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = e => {
    e.preventDefault()
    if (email) { setSubscribed(true); setEmail('') }
  }

  return (
    <footer className="bg-[#0E0E0E] text-gray-400">
      {/* Newsletter */}
      <div className="border-b border-white/5 py-14 px-4">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-[10px] text-gold-500 tracking-[0.3em] uppercase mb-3">Stay Connected</p>
          <h3 className="font-serif text-3xl text-white font-light mb-3 tracking-wide">Join the HRK Family</h3>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            Be first to know about new arrivals, exclusive offers &amp; jewellery care tips.
          </p>
          {subscribed ? (
            <p className="text-gold-400 font-medium tracking-wide">You're on the list. Thank you!</p>
          ) : (
            <form onSubmit={handleSubscribe} className="flex max-w-md mx-auto">
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Your email address"
                className="flex-1 px-5 py-3.5 text-sm text-gray-800 bg-white focus:outline-none placeholder-gray-400" />
              <button type="submit"
                className="bg-gold-500 hover:bg-gold-600 text-white px-7 text-[10px] tracking-[0.2em] uppercase font-semibold transition-colors">
                Subscribe
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="font-serif text-xl text-white tracking-[0.2em] uppercase font-light">
              HRK <span className="text-gold-500">Jewellery</span>
            </Link>
            <p className="text-sm text-gray-500 mt-4 max-w-xs leading-relaxed">
              Fine jewellery for the modern woman. Tarnish-free, water-resistant, and thoughtfully crafted to last a lifetime.
            </p>
            <div className="flex gap-4 mt-6">
              {[Instagram, Facebook, Youtube, Twitter].map((Icon, i) => (
                <a key={i} href="#" aria-label="Social media"
                  className="w-8 h-8 border border-white/10 flex items-center justify-center text-gray-500 hover:text-gold-400 hover:border-gold-500 transition-all">
                  <Icon size={15} />
                </a>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {['🇮🇳 Made in India', '💧 Water Resistant', '✨ Tarnish-Free'].map(tag => (
                <span key={tag} className="text-[9px] text-gray-500 border border-white/10 px-2.5 py-1.5 tracking-wide">{tag}</span>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <h4 className="text-white text-[10px] uppercase tracking-[0.2em] font-semibold mb-5">{title}</h4>
              <ul className="space-y-3">
                {items.map(item => (
                  <li key={item.label}>
                    <Link to={item.to} className="text-sm text-gray-500 hover:text-gold-400 transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5 px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3 text-[11px] text-gray-600">
          <p>© 2025 HRK Jewellery. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy-policy" className="hover:text-gray-400 transition-colors">Privacy Policy</Link>
            <Link to="/terms"          className="hover:text-gray-400 transition-colors">Terms of Service</Link>
            <Link to="/return-policy"  className="hover:text-gray-400 transition-colors">Returns</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
