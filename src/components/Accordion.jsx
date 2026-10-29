import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'

// One question / policy that opens to show its answer
export default function Accordion({ title, children }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className="border-b border-gray-200">
      <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-controls={id}
        className="flex justify-between items-center gap-4 w-full py-5 text-left text-[15px] text-gray-800 hover:text-gold-600 transition-colors">
        <span>{title}</span>
        <ChevronDown size={18} className={`shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div id={id} className="pb-5 -mt-1 text-sm text-gray-600 leading-relaxed space-y-3">{children}</div>}
    </div>
  )
}
