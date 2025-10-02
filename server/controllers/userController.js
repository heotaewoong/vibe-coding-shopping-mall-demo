import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

// In-memory mock storage for SKIP_DB mode
export const mockUsers = []
const SKIP_DB = process.env.SKIP_DB === '1'

export async function listUsers(req, res) {
  if (SKIP_DB) return res.json(mockUsers)
  try {
    const User = mongoose.model('User')
    const users = await User.find().lean()
    res.json(users)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'list_failed', message: err.message })
  }
}


export async function createUser(req, res) {
  // Log body for debugging but avoid logging plain password
  const { email, name, password, user_type, address, agree_terms, agree_marketing } = req.body
  console.log('createUser body (no password):', { email, name, user_type, address, agree_terms, agree_marketing })
  if (!email || !name || !password || !user_type) return res.status(400).json({ error: 'bad_request', message: 'email, name, password, user_type required' })
  if (SKIP_DB) {
    const id = Date.now().toString()
    // Hash password even in mock mode so tests can assert format
    const hashed = await bcrypt.hash(password, 10)
    const user = { _id: id, email, name, password: hashed, user_type, address, agree_terms: !!agree_terms, agree_marketing: !!agree_marketing, createdAt: new Date(), updatedAt: new Date() }
    mockUsers.unshift(user)
    return res.status(201).json({ ...user, password: undefined })
  }

  try {
  const User = mongoose.model('User')
  // Model middleware will hash the password before saving, so pass raw password here
  const created = await User.create({ email, name, password, user_type, address, agree_terms: !!agree_terms, agree_marketing: !!agree_marketing })
    const response = created.toObject ? created.toObject() : created
    // Do not return password in response
    if (response) delete response.password
    res.status(201).json(response)
  } catch (err) {
    console.error('createUser error:', err && err.stack ? err.stack : err)
    // Duplicate key (unique email)
    if (err && err.code === 11000) return res.status(409).json({ error: 'conflict', message: 'email already exists' })
    // Mongoose validation error
    if (err && err.name === 'ValidationError') return res.status(400).json({ error: 'validation_failed', message: err.message })
    res.status(500).json({ error: 'create_failed', message: err.message })
  }
}

export async function getUser(req, res) {
  const { id } = req.params
  if (SKIP_DB) {
    const user = mockUsers.find(u => String(u._id) === String(id))
    if (!user) return res.status(404).json({ error: 'not_found' })
    return res.json(user)
  }

  try {
    const User = mongoose.model('User')
    const user = await User.findById(id).lean()
    if (!user) return res.status(404).json({ error: 'not_found' })
    res.json(user)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'get_failed', message: err.message })
  }
}

export async function updateUser(req, res) {
  const { id } = req.params
  const updates = req.body
  if (SKIP_DB) {
    const idx = mockUsers.findIndex(u => String(u._id) === String(id))
    if (idx === -1) return res.status(404).json({ error: 'not_found' })
    mockUsers[idx] = { ...mockUsers[idx], ...updates, updatedAt: new Date() }
    return res.json(mockUsers[idx])
  }

  try {
    const User = mongoose.model('User')
    const updated = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean()
    if (!updated) return res.status(404).json({ error: 'not_found' })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'update_failed', message: err.message })
  }
}

export async function deleteUser(req, res) {
  const { id } = req.params
  if (SKIP_DB) {
    const idx = mockUsers.findIndex(u => String(u._id) === String(id))
    if (idx === -1) return res.status(404).json({ error: 'not_found' })
    const removed = mockUsers.splice(idx, 1)[0]
    return res.json(removed)
  }

  try {
    const User = mongoose.model('User')
    const removed = await User.findByIdAndDelete(id).lean()
    if (!removed) return res.status(404).json({ error: 'not_found' })
    res.json(removed)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'delete_failed', message: err.message })
  }
}
