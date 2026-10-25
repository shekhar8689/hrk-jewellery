/*
 * Start-up safety checks.
 */
const KNOWN_WEAK = ['secret', 'changeme', 'test-secret-123', 'your_jwt_secret_here', 'jwtsecret', 'hrk', 'password']

// Stops the server in production if JWT_SECRET is missing or guessable:
// anyone who knows it could sign in as the admin.
function checkConfig(env) {
  const secret = env.JWT_SECRET || ''
  const weak = secret.length < 32 || KNOWN_WEAK.includes(secret.toLowerCase())
  if (!weak) return
  const msg = 'JWT_SECRET is missing or too weak. Set it to a long random value (at least 32 characters), e.g. the output of: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
  if (env.NODE_ENV === 'production' || env.RENDER) throw new Error(msg)
  console.warn('⚠️  ' + msg)
}

// Which proxies to trust for the visitor's IP address (used by the rate limits).
// On Render there is exactly one proxy in front of the app. Elsewhere, a visitor
// could fake X-Forwarded-For, so it is ignored unless TRUST_PROXY says otherwise.
function trustProxySetting(env) {
  if (env.TRUST_PROXY !== undefined && env.TRUST_PROXY !== '') {
    const v = env.TRUST_PROXY
    if (v === 'false') return false
    if (v === 'true') return true
    return /^\d+$/.test(v) ? Number(v) : v
  }
  return env.RENDER ? 1 : false
}

module.exports = { checkConfig, trustProxySetting }
