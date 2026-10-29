const Order = require('../models/Order')
const Product = require('../models/Product')
const User = require('../models/User')

// Products with this many or fewer left are shown as "low stock"
const LOW_STOCK = 2

exports.getStats = async (req, res) => {
  try {
    const [totalOrders, totalProducts, totalUsers, revenueData, recentOrders, ordersByStatus] =
      await Promise.all([
        Order.countDocuments(),
        Product.countDocuments(),
        User.countDocuments({ role: 'user' }),
        Order.aggregate([
          // Money actually received: paid UPI orders (and delivered Cash on Delivery orders from before)
          { $match: { status: { $ne: 'cancelled' }, $or: [{ paymentStatus: 'paid' }, { paymentMethod: 'cod', status: 'delivered' }] } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
        Order.find()
          .populate('user', 'name')
          .sort({ createdAt: -1 })
          .limit(5),
        Order.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
      ])

    const totalRevenue = revenueData[0]?.total || 0

    // Today's to-do list for the shop
    const ContactMessage = require('../models/ContactMessage')
    const open = { paymentMethod: 'upi', status: 'pending' }
    const [paymentsToCheck, paidToConfirm, unpaid, messages, lowStock] = await Promise.all([
      Order.countDocuments({ ...open, paymentStatus: 'submitted' }),
      Order.countDocuments({ ...open, paymentStatus: 'paid' }),
      Order.countDocuments({ ...open, paymentStatus: { $in: ['pending', 'failed'] } }),
      ContactMessage.countDocuments({ handled: false }),
      Product.find({ isVisible: true, stock: { $lte: LOW_STOCK } }).sort({ stock: 1 }).limit(10).select('name stock images').lean(),
    ])

    res.json({
      totalOrders,
      totalProducts,
      totalUsers,
      totalRevenue,
      recentOrders,
      ordersByStatus,
      todo: { paymentsToCheck, paidToConfirm, unpaid, messages, lowStock },
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
}
