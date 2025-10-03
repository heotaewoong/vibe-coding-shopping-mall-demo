import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { mockUsers } from './userController.js'

const SKIP_DB = process.env.SKIP_DB === '1'

const User = SKIP_DB ? null : mongoose.model('User')

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'
if (!JWT_SECRET) {
  console.error('JWT_SECRET is not set. Set JWT_SECRET in your environment or server/.env')
  // In production you should fail fast
}
const ACCESS_EXPIRES = process.env.ACCESS_EXPIRES || '15m'
const REFRESH_EXPIRES_SECONDS = parseInt(process.env.REFRESH_EXPIRES_SECONDS || '604800') // 7 days

function signAccessToken(user){
  return jwt.sign({ sub: user._id, email: user.email, user_type: user.user_type }, JWT_SECRET, { expiresIn: ACCESS_EXPIRES })
}

function createRefreshToken(){
  // simple random token (could use uuid or jwt); using jwt for simplicity
  return jwt.sign({ t: Date.now() }, JWT_SECRET, { expiresIn: `${REFRESH_EXPIRES_SECONDS}s` })
}

export async function login(req, res){
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'bad_request', message: 'email and password required' })
  try{
    console.log('login attempt:', { email, SKIP_DB })
    let user
    if (SKIP_DB) {
      // find in-memory mock user
      user = mockUsers.find(u => String(u.email).toLowerCase() === String(email).toLowerCase())
    } else {
      user = await User.findOne({ email }).exec()
    }
    console.log('login user found?', !!user, user && user.email)
    if (!user) return res.status(401).json({ error: 'invalid_credentials' })
    const ok = await bcrypt.compare(password, user.password)
    console.log('password match result:', ok)
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' })

    // 토큰 생성
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({
      accessToken: token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role // role 필드 추가!
      }
    })
  } catch(err){
    console.error('login error', err)
    res.status(500).json({ error: 'login_failed', message: err.message })
  }
}

export async function refreshToken(req, res){
  const token = req.cookies && req.cookies.refreshToken
  if (!token) return res.status(401).json({ error: 'no_refresh_token' })
  try{
    // verify token signature (we used jwt) - we won't rely on payload but ensure signature valid
  jwt.verify(token, JWT_SECRET)
    let user
    if (SKIP_DB) {
      user = mockUsers.find(u => Array.isArray(u.refreshTokens) && u.refreshTokens.some(r => r.token === token))
      if (!user) return res.status(401).json({ error: 'invalid_refresh' })
      const stored = user.refreshTokens.find(r => r.token === token)
      if (!stored || (stored.expiresAt && stored.expiresAt < new Date())) return res.status(401).json({ error: 'refresh_expired' })
      const accessToken = signAccessToken(user)
      return res.json({ accessToken })
    }
    const userDb = await User.findOne({ 'refreshTokens.token': token }).exec()
    if (!userDb) return res.status(401).json({ error: 'invalid_refresh' })
    // check expiry in stored token
    const stored = userDb.refreshTokens.find(r => r.token === token)
    if (!stored || (stored.expiresAt && stored.expiresAt < new Date())){
      return res.status(401).json({ error: 'refresh_expired' })
    }

    const accessToken = signAccessToken(userDb)
    res.json({ accessToken })
  } catch(err){
    console.error('refresh error', err)
    res.status(401).json({ error: 'invalid_refresh' })
  }
}

export async function logout(req, res){
  const token = req.cookies && req.cookies.refreshToken
  if (!token) return res.status(204).end()
  try{
    // remove token from user refreshTokens
    if (SKIP_DB) {
      const u = mockUsers.find(u => Array.isArray(u.refreshTokens) && u.refreshTokens.some(r => r.token === token))
      if (u) {
        u.refreshTokens = u.refreshTokens.filter(r => r.token !== token)
      }
    } else {
      await User.updateOne({ 'refreshTokens.token': token }, { $pull: { refreshTokens: { token } } }).exec()
    }
  } catch(err){
    console.error('logout error', err)
  }
  // clear cookie
  res.clearCookie('refreshToken', { path: '/' })
  res.status(204).end()
}

export async function me(req, res){
  // Authorization: Bearer <token>
  const auth = req.headers && req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'no_token' })
  const token = auth.split(' ')[1]
  try{
    const payload = jwt.verify(token, JWT_SECRET)
    // payload.sub contains user id (we set when signing)
    const userId = payload.sub
    let user
    if (SKIP_DB) {
      user = mockUsers.find(u => String(u._id) === String(userId) || String(u.email).toLowerCase() === String(payload.email).toLowerCase())
      if (!user) return res.status(404).json({ error: 'not_found' })
      const safe = { _id: user._id, email: user.email, name: user.name, user_type: user.user_type }
      return res.json({ user: safe })
    }

    const User = mongoose.model('User')
    const userDb = await User.findById(userId).lean()
    if (!userDb) return res.status(404).json({ error: 'not_found' })
    const safe = { _id: userDb._id, email: userDb.email, name: userDb.name, user_type: userDb.user_type }
    res.json({ user: safe })
  } catch(err){
    console.error('me error', err)
    return res.status(401).json({ error: 'invalid_token' })
  }
}

