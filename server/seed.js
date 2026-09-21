require('dotenv').config()
const mongoose = require('mongoose')
const User = require('./models/User')
const connectDB = require('./config/db')

const seed = async () => {
  await connectDB()
  const email = process.env.ADMIN_EMAIL || 'admin@hrk.com'
  const password = process.env.ADMIN_PASSWORD || 'Admin@8981'
  const name = 'HRK Admin'

  const existing = await User.findOne({ email })
  if (existing) {
    console.log('Admin already exists:', email)
  } else {
    await User.create({ name, email, password, role: 'admin' })
    console.log('Admin created:', email)
  }
  process.exit(0)
}

seed().catch(err => { console.error(err); process.exit(1) })
