import Cart from '../models/Cart.js'
import Item from '../models/Item.js'

// Helper: resolve cart by id, or by user/session
export async function findCart({ cartId, userId, sessionId }){
  if (cartId){
    const c = await Cart.findById(cartId)
    return c
  }
  if (userId){
    let c = await Cart.findOne({ user: userId, status: 'active' })
    if (!c){
      c = await Cart.create({ user: userId })
    }
    return c
  }
  if (sessionId){
    let c = await Cart.findOne({ sessionId: sessionId, status: 'active' })
    if (!c){
      c = await Cart.create({ sessionId: sessionId })
    }
    return c
  }
  return null
}

export async function getCart(req, res){
  try{
    const cartId = req.query.cartId
    const sessionId = req.query.sessionId
    const userId = req.user && req.user._id
    const cart = await findCart({ cartId, userId, sessionId })
    if (!cart) return res.status(404).json({ message: 'Cart not found' })
    res.json({ cart })
  } catch(err){
    console.error('getCart error', err)
    res.status(500).json({ message: '서버 오류' })
  }
}

export async function createCart(req, res){
  try{
    const { sessionId, items = [] } = req.body
    const userId = req.user && req.user._id
    const cart = await findCart({ userId, sessionId })

    for (const li of items){
      let product = null
      if (li.itemId) product = await Item.findById(li.itemId)
      else if (li.sku) product = await Item.findOne({ sku: li.sku })
      if (!product) continue
      cart.items.push({
        item: product._id,
        sku: product.sku,
        title: product.name,
        price: product.price || 0,
        currency: product.currency || 'KRW',
        quantity: Math.max(1, Number(li.quantity) || 1)
      })
    }
    await cart.save()
    res.status(201).json({ cart })
  } catch(err){
    console.error('createCart error', err)
    res.status(500).json({ message: '서버 오류' })
  }
}

export async function replaceCart(req, res){
  try{
    const id = req.params.id
    const cart = await Cart.findById(id)
    if (!cart) return res.status(404).json({ message: 'Cart not found' })
    const { items = [], coupon } = req.body
    cart.items = []
    for (const li of items){
      let product = null
      if (li.itemId) product = await Item.findById(li.itemId)
      else if (li.sku) product = await Item.findOne({ sku: li.sku })
      if (!product) continue
      cart.items.push({
        item: product._id,
        sku: product.sku,
        title: product.name,
        price: product.price || 0,
        currency: product.currency || 'KRW',
        quantity: Math.max(1, Number(li.quantity) || 1)
      })
    }
    if (coupon) cart.coupon = coupon
    await cart.save()
    res.json({ cart })
  } catch(err){
    console.error('replaceCart error', err)
    res.status(500).json({ message: '서버 오류' })
  }
}

export async function patchCartItems(req, res){
  try{
    const id = req.params.id
    const { action, itemId, sku, quantity = 1, meta } = req.body
    const cart = await Cart.findById(id)
    if (!cart) return res.status(404).json({ message: 'Cart not found' })

    let product = null
    if (itemId) product = await Item.findById(itemId)
    else if (sku) product = await Item.findOne({ sku })
    if (!product) return res.status(404).json({ message: 'Product not found' })

    const existingIndex = cart.items.findIndex(li => String(li.item) === String(product._id) || (li.sku && li.sku === product.sku))

    if (action === 'add'){
      if (existingIndex >= 0){
        cart.items[existingIndex].quantity = Math.max(1, cart.items[existingIndex].quantity + Number(quantity))
      } else {
        cart.items.push({ item: product._id, sku: product.sku, title: product.name, price: product.price || 0, currency: product.currency || 'KRW', quantity: Math.max(1, Number(quantity) || 1), meta })
      }
    } else if (action === 'update'){
      if (existingIndex >= 0){
        cart.items[existingIndex].quantity = Math.max(0, Number(quantity) || 0)
        if (cart.items[existingIndex].quantity === 0){
          cart.items.splice(existingIndex, 1)
        }
      } else {
        return res.status(404).json({ message: 'Item not in cart' })
      }
    } else if (action === 'remove'){
      if (existingIndex >= 0) cart.items.splice(existingIndex, 1)
    } else {
      return res.status(400).json({ message: 'Invalid action' })
    }

    await cart.save()
    res.json({ cart })
  } catch(err){
    console.error('patchCartItems error', err)
    res.status(500).json({ message: '서버 오류' })
  }
}

// Optional auth version: accepts sessionId in body or uses req.user if present
export async function patchCartItemsOptional(req, res){
  try{
    const { action, itemId, sku, quantity = 1, meta, sessionId } = req.body
    const userId = req.user && req.user._id
    const cart = await findCart({ userId, sessionId })
    if (!cart) return res.status(404).json({ message: 'Cart not found' })

    let product = null
    if (itemId) product = await Item.findById(itemId)
    else if (sku) product = await Item.findOne({ sku })
    if (!product) return res.status(404).json({ message: 'Product not found' })

    const existingIndex = cart.items.findIndex(li => String(li.item) === String(product._id) || (li.sku && li.sku === product.sku))

    if (action === 'add'){
      if (existingIndex >= 0){
        cart.items[existingIndex].quantity = Math.max(1, cart.items[existingIndex].quantity + Number(quantity))
      } else {
        cart.items.push({ item: product._id, sku: product.sku, title: product.name, price: product.price || 0, currency: product.currency || 'KRW', quantity: Math.max(1, Number(quantity) || 1), meta })
      }
    } else if (action === 'update'){
      if (existingIndex >= 0){
        cart.items[existingIndex].quantity = Math.max(0, Number(quantity) || 0)
        if (cart.items[existingIndex].quantity === 0){
          cart.items.splice(existingIndex, 1)
        }
      } else {
        return res.status(404).json({ message: 'Item not in cart' })
      }
    } else if (action === 'remove'){
      if (existingIndex >= 0) cart.items.splice(existingIndex, 1)
    } else {
      return res.status(400).json({ message: 'Invalid action' })
    }

    await cart.save()
    res.json({ cart })
  } catch(err){
    console.error('patchCartItemsOptional error', err)
    res.status(500).json({ message: '서버 오류' })
  }
}

export async function deleteCart(req, res){
  try{
    const id = req.params.id
    const cart = await Cart.findById(id)
    if (!cart) return res.status(404).json({ message: 'Cart not found' })
    cart.status = 'abandoned'
    await cart.save()
    res.json({ message: 'Cart abandoned' })
  } catch(err){
    console.error('deleteCart error', err)
    res.status(500).json({ message: '서버 오류' })
  }
}
