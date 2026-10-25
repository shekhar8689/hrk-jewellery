/*
 * Only for test databases without transaction support (e.g. FerretDB):
 * set TEST_NO_TRANSACTIONS=1 and Mongoose sessions become no-ops.
 * Never used by the real server.
 */
const mongoose = require('mongoose')
mongoose.startSession = async () => ({
  _t: false,
  startTransaction() { this._t = true },
  async commitTransaction() { this._t = false },
  async abortTransaction() { this._t = false },
  inTransaction() { return this._t },
  endSession() {},
})
mongoose.Query.prototype.session = function () { return this }
const strip = o => { if (o && o.session) { const { session, ...rest } = o; return rest } return o }
for (const fn of ['create', 'findByIdAndUpdate', 'updateOne', 'findOneAndUpdate']) {
  const orig = mongoose.Model[fn]
  mongoose.Model[fn] = function (...args) { return orig.apply(this, args.map(strip)) }
}
