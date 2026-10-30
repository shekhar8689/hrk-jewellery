import { useEffect, useState } from 'react'

import { publicFetch } from '../config/api'
const keyOf = path => `hrk_cache:${path}`
const read = path => { try { const v = localStorage.getItem(keyOf(path)); return v ? JSON.parse(v) : undefined } catch { return undefined } }
const write = (path, v) => { try { localStorage.setItem(keyOf(path), JSON.stringify(v)) } catch { /* private mode / full */ } }

/**
 * Data from the API that shows instantly on repeat visits:
 * returns the copy saved on the last visit right away (or undefined the first
 * time), fetches a fresh copy in the background and swaps it in.
 * If the server fails, the last good copy stays (or `fallback` if none).
 * This matters because the free server can take ~30 s to wake up.
 */
export default function useCachedJson(path, fallback) {
  const [data, setData] = useState(() => read(path))
  useEffect(() => {
    let alive = true
    publicFetch(path)
      .then(async r => {
        if (!r.ok) throw new Error('bad response')
        const fresh = await r.json()
        if (!alive) return
        setData(fresh); write(path, fresh)
      })
      .catch(() => { if (alive) setData(d => (d === undefined ? fallback : d)) })
    return () => { alive = false }
  }, [path]) // eslint-disable-line react-hooks/exhaustive-deps
  return data
}
