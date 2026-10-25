/*
 * Starts a throwaway MongoDB for the tests.
 *  - Normally: an in-memory MongoDB replica set (supports transactions), downloaded
 *    automatically by mongodb-memory-server the first time.
 *  - Or set TEST_MONGO_URI to use a database you already run (e.g. in CI).
 */
module.exports = async () => {
  if (process.env.TEST_MONGO_URI) return
  const { MongoMemoryReplSet } = require('mongodb-memory-server')
  const rs = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } })
  globalThis.__MONGO_RS__ = rs
  process.env.TEST_MONGO_URI = rs.getUri()
}
