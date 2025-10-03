import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { mockUsers } from '../controllers/userController.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'
const SKIP_DB = process.env.SKIP_DB === '1'

async function loadUserFromPayload(payload){
  const userIdRaw = payload && (payload.sub || payload.id)
  const emailRaw = payload && payload.email
  if (!userIdRaw && !emailRaw) return null
  if (SKIP_DB){
    const u = mockUsers.find(u => {
      if (!u) return false
      const matchesId = userIdRaw && String(u._id) === String(userIdRaw)
      const matchesEmail = emailRaw && String(u.email).toLowerCase() === String(emailRaw).toLowerCase()
      return matchesId || matchesEmail
    })
    if (!u) return null
    // return a safe copy
    const role = u.role || u.user_type || payload.role || payload.user_type || 'customer'
    return { _id: u._id, email: u.email, name: u.name, user_type: u.user_type || role, role }
  }

  const User = mongoose.model('User')
  const orConditions = []
  if (userIdRaw){
    if (mongoose.Types.ObjectId.isValid(userIdRaw)){
      orConditions.push({ _id: new mongoose.Types.ObjectId(userIdRaw) })
    }
    orConditions.push({ _id: userIdRaw })
  }
  if (emailRaw){
    orConditions.push({ email: String(emailRaw).toLowerCase() })
  }
  if (orConditions.length === 0) return null

  const userDb = await User.findOne({ $or: orConditions }).lean()
  if (!userDb) return null
  const role = userDb.role || userDb.user_type || payload.role || payload.user_type || 'customer'
  return { _id: userDb._id, email: userDb.email, name: userDb.name, user_type: userDb.user_type || role, role }
}

// Optional authentication: if Authorization Bearer token present and valid, set req.user
export async function authOptional(req, res, next){
  try{
    const auth = req.headers && req.headers.authorization
    // debug log for troubleshooting 401 issues
    if (process.env.DEBUG_AUTH === '1') console.log('[authOptional] Authorization header:', auth)
    if (!auth || !auth.startsWith('Bearer ')) return next()
    const token = auth.split(' ')[1]
    let payload
    try{
      payload = jwt.verify(token, JWT_SECRET)
    } catch(e){
      if (process.env.DEBUG_AUTH === '1') console.warn('[authOptional] token verify failed:', e && e.message)
      return next()
    }
    const user = await loadUserFromPayload(payload)
    if (user) {
      // normalize role field for downstream use
      if (!user.role && user.user_type) user.role = user.user_type
      req.user = user
    }
    return next()
  } catch(err){
    // on error treat as unauthenticated but don't fail the request (optional)
    return next()
  }
}

// Required authentication: 401 when missing/invalid
export async function authRequired(req, res, next){
  try{
    const auth = req.headers && req.headers.authorization
    if (process.env.DEBUG_AUTH === '1') console.log('[authRequired] Authorization header:', auth)
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'no_token' })
    const token = auth.split(' ')[1]
    let payload
    try{
      payload = jwt.verify(token, JWT_SECRET)
    } catch(e){
      if (process.env.DEBUG_AUTH === '1') console.warn('[authRequired] token verify failed:', e && e.message)
      return res.status(401).json({ error: 'invalid_token' })
    }
  const user = await loadUserFromPayload(payload)
    if (!user) return res.status(401).json({ error: 'invalid_token' })
  if (!user.role && user.user_type) user.role = user.user_type
  req.user = user
    next()
  } catch(err){
    console.error('authRequired error', err)
    res.status(500).json({ error: 'server_error' })
  }
}

// Helper to parse token without binding to req
export function parseToken(token){
  try{
    if (!token) return null
    return jwt.verify(token, JWT_SECRET)
  } catch(e){
    return null
  }
}

export default {
  authOptional,
  authRequired,
  parseToken
}
