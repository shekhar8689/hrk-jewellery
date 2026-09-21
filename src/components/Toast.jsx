import { useEffect } from 'react'
import { CheckCircle, AlertTriangle, X } from 'lucide-react'

/**
 * Self-dismissing toast notification.
 * Props:
 *   message  — string to display
 *   type     — 'success' | 'error'
 *   onClose  — called after 3.5 s or when X is clicked
 */
export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [message, onClose])

  return (
    <div
      role="alert"
      className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-sm font-medium max-w-sm
        ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
    >
      {type === 'success'
        ? <CheckCircle size={16} className="shrink-0" />
        : <AlertTriangle size={16} className="shrink-0" />
      }
      <span className="flex-1">{message}</span>
      <button
        onClick={onClose}
        className="ml-1 opacity-70 hover:opacity-100 shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}
