const express = require('express')
const router = express.Router()
const { OAuth2Client } = require('google-auth-library')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

function makeToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar || null
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

// ─── SIGN UP with Email + Password ───────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required' })
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' })

    const db = req.app.locals.db
    const users = db.collection('users')

    const existing = await users.findOne({ email: email.toLowerCase() })
    if (existing)
      return res.status(409).json({ error: 'Email already registered. Please log in.' })

    const hashed = await bcrypt.hash(password, 10)
    const result = await users.insertOne({
      name,
      email: email.toLowerCase(),
      password: hashed,
      avatar: null,
      role: email.toLowerCase() === process.env.ADMIN_EMAIL ? 'admin' : 'user',
      provider: 'email',
      createdAt: new Date(),
      lastLogin: new Date()
    })

    const user = await users.findOne({ _id: result.insertedId })
    const token = makeToken(user)

    res.status(201).json({
      token,
      user: { email: user.email, name: user.name, avatar: null, role: user.role }
    })
  } catch(err) {
    console.error('Signup error:', err.message)
    res.status(500).json({ error: 'Signup failed: ' + err.message })
  }
})

// ─── LOG IN with Email + Password ────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' })

    const db = req.app.locals.db
    const users = db.collection('users')

    const user = await users.findOne({ email: email.toLowerCase() })
    if (!user)
      return res.status(401).json({ error: 'No account found with this email. Please sign up.' })
    if (user.provider === 'google')
      return res.status(401).json({ error: 'This account uses Google Sign-In. Use the Google button.' })
    if (!user.password)
      return res.status(401).json({ error: 'Invalid credentials' })

    const match = await bcrypt.compare(password, user.password)
    if (!match)
      return res.status(401).json({ error: 'Incorrect password' })

    await users.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } })
    const token = makeToken(user)

    res.json({
      token,
      user: { email: user.email, name: user.name, avatar: user.avatar, role: user.role }
    })
  } catch(err) {
    console.error('Login error:', err.message)
    res.status(500).json({ error: 'Login failed: ' + err.message })
  }
})

// ─── GOOGLE SIGN IN ──────────────────────────────────────────
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body
    if (!credential) return res.status(400).json({ error: 'No Google credential provided' })

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    })
    const { sub, email, name, picture } = ticket.getPayload()

    const db = req.app.locals.db
    const users = db.collection('users')

    let user = await users.findOne({ $or: [{ googleId: sub }, { email: email.toLowerCase() }] })

    if (!user) {
      // New user — create account
      const result = await users.insertOne({
        googleId: sub,
        email: email.toLowerCase(),
        name,
        avatar: picture,
        password: null,
        role: email.toLowerCase() === process.env.ADMIN_EMAIL ? 'admin' : 'user',
        provider: 'google',
        createdAt: new Date(),
        lastLogin: new Date()
      })
      user = await users.findOne({ _id: result.insertedId })
    } else {
      // Existing user — update Google info
      await users.updateOne(
        { _id: user._id },
        { $set: { googleId: sub, avatar: picture, lastLogin: new Date() } }
      )
      user.avatar = picture
    }

    const token = makeToken(user)
    res.json({
      token,
      user: { email: user.email, name: user.name, avatar: user.avatar, role: user.role }
    })
  } catch(err) {
    console.error('Google auth error:', err.message)
    res.status(401).json({ error: 'Google authentication failed: ' + err.message })
  }
})

module.exports = router
