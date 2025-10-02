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
const allowedOrigins = (process.env.CORS_ORIGINS && process.env.CORS_ORIGINS.split(',').map(s => normalize(s)).filter(Boolean)) || [
  'http://localhost:5174',
  'http://localhost:5173',
  'https://vibe-coding-shopping-mall-demo-pied.vercel.app'
]

console.log('CORS allowedOrigins:', allowedOrigins)

const corsOptions = {
  origin: function(origin, callback){
    // allow requests with no origin (like curl, postman)
    if(!origin) return callback(null, true)
    // debug log the incoming origin for troubleshooting
    try { console.log('CORS request origin:', origin) } catch(e) {}
    if(allowedOrigins.indexOf(origin) !== -1){
      callback(null, true)
    } else {
      // include allowedOrigins in the error message to make misconfiguration obvious in logs
      const err = new Error('Not allowed by CORS: ' + origin + ' not in ' + JSON.stringify(allowedOrigins))
      callback(err)
    }
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Kuma-Revision']
}

app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())

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

if (!SKIP_DB) {
  // Prefer MongoDB_ATLAS_URI, fall back to MONGO_URI, then DATABASE_URL. Only use local when none provided.
  const MONGO_URI = process.env.MongoDB_ATLAS_URI || process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/shopping'

  // Basic validation: mongoose expects a MongoDB URI starting with mongodb:// or mongodb+srv://
  const validMongoScheme = /^mongodb(\+srv)?:\/\//i
  if (MONGO_URI && !validMongoScheme.test(MONGO_URI)) {
    console.error('Invalid MONGO_URI/DATABASE_URL connection string: expected connection string to start with "mongodb://" or "mongodb+srv://"')
    console.error('Provided value:', MONGO_URI)
    console.error('If you intended to skip DB during development, set SKIP_DB=1. Otherwise set a valid MongoDB connection string in MONGO_URI or DATABASE_URL.')
    process.exit(1)
  }

  if (!MONGO_URI) {
    console.warn('No MONGO_URI set. Use SKIP_DB=1 to skip DB during development.')
    startServer()
  } else {
    // Avoid Mongoose buffering commands when not connected and fail fast on bad URIs
    mongoose.set('bufferCommands', false)
    mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
      .then(() => {
        console.log('Connected to MongoDB')
        // Don't start listening until routes are mounted below
      })
      .catch(err => {
        console.error('MongoDB connection error:', err && err.message ? err.message : err)
        // Exit so the issue is visible; you can set SKIP_DB=1 to bypass DB during development
        process.exit(1)
      })
  }
} else {
  console.warn('SKIP_DB=1 -> MongoDB connection skipped')
  // don't call startServer yet; we'll start after routes are mounted below
}

import { mockItems as _mockItems } from './controllers/itemController.js'

// Routes
app.get('/', (req, res) => res.send({ ok: true, message: 'shopping server running' }))

// Mount items router
app.use('/items', itemRouter)

// Mount cart router
app.use('/cart', cartRouter)

// Mount orders router
app.use('/orders', orderRouter)

// mount users router
app.use('/users', userRouter)
// mount auth router
app.use('/auth', authRouter)

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

// Start listening now that routes and optional DB connection attempt are complete.
// If MONGO_URI was provided we attempted to connect above; in either case startServer
startServer()

// Error handler - returns JSON in development to help debugging
app.use((err, req, res, next) => {
  console.error('Server error:', err && err.stack ? err.stack : err)
  const status = err && err.status ? err.status : 500
  res.status(status).json({ error: 'server_error', message: err && err.message ? err.message : 'Internal Server Error' })
})
