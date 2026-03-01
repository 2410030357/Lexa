const express = require('express')
const cors = require('cors')
const { MongoClient } = require('mongodb')
const dotenv = require('dotenv')
dotenv.config()

const app = express()

// ── CORS ──────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://lexa-one.vercel.app',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}))

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// ── RATE LIMITERS ─────────────────────────────────────────────
let searchLimiter, uploadLimiter, authLimiter
try {
  const limiters = require('./middleware/rateLimiter')
  searchLimiter = limiters.searchLimiter
  uploadLimiter = limiters.uploadLimiter
  authLimiter   = limiters.authLimiter
} catch(e) {
  console.log('Rate limiters not found, using no-op middleware')
  const noOp = (req, res, next) => next()
  searchLimiter = uploadLimiter = authLimiter = noOp
}

// ── ROUTES ────────────────────────────────────────────────────
try {
  const authRoute = require('./routes/authRoute')
  app.use('/api/auth', authLimiter, authRoute)
  console.log('✅ Auth routes loaded')
} catch(e) {
  console.error('❌ Auth routes failed:', e.message)
}

try {
  const searchRoutes = require('./routes/search')
  app.use('/api/search', searchLimiter, searchRoutes)
  console.log('✅ Search routes loaded')
} catch(e) {
  console.error('❌ Search routes failed:', e.message)
}

try {
  const documentRoutes = require('./routes/documents')
  app.use('/api/documents', uploadLimiter, documentRoutes)
  console.log('✅ Document routes loaded')
} catch(e) {
  console.error('❌ Document routes failed:', e.message)
}

try {
  const analyticsRoutes = require('./routes/analytics')
  app.use('/api/analytics', analyticsRoutes)
  console.log('✅ Analytics routes loaded')
} catch(e) {
  console.error('❌ Analytics routes failed:', e.message)
}

try {
  const chatRoutes = require('./routes/chat')
  app.use('/api/chat', chatRoutes)
  console.log('✅ Chat routes loaded')
} catch(e) {
  console.error('❌ Chat routes failed:', e.message)
}

try {
  const adminRoutes = require('./routes/admin')
  app.use('/api/admin', adminRoutes)
  console.log('✅ Admin routes loaded')
} catch(e) {
  console.error('❌ Admin routes failed:', e.message)
}

// ── HEALTH CHECK ──────────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status: 'ok',
  timestamp: new Date(),
  routes: ['/api/auth', '/api/search', '/api/chat', '/api/documents', '/api/analytics']
}))

app.get('/', (req, res) => res.json({
  service: 'Lexa Backend v3',
  status: 'running'
}))

// ── MONGODB + START ───────────────────────────────────────────
const PORT = process.env.PORT || 5000

async function start() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not set!')
    }
    const client = await MongoClient.connect(process.env.MONGO_URI)
    const db = client.db('lexa_db')
    app.locals.db = db
    console.log('✅ MongoDB Atlas connected')

    // TTL index for cache cleanup
    try {
      await db.collection('query_cache').createIndex(
        { expireAt: 1 },
        { expireAfterSeconds: 0 }
      )
    } catch(e) {}

    app.listen(PORT, () => {
      console.log(`✅ Lexa Backend running on port ${PORT}`)
    })
  } catch(err) {
    console.error('❌ Startup failed:', err.message)
    process.exit(1)
  }
}

start()