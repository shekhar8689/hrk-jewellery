require('dotenv').config()
// Refuse to start in production with a weak JWT_SECRET
require('./utils/config').checkConfig(process.env)
const connectDB = require('./config/db')
const app = require('./app')

/* ── Connect to MongoDB, then seed admin user ── */
connectDB().then(seedAdmin)

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`\n🚀 Server running on http://localhost:${PORT}\n`))

/* ── Ensure the admin account in the DB matches ADMIN_EMAIL / ADMIN_PASSWORD ──
 * Previously this only created the admin when missing, so if an admin already
 * existed in Atlas with a different (older) password, the password set on Render
 * never took effect and login returned 401. The env vars are now the source of
 * truth: on every boot the admin is created, or its password/role is synced.
 */
async function seedAdmin() {
  try {
    const User     = require('./models/User')
    const email    = (process.env.ADMIN_EMAIL || '').toLowerCase().trim()
    const password = process.env.ADMIN_PASSWORD
    const name     = process.env.ADMIN_NAME || 'Admin'
    if (!email || !password) {
      console.warn('⚠️  ADMIN_EMAIL / ADMIN_PASSWORD not set — admin account not created or synced')
      return
    }

    const user = await User.findOne({ email })
    if (!user) {
      await User.create({ name, email, password, role: 'admin' })
      console.log(`✅ Admin account created: ${email}`)
      return
    }

    let changed = false
    if (user.role !== 'admin') { user.role = 'admin'; changed = true }
    if (!user.isActive)        { user.isActive = true; changed = true }
    if (!(await user.comparePassword(password))) {
      user.password = password            // hashed by the pre-save hook
      changed = true
    }
    if (changed) {
      await user.save()
      console.log(`✅ Admin account synced with env: ${email}`)
    }
  } catch (err) {
    console.error('Admin seed error:', err.message)
  }
}
