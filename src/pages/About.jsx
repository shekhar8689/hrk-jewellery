import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Award, Leaf, Shield } from 'lucide-react'

export default function About() {
  useEffect(() => { document.title = 'About Us — HRK Jewellery'; return () => { document.title = 'HRK Jewellery' } }, [])
  return (
    <main>
      {/* Hero */}
      <section className="bg-gray-900 text-white py-20 px-4 text-center">
        <p className="text-[10px] text-gold-400 tracking-[0.3em] uppercase mb-3">Our Story</p>
        <h1 className="font-serif text-4xl md:text-5xl font-light mb-4">Crafted with Passion,<br />Worn with Pride</h1>
        <p className="text-gray-400 text-sm max-w-xl mx-auto leading-relaxed">
          HRK Jewellery was born from a love of fine craftsmanship and a belief that every woman deserves to feel beautiful every day.
        </p>
      </section>

      {/* Story */}
      <section className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="font-serif text-3xl text-gray-800 mb-6">The HRK Journey</h2>
        <p className="text-gray-500 leading-relaxed mb-4">
          Founded in 2020, HRK Jewellery started with a simple idea: make premium-quality, tarnish-free jewellery accessible to everyone. We work directly with skilled artisans across India to create pieces that blend contemporary design with timeless elegance.
        </p>
        <p className="text-gray-500 leading-relaxed">
          Every piece in our collection is water-resistant, tarnish-free, and built to last — because we believe beautiful jewellery shouldn't require compromise on quality or comfort.
        </p>
      </section>

      {/* Values */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="max-w-5xl mx-auto text-center mb-10">
          <p className="section-subtitle">What Drives Us</p>
          <h2 className="section-title">Our Values</h2>
        </div>
        <div className="max-w-5xl mx-auto grid md:grid-cols-4 gap-6">
          {[
            { icon: Heart,  title: 'Passion',     desc: 'Every piece is made with love and attention to detail.' },
            { icon: Award,  title: 'Quality',     desc: 'Tarnish-free, water-resistant materials that last.' },
            { icon: Leaf,   title: 'Sustainable', desc: 'Responsibly sourced materials and ethical production.' },
            { icon: Shield, title: 'Trust',       desc: 'Transparent pricing, and we make it right if anything arrives damaged.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl p-6 text-center border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <Icon size={22} className="text-amber-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 text-center">
        <h2 className="font-serif text-2xl text-gray-800 mb-4">Ready to find your perfect piece?</h2>
        <Link to="/collections" className="btn-gold">Shop the Collection</Link>
      </section>
    </main>
  )
}
