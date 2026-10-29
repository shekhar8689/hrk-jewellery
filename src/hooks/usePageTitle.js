import { useEffect } from 'react'

// Sets the browser tab title for a page ("Sign In — HRK Jewellery")
export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — HRK Jewellery` : 'HRK Jewellery'
    return () => { document.title = 'HRK Jewellery' }
  }, [title])
}
