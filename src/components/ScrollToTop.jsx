import { useLayoutEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/**
 * New page → start at the top (otherwise a link tapped in the footer opens the
 * next page at its bottom, and after "Place Order" the Pay page opened half-way down).
 * Back/Forward (POP) → leave it, so the browser returns you to where you were.
 * Only the path counts: filters that change "?search=" don't jump the page.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()
  const type = useNavigationType()
  useLayoutEffect(() => {
    if (type !== 'POP') window.scrollTo(0, 0)
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}
