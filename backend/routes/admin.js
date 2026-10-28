const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')

// Admin-only middleware
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

// GET /api/admin/users — list all users
router.get('/users', auth, adminOnly, async (req, res) => {
  try {
    const db = req.app.locals.db
    const users = await db.collection('users')
      .find({}, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()
    res.json({ users, total: users.length })
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/admin/stats — system stats
router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const db = req.app.locals.db
    const [userCount, docCount, queryCount] = await Promise.all([
      db.collection('users').countDocuments(),
      db.collection('documents').countDocuments(),
      db.collection('query_history').countDocuments()
    ])
    res.json({ userCount, docCount, queryCount })
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
