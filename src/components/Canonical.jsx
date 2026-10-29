import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Tells Google the one address of each page (without ?filters), so it lists
// every product and category page instead of treating them as copies
export default function Canonical() {
  const { pathname } = useLocation()
  useEffect(() => {
    let l = document.querySelector('link[rel="canonical"]')
    if (!l) { l = document.createElement('link'); l.rel = 'canonical'; document.head.appendChild(l) }
    l.href = window.location.origin + (pathname === '/' ? '/' : pathname.replace(/\/+$/, ''))
  }, [pathname])
  return null
}
