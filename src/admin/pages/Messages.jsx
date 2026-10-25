import { useEffect, useState, useCallback } from 'react'
import { Mail, Phone, CheckCircle, RotateCcw } from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import Pagination from '../components/Pagination'
import { api } from '../api'

const fmt = d => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

export default function Messages() {
  const [data, setData]       = useState({ messages: [], total: 0, unhandled: 0, page: 1, pages: 1 })
  const [page, setPage]       = useState(1)
  const [onlyOpen, setOnlyOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api.getMessages({ page, ...(onlyOpen ? { show: 'open' } : {}) })
      .then(setData).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [page, onlyOpen])
  useEffect(() => { load() }, [load])

  const mark = async (id, handled) => {
    try { await api.setMessageHandled(id, handled); load() } catch (e) { setError(e.message) }
  }

  return (
    <AdminLayout>
      <div className="space-y-5 max-w-4xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-sm text-gray-500">From the website's Contact page · {data.unhandled} waiting for a reply</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={onlyOpen} onChange={e => { setOnlyOpen(e.target.checked); setPage(1) }}
              className="rounded border-gray-300 text-amber-500 focus:ring-amber-400" />
            Only show messages not replied to
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading ? (
          <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" /></div>
        ) : data.messages.length === 0 ? (
          <p className="text-center text-gray-400 py-16 text-sm bg-white rounded-xl border border-gray-100">No messages {onlyOpen ? 'waiting' : 'yet'}</p>
        ) : (
          <ul className="space-y-3">
            {data.messages.map(m => (
              <li key={m._id} className={`bg-white rounded-xl border p-4 ${m.handled ? 'border-gray-100 opacity-70' : 'border-amber-200'}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">{m.name}{m.subject && <span className="font-normal text-gray-500"> · {m.subject}</span>}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mt-1">
                      {m.phone && <a href={`tel:+91${m.phone}`} className="inline-flex items-center gap-1 text-amber-700 hover:underline"><Phone size={13} /> {m.phone}</a>}
                      {m.phone && <a href={`https://wa.me/91${m.phone}`} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline">WhatsApp</a>}
                      {m.email && <a href={`mailto:${m.email}?subject=${encodeURIComponent('Re: ' + (m.subject || 'Your message to HRK Jewellery'))}`} className="inline-flex items-center gap-1 text-amber-700 hover:underline"><Mail size={13} /> {m.email}</a>}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{fmt(m.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap break-words">{m.message}</p>
                <div className="mt-3">
                  {m.handled ? (
                    <button onClick={() => mark(m._id, false)} className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800"><RotateCcw size={13} /> Mark as not replied</button>
                  ) : (
                    <button onClick={() => mark(m._id, true)} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg"><CheckCircle size={13} /> Mark as replied</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={data.page} pages={data.pages} onChange={setPage} />
      </div>
    </AdminLayout>
  )
}
