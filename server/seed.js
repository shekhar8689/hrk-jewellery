require('dotenv').config()
const User = require('./models/User')
const connectDB = require('./config/db')

/*
 * Create the admin account, or reset its password/role if it already exists.
 * Uses ADMIN_EMAIL and ADMIN_PASSWORD from the environment.
 *
 *   cd server && node seed.js
 */
const seed = async () => {
  const email    = (process.env.ADMIN_EMAIL || '').toLowerCase().trim()
  const password = process.env.ADMIN_PASSWORD
  const name     = process.env.ADMIN_NAME || 'HRK Admin'
  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env first.')
    process.exit(1)
  }

  await connectDB()
  const user = await User.findOne({ email })
  if (!user) {
    await User.create({ name, email, password, role: 'admin' })
    console.log('Admin created:', email)
  } else {
    user.password = password   // re-hashed by the pre-save hook
    user.role     = 'admin'
    user.isActive = true
    await user.save()
    console.log('Admin password and role reset:', email)
  }
  process.exit(0)
}

seed().catch(err => { console.error(err); process.exit(1) })
