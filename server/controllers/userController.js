const User = require('../models/User')
const Order = require('../models/Order')

const PAGE_SIZE = 15

exports.getAll = async (req, res) => {
  try {
    const { page = 1, search } = req.query
    const filter = { role: 'user' }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ]
    }
    const total = await User.countDocuments(filter)
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)

    res.json({ users, total, pages: Math.ceil(total / PAGE_SIZE), page: +page })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}

exports.getOne = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 })
    res.json({ user, orders })
  } catch {
    res.status(404).json({ message: 'User not found' })
  }
}

exports.toggleActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    user.isActive = !user.isActive
    await user.save()
    res.json(user)
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
}
