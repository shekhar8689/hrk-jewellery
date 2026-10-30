import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, ShoppingBag, CheckCircle, IndianRupee, Lightbulb, Info, EyeOff } from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import { api } from '../api'
import { getImageUrl } from '../../utils/image'

const PERIODS = [7, 30, 90, 365].map(d => [d, d === 365 ? '1 year' : `${d} days`])
const SORTS = [
  ['views', 'Most viewed'],
  ['carts', 'Most added to bag'],
  ['sold', 'Best selling'],
]
const rupees = n => `₹${Math.round(n || 0).toLocaleString('en-IN')}`
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '–')

const Tile = ({ icon: Icon, label, value, cls }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${cls}`}><Icon size={18} className="text-white" /></div>
    <div className="min-w-0"><p className="text-xs text-gray-500">{label}</p><p className="text-xl font-bold text-gray-900">{value}</p></div>
  </div>
)

export default function Popular() {
  const [days, setDays] = useState(30)
  const [sort, setSort] = useState('views')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    api.popular(days).then(setData).catch(e => setError(e.message))
  }, [days])

  const rows = [...(data?.products || [])].sort((a, b) => b[sort] - a[sort] || b.views - a.views || b.sold - a.sold)
  const max = Math.max(1, ...rows.map(r => r[sort]))
  const t = data?.totals
  // Getting attention but not selling: worth checking price, photos or description
  const notSelling = (data?.products || []).filter(r => r.views >= 10 && r.sold === 0).slice(0, 3)
  const unseen = (data?.products || []).filter(r => r.isVisible && r.views === 0).length

  return (
    <AdminLayout>
      <div className="max-w-4xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Popular products</h1>
          <p className="text-sm text-gray-500">What customers look at, add to their bag and buy, so you know their favourites.</p>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Period">
          {PERIODS.map(([d, label]) => (
            <button key={d} onClick={() => setDays(d)} aria-pressed={days === d}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border ${days === d ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'}`}>
              Last {label}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {!data && !error && <div className="h-40 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" /></div>}

        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Tile icon={Eye} label="Product views" value={t.views.toLocaleString('en-IN')} cls="bg-sky-500" />
              <Tile icon={ShoppingBag} label="Added to bag" value={t.carts.toLocaleString('en-IN')} cls="bg-amber-500" />
              <Tile icon={CheckCircle} label="Pieces sold (paid)" value={t.sold.toLocaleString('en-IN')} cls="bg-green-600" />
              <Tile icon={IndianRupee} label="Sales" value={rupees(t.revenue)} cls="bg-gray-900" />
            </div>

            {notSelling.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
                <p className="font-semibold flex items-center gap-1.5"><Lightbulb size={15} /> People like these but nobody bought yet</p>
                <p className="text-xs mt-0.5 mb-2">Try a better photo, a lower price, a coupon, or posting it on Instagram/WhatsApp.</p>
                <ul className="space-y-0.5">{notSelling.map(r => <li key={r._id}>• {r.name}: {r.views} views, {r.carts} added to bag</li>)}</ul>
              </div>
            )}

            <div className="flex flex-wrap gap-1 border-b border-gray-200" role="tablist">
              {SORTS.map(([k, label]) => (
                <button key={k} role="tab" aria-selected={sort === k} onClick={() => setSort(k)}
                  className={`px-3 py-2 text-sm font-medium -mb-px border-b-2 ${sort === k ? 'border-amber-500 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                  {label}
                </button>
              ))}
            </div>

            {t.views === 0 && t.carts === 0 && t.sold === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-500">
                No visits counted in this period yet. Counting starts from today, so share your shop link and check back in a few days.
              </div>
            ) : (
              <ol aria-label="Products ranked" className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
                {rows.map((r, i) => (
                  <li key={r._id} className="flex items-center gap-3 p-3 sm:p-4">
                    <span className={`w-7 text-center font-bold shrink-0 ${i < 3 && r[sort] > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{i + 1}</span>
                    <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                      {r.image && <img src={getImageUrl(r.image, 96)} alt="" className="w-full h-full object-cover" loading="lazy" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <Link to={`/product/${r._id}`} target="_blank" className="font-medium text-gray-900 truncate hover:underline">{r.name}</Link>
                        {!r.isVisible && <span className="text-[10px] uppercase tracking-wide bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0"><EyeOff size={10} />Hidden</span>}
                        {r.isVisible && r.stock === 0 && <span className="text-[10px] uppercase tracking-wide bg-red-100 text-red-700 px-1.5 py-0.5 rounded shrink-0">Sold out</span>}
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden" aria-hidden="true">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(r[sort] / max) * 100}%` }} />
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs text-gray-600">
                        <span title="Product page views"><Eye size={12} className="inline -mt-0.5 mr-1" />{r.views} view{r.views === 1 ? '' : 's'}</span>
                        <span title="Added to bag"><ShoppingBag size={12} className="inline -mt-0.5 mr-1" />{r.carts} in bag <span className="text-gray-400">({pct(r.carts, r.views)})</span></span>
                        <span title="Pieces sold and paid"><CheckCircle size={12} className="inline -mt-0.5 mr-1" />{r.sold} sold</span>
                        {r.revenue > 0 && <span className="font-medium text-gray-800">{rupees(r.revenue)}</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            <p className="text-xs text-gray-500 flex gap-1.5">
              <Info size={13} className="shrink-0 mt-0.5" />
              <span>
                A view is one customer opening the product page (counted once per person every few hours).
                Your own visits while signed in to admin, and search-engine robots, are not counted.
                "Sold" counts paid orders that weren't cancelled.{unseen > 0 && ` ${unseen} product${unseen > 1 ? 's have' : ' has'} no views in this period.`}
              </span>
            </p>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
