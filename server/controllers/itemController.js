import mongoose from 'mongoose'
import Order from '../models/Order.js'

export const mockItems = []
const SKIP_DB = process.env.SKIP_DB === '1'

export async function listItems(req, res){
  // support pagination and optional search
  // query params: page (1-based), perPage, q (search term for name or sku)
  const page = Math.max(1, parseInt(req.query.page || '1', 10))
  const perPage = Math.max(1, parseInt(req.query.perPage || '10', 10))
  const q = (req.query.q || '').trim()

  if (SKIP_DB) {
    let list = mockItems.slice()
    if (q) {
      const qq = q.toLowerCase()
      list = list.filter(i => (i.name && i.name.toLowerCase().includes(qq)) || (i.sku && String(i.sku).toLowerCase().includes(qq)))
    }
    const total = list.length
    const start = (page - 1) * perPage
    const items = list.slice(start, start + perPage)
    return res.json({ items, total })
  }

  try {
    const Item = mongoose.model('Item')
    const filter = {}
    if (q) {
      // search name or sku (case-insensitive)
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filter.$or = [{ name: re }, { sku: re }]
    }

    const total = await Item.countDocuments(filter)
    const items = await Item.find(filter).sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).lean()
    res.json({ items, total })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'list_failed', message: err.message })
  }
}

export async function createItem(req, res){
  const { sku, name, price, category, image, description, qty, fileUrl } = req.body
  if (!sku || !name || typeof price === 'undefined' || !category) return res.status(400).json({ error: 'bad_request', message: 'sku, name, price, category required' })

  if (SKIP_DB) {
    // ensure sku is unique in mock mode
    if (mockItems.find(i => String(i.sku) === String(sku))) return res.status(409).json({ error: 'conflict', message: 'sku already exists' })
    const id = Date.now().toString()
    const item = { _id: id, sku, name, price, category, image, description, fileUrl, qty: qty || 1, createdAt: new Date(), updatedAt: new Date() }
    mockItems.unshift(item)
    return res.status(201).json(item)
  }

  try {
    const Item = mongoose.model('Item')
  const created = await Item.create({ sku, name, price, category, image, description, fileUrl, qty: qty || 1 })
    res.status(201).json(created)
  } catch (err) {
    console.error(err)
    if (err && err.code === 11000) return res.status(409).json({ error: 'conflict', message: 'sku already exists' })
    if (err && err.name === 'ValidationError') return res.status(400).json({ error: 'validation_failed', message: err.message })
    res.status(500).json({ error: 'create_failed', message: err.message })
  }
}

export async function getItem(req, res){
  const { id } = req.params
  if (SKIP_DB) {
    const it = mockItems.find(i => String(i._id) === String(id) || String(i.sku) === String(id))
    if (!it) return res.status(404).json({ error: 'not_found' })
    return res.json(it)
  }

  try {
    const Item = mongoose.model('Item')
    let it = null
    // try by ObjectId first when possible
    if (mongoose.Types.ObjectId.isValid(id)) {
      it = await Item.findById(id).lean()
    }
    // if not found by id, try lookup by SKU
    if (!it) {
      it = await Item.findOne({ sku: id }).lean()
    }
    if (!it) return res.status(404).json({ error: 'not_found' })
    res.json(it)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'get_failed', message: err.message })
  }
}

export async function updateItem(req, res){
  const { id } = req.params
  const updates = req.body
  if (SKIP_DB) {
    const idx = mockItems.findIndex(i => String(i._id) === String(id) || String(i.sku) === String(id))
    if (idx === -1) return res.status(404).json({ error: 'not_found' })
    // if SKU updated ensure uniqueness
    if (updates.sku && mockItems.find((m, i) => i !== idx && String(m.sku) === String(updates.sku))) {
      return res.status(409).json({ error: 'conflict', message: 'sku already exists' })
    }
    mockItems[idx] = { ...mockItems[idx], ...updates, updatedAt: new Date() }
    return res.json(mockItems[idx])
  }

  try {
    const Item = mongoose.model('Item')
    const updated = await Item.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean()
    if (!updated) return res.status(404).json({ error: 'not_found' })
    res.json(updated)
  } catch (err) {
    console.error(err)
    if (err && err.code === 11000) return res.status(409).json({ error: 'conflict', message: 'sku already exists' })
    res.status(500).json({ error: 'update_failed', message: err.message })
  }
}

export async function deleteItem(req, res){
  const { id } = req.params
  if (SKIP_DB) {
    const idx = mockItems.findIndex(i => String(i._id) === String(id) || String(i.sku) === String(id))
    if (idx === -1) return res.status(404).json({ error: 'not_found' })
    const removed = mockItems.splice(idx, 1)[0]
    return res.json(removed)
  }

  try {
    const Item = mongoose.model('Item')
    const removed = await Item.findByIdAndDelete(id).lean()
    if (!removed) return res.status(404).json({ error: 'not_found' })
    res.json(removed)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'delete_failed', message: err.message })
  }
}

// Protected download: allow if requester is the order owner (user) or sessionId matches an order that contains the item
export async function downloadItem(req, res){
  const { id } = req.params
  const { sessionId } = req.query
  try{
    const Item = mongoose.model('Item')
    let it = null
    if (mongoose.Types.ObjectId.isValid(id)) it = await Item.findById(id).lean()
    if (!it) it = await Item.findOne({ sku: id }).lean()
    if (!it) return res.status(404).json({ error: 'not_found' })

    // If no fileUrl specified -> not downloadable
    if (!it.fileUrl) return res.status(404).json({ error: 'no_file' })

    // If public fileUrl (starts with http(s) and contains 'public' or similar) we might allow direct redirect
    // But we still enforce order ownership: check Order model for purchase

    // If authenticated user, allow if they own an order containing this item
    const user = req.user || null
    if (user && user._id){
      const found = await Order.findOne({ user: user._id, 'items.item': it._id }).lean()
      if (found) return res.redirect(it.fileUrl)
      return res.status(403).json({ error: 'forbidden' })
    }

    // Guest flow: must provide sessionId either as query or via body
    const sid = sessionId || (req.query && req.query.sessionId) || (req.body && req.body.sessionId)
    if (sid){
      const found = await Order.findOne({ sessionId: sid, 'items.item': it._id }).lean()
      if (found) return res.redirect(it.fileUrl)
    }

    return res.status(403).json({ error: 'forbidden' })
  } catch(err){
    console.error('downloadItem error', err)
    res.status(500).json({ error: 'server_error' })
  }
}
