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
})

afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {})
  await mongoose.disconnect()
})
