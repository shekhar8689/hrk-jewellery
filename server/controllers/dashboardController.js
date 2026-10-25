const Order = require('../models/Order')
const Product = require('../models/Product')
const User = require('../models/User')

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

    res.json({
      totalOrders,
      totalProducts,
      totalUsers,
      totalRevenue,
      recentOrders,
      ordersByStatus,
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
}
