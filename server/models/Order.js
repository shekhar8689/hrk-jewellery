const mongoose = require('mongoose')

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  image: String,
  price: Number,
  quantity: { type: Number, default: 1 },
  size: String,
  color: String,
})

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  guestInfo: {
    name: String,
    email: String,
    phone: String,
  },
  items: [orderItemSchema],
  shippingAddress: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  // Price breakdown — always calculated by the server from the database
  subtotal:       { type: Number, default: 0 },
  shippingFee:    { type: Number, default: 0 },
  couponCode:     { type: String, default: '' },
  discount:       { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  // New orders are paid in advance by UPI. ('cod' / 'online' are kept for old orders.)
  paymentMethod: { type: String, enum: ['upi', 'cod', 'online'], default: 'upi' },
  // pending   = not paid yet
  // submitted = customer says they paid and gave the UPI transaction number; admin checks the bank
  // paid      = admin saw the money arrive
  // failed    = admin could not find the payment; customer can send the number again
  paymentStatus: { type: String, enum: ['pending', 'submitted', 'paid', 'failed'], default: 'pending' },
  upiRef:          { type: String, trim: true, default: '' },   // 12-digit UPI transaction number from the customer
  payTo:           { upiId: String, payeeName: String },       // the UPI ID shown to the customer for this order
  paymentSubmittedAt: Date,
  paidAt:          Date,
  notes: { type: String, default: '' },
  // Tracking — filled in by the admin when the parcel is shipped
  courier:        { type: String, trim: true, maxlength: 60,  default: '' },
  trackingNumber: { type: String, trim: true, maxlength: 80,  default: '' },
  trackingUrl:    { type: String, trim: true, maxlength: 300, default: '' },
  // When each status was reached (shown on the customer's tracking page)
  statusHistory: [{ status: String, at: { type: Date, default: Date.now }, _id: false }],
}, { timestamps: true })

orderSchema.index({ upiRef: 1 })

module.exports = mongoose.model('Order', orderSchema)
