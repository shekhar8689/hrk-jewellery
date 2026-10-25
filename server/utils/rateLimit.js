/*
 * Small in-memory rate limits (per server process).
 *   const limit = createLimiter({ windowMs, max })
 *   limit.hit(key)     → true if this attempt is allowed (and counts it)
 *   limit.blocked(key) → true if the key has used up its attempts
 *   limit.reset(key)   → forget the key (e.g. after a successful sign-in)
 *   limit.middleware(keyFn, message) → Express middleware
 */
const all = new Set()

function createLimiter({ windowMs, max }) {
  const map = new Map()
  const entry = key => {
    const now = Date.now()
    let e = map.get(key)
    if (!e || now > e.reset) { e = { count: 0, reset: now + windowMs }; map.set(key, e) }
    return e
  }
  const limiter = {
    hit(key) { const e = entry(key); if (e.count >= max) return false; e.count++; return true },
    blocked(key) { return entry(key).count >= max },
    reset(key) { map.delete(key) },
    prune() { const now = Date.now(); for (const [k, e] of map) if (now > e.reset) map.delete(k) },
    middleware(keyFn, message) {
      return (req, res, next) => {
        if (limiter.hit(keyFn(req))) return next()
        res.status(429).json({ message })
      }
    },
  }
  all.add(limiter)
  return limiter
}

// The visitor's address (see trust proxy in app.js)
const ipOf = req => req.ip || req.socket?.remoteAddress || 'unknown'

// Drop old entries every 10 minutes so memory doesn't grow forever
setInterval(() => { for (const l of all) l.prune() }, 10 * 60 * 1000).unref()

module.exports = { createLimiter, ipOf }
