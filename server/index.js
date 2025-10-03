import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import './models/User.js'
import './models/Item.js'
import userRouter from './routers/user.js'
import itemRouter from './routers/item.js'
import cartRouter from './routers/cart.js'
import orderRouter from './routers/order.js'
import cookieParser from 'cookie-parser'
import authRouter from './routers/auth.js'
import bcrypt from 'bcryptjs'
import { mockUsers } from './controllers/userController.js'

// Load .env and prefer its values for local development so users don't need to set session env vars every time.
// Use `override: true` so values in server/.env take precedence over system env when present.
dotenv.config({ override: true })

// Helpful startup info: show which MongoDB env and SKIP_DB values are being used (mask the URI for safety)
// Preference order for connection string:
// 1. MongoDB_ATLAS_URI (explicit Atlas var provided by user)
// 2. MONGO_URI (legacy env var)
// 3. DATABASE_URL (alternate legacy var)
// 4. not set -> will fall back to local when allowed
try {
  const effectiveMongo = process.env.MongoDB_ATLAS_URI || process.env.MONGO_URI || process.env.DATABASE_URL || 'not set'
  const maskedMongo = effectiveMongo === 'not set' ? effectiveMongo : effectiveMongo.replace(/^(mongodb(\+srv)?:\/\/)(.*)$/, '$1***')
  console.log('Effective Mongo env used (masked):', maskedMongo)
  console.log('Effective SKIP_DB:', process.env.SKIP_DB === '1')
} catch (e) {
  // ignore logging errors
}

const app = express()

// Configure CORS to allow the client dev origins (and allow configuring via CORS_ORIGINS)
// Parse CORS_ORIGINS env and trim whitespace to avoid mismatch issues when values contain spaces.
// If not set, include local dev hosts and the Vercel client origin used for deployment.
// Normalize origins: trim whitespace and remove any trailing slash to avoid mismatch like
// 'https://example.vercel.app/' vs 'https://example.vercel.app'
const normalize = (u) => u.trim().replace(/\/$/, '')
// Parse allowed origins. Support wildcard entries like "*.vercel.app" which will be converted to RegExp.
const rawOrigins = (process.env.CORS_ORIGINS && process.env.CORS_ORIGINS.split(',').map(s => normalize(s)).filter(Boolean)) || [
  'http://localhost:5174',
  'http://localhost:5173',
  'https://vibe-coding-shopping-mall-demo-pied.vercel.app'
]

// Prepare two structures: exactOrigins (strings) and wildcardRegexes (RegExp) for pattern matching
const exactOrigins = []
const wildcardRegexes = []
for (const o of rawOrigins) {
  if (o.includes('*')) {
    // Escape dots, replace '*' with '.*' and anchor the pattern
    const pattern = '^' + o.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$'
    try {
      wildcardRegexes.push(new RegExp(pattern, 'i'))
    } catch (e) {
      console.warn('Invalid wildcard pattern in CORS_ORIGINS, ignoring:', o)
    }
  } else {
    exactOrigins.push(o)
  }
}

console.log('CORS exactOrigins:', exactOrigins)
console.log('CORS wildcardRegexes:', wildcardRegexes.map(r => r.source))

const corsOptions = {
  origin: function(origin, callback){
    // allow requests with no origin (like curl, postman)
    if(!origin) return callback(null, true)
    // debug log the incoming origin for troubleshooting
    try { console.log('CORS request origin:', origin) } catch(e) {}
    // If explicitly allowed exact origins list includes it, accept
    if (exactOrigins.indexOf(origin) !== -1) return callback(null, true)

    // If any wildcard regex matches the origin, accept
    for (const rx of wildcardRegexes) {
      try {
        if (rx.test(origin)) return callback(null, true)
      } catch (e) {
        // ignore bad regex tests
      }
    }

    // include allowedOrigins in the error message to make misconfiguration obvious in logs
    const err = new Error('Not allowed by CORS: ' + origin + ' not in ' + JSON.stringify(rawOrigins))
    callback(err)
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Kuma-Revision']
}

app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())

// Optional debug middleware: when DEBUG_REQ=1, log incoming requests (method, path, origin)
// and a masked preview of JSON bodies to help diagnose malformed payloads in production.
if (process.env.DEBUG_REQ === '1') {
  app.use((req, res, next) => {
    try {
      const origin = req.get('Origin') || req.headers.origin || null
      const method = req.method
      const path = req.originalUrl || req.url
      let bodyPreview = undefined
      if (req.body && typeof req.body === 'object') {
        // shallow clone and mask common sensitive fields
        bodyPreview = { ...req.body }
        if (bodyPreview.password) bodyPreview.password = '***masked***'
        if (bodyPreview.confirmPassword) bodyPreview.confirmPassword = '***masked***'
      }
      console.log(`REQ_DEBUG -> ${method} ${path} origin=${origin} body=`, bodyPreview)
    } catch (e) {
      // don't break the request if logging fails
      console.error('REQ_DEBUG failure', e)
    }
    next()
  })
}

const PORT = process.env.PORT || 5001

// SKIP_DB 모드: DB 연결 없이 라우트만 테스트할 때 사용
// If a MONGO_URI or DATABASE_URL is provided we always prefer DB mode
const envSkip = process.env.SKIP_DB === '1'
// consider MongoDB_ATLAS_URI as the primary indicator of an Atlas connection
const hasMongoUri = !!(process.env.MongoDB_ATLAS_URI || process.env.MONGO_URI || process.env.DATABASE_URL)
const SKIP_DB = envSkip && !hasMongoUri

// Start server with a small wrapper to handle common listen errors (like EADDRINUSE)
function startServer(){
  const server = app.listen(PORT, () => console.log(`Shopping server listening on http://localhost:${PORT}`))
  server.on('error', err => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Another process may be running.\n` +
        `On Windows you can run: netstat -ano | findstr :${PORT}  and then taskkill /PID <pid> /F to free it.`)
      process.exit(1)
    }
    console.error('Server listen error:', err)
    process.exit(1)
  })
  return server
}

// We'll connect to Mongo _after_ routes mount to avoid serving requests before the DB is ready.
const MONGO_URI = process.env.MongoDB_ATLAS_URI || process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/shopping'
const validMongoScheme = /^mongodb(\+srv)?:\/\//i

if (!SKIP_DB && MONGO_URI && !validMongoScheme.test(MONGO_URI)) {
  console.error('Invalid MONGO_URI/DATABASE_URL connection string: expected connection string to start with "mongodb://" or "mongodb+srv://"')
  console.error('Provided value:', MONGO_URI)
  console.error('If you intended to skip DB during development, set SKIP_DB=1. Otherwise set a valid MongoDB connection string in MONGO_URI or DATABASE_URL.')
  process.exit(1)
}

if (SKIP_DB) {
  console.warn('SKIP_DB=1 -> MongoDB connection skipped')
}

import { mockItems as _mockItems } from './controllers/itemController.js'

// Routes
app.get('/', (req, res) => res.send({ ok: true, message: 'shopping server running' }))

// Mount items router
app.use('/api/items', itemRouter)

// Mount cart router
app.use('/api/cart', cartRouter)

// Mount orders router
app.use('/api/orders', orderRouter)

// mount users router
app.use('/api/users', userRouter)
// mount auth router
app.use('/api/auth', authRouter)

// Dev-only debug route to inspect in-memory mock users when SKIP_DB is enabled
app.get('/__debug/mock-users', (req, res) => {
  if (!SKIP_DB) return res.status(404).json({ error: 'not_found' })
  res.json(mockUsers)
})

// Get single user
// (user routes handled in routers/user.js)

// (startServer() is used to listen after DB connection)
// remove duplicate app.listen to avoid EADDRINUSE or conflicting listeners

// Seed mock users if SKIP_DB is enabled (and route mounting is complete)
try {
  if (SKIP_DB && Array.isArray(mockUsers) && mockUsers.length === 0) {
    const pw = 'Password123!'
    const hashed = bcrypt.hashSync(pw, 10)
    const id = Date.now().toString()
    mockUsers.unshift({ _id: id, email: 'dev@test.local', name: 'Dev User', password: hashed, user_type: 'customer', refreshTokens: [], createdAt: new Date(), updatedAt: new Date() })
    console.log('Seeded mock user: dev@test.local / Password123!')
  }
} catch (e) {
  console.error('Failed to seed mock user', e)
}

// Start listening only after the optional Mongo connection succeeds to avoid bufferCommands errors.
async function bootstrapServer(){
  if (!SKIP_DB) {
    try {
      mongoose.set('bufferCommands', false)
      await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
      console.log('Connected to MongoDB')
    } catch (err) {
      console.error('MongoDB connection error:', err && err.message ? err.message : err)
      process.exit(1)
    }
  }

  startServer()
}

bootstrapServer()

// Error handler - returns JSON in development to help debugging
app.use((err, req, res, next) => {
  console.error('Server error:', err && err.stack ? err.stack : err)
  const status = err && err.status ? err.status : 500
  res.status(status).json({ error: 'server_error', message: err && err.message ? err.message : 'Internal Server Error' })
})
