import { useLocation } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import useShop from '../hooks/useShop'
import { whatsappLink, telLink } from '../config/shop'

// Pages where a floating button would cover the important buttons
const HIDDEN = [/^\/checkout/, /^\/pay/, /^\/admin/]

/* Floating "chat with us" button (WhatsApp), bottom right on shop pages */
export default function ChatButton() {
  const SHOP = useShop()
  const { pathname } = useLocation()
  if (HIDDEN.some(re => re.test(pathname))) return null
  const onProduct = pathname.startsWith('/product/')
  const text = onProduct
    ? `Hi ${SHOP.name}, I have a question about a product: ${window.location.origin}${pathname}`
    : `Hi ${SHOP.name}, I need help with`
  return (
    <a href={whatsappLink(text, SHOP)} target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp"
      className={`fixed right-4 md:right-6 z-40 w-14 h-14 rounded-full bg-gray-900 text-white shadow-lg flex items-center justify-center hover:bg-gold-600 transition-colors ${onProduct ? 'bottom-24 md:bottom-6' : 'bottom-5 md:bottom-6'}`}>
      <MessageCircle size={24} />
    </a>
  )
}
