// Each test file gets its own fresh database.
const crypto = require('crypto')
process.env.JWT_SECRET = 'test-secret-for-jest-only'
process.env.NODE_ENV = 'test'
process.env.TRUST_PROXY = '1'   // tests act as different visitors via X-Forwarded-For
if (process.env.TEST_NO_TRANSACTIONS === '1') require('./noTransactions')
const mongoose = require('mongoose')

beforeAll(async () => {
  const dbName = 'hrk_test_' + crypto.randomBytes(4).toString('hex')
  await mongoose.connect(process.env.TEST_MONGO_URI, { dbName })
  // Create every collection and index up front, as on the real database, so
  // transactions never run while MongoDB is still building them
  const path = require('path'), fs = require('fs')
  const dir = path.join(__dirname, '../../models')
  for (const f of fs.readdirSync(dir)) require(path.join(dir, f))
  // (skipped on test databases without transactions, which don't need it)
  if (process.env.TEST_NO_TRANSACTIONS !== '1') {
    for (const m of Object.values(mongoose.models)) {
      await m.createCollection().catch(() => {})
      await m.init().catch(() => {})
    }
  }
})

afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {})
  await mongoose.disconnect()
})
