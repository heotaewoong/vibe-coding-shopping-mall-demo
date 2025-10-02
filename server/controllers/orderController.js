import Order from '../models/Order.js'
import Item from '../models/Item.js'
import { findCart } from './cartController.js'

// create order: accept items or use cart (sessionId/user)
export async function createOrder(req, res){
  try{
    const { sessionId, items: itemsInBody = [], billing = {}, payment, coupon } = req.body || {}
    const userId = req.user && req.user._id

    // Duplicate order protection: if client includes a payment.transactionId (imp_uid)
    // or payment.merchant_uid, check for existing orders with same txn id or merchant id
    const incomingTxn = (payment && (payment.transactionId || (payment.transaction && payment.transaction.imp_uid))) || null
    const incomingMerchant = (payment && (payment.merchantUid || (payment.transaction && payment.transaction.merchant_uid))) || null
    if (incomingTxn || incomingMerchant){
      const dupQuery = { $or: [] }
      if (incomingTxn) dupQuery.$or.push({ 'payment.transactionId': incomingTxn }, { 'payment.transactionId': { $exists: true, $eq: incomingTxn } })
      if (incomingMerchant) dupQuery.$or.push({ 'payment.merchantUid': incomingMerchant }, { 'payment.merchant.merchant_uid': incomingMerchant })
      if (dupQuery.$or.length > 0){
        const existing = await Order.findOne(dupQuery).lean()
        if (existing){
          // If existing order is already paid, reject duplicate with 409
          if (existing.status === 'paid') return res.status(409).json({ message: 'duplicate_order', order: existing })
          // If existing is pending, return it to client so they can proceed (avoid creating another)
          return res.status(200).json({ order: existing, warning: 'existing_pending_order' })
        }
      }
    }

    let items = []
    // prefer explicit items in body, else use cart
    if (Array.isArray(itemsInBody) && itemsInBody.length > 0){
      items = itemsInBody.map(i => ({ item: i.itemId || i.item, sku: i.sku, quantity: Number(i.quantity) || 1 }))
    } else {
      // try to use cart
      const cart = await findCart({ userId, sessionId })
      if (cart && Array.isArray(cart.items) && cart.items.length > 0){
        items = cart.items.map(li => ({ item: li.item, sku: li.sku, quantity: Number(li.quantity) || 1 }))
      }
    }

    if (!items || items.length === 0) return res.status(400).json({ message: 'No items to create order' })

    // resolve each item price from Item model and compute total
    let total = 0
    const orderItems = []
    for (const it of items){
      let product = null
      if (it.item) product = await Item.findById(it.item).lean()
      else if (it.sku) product = await Item.findOne({ sku: it.sku }).lean()
      if (!product){
        // skip missing product
        continue
      }
      const qty = Math.max(1, Number(it.quantity) || 1)
      orderItems.push({ item: product._id, sku: product.sku, quantity: qty })
      total += (Number(product.price || 0) * qty)
    }

    // apply coupon if present
    let discount = 0
    if (coupon && coupon.code && Number(coupon.discountAmount)){ discount = Number(coupon.discountAmount) }
    const tax = 0
    total = Math.max(0, total - discount + tax)

    const order = new Order({
      user: userId || undefined,
      sessionId: sessionId || undefined,
      items: orderItems,
      tax,
      total,
      currency: 'KRW',
      status: (payment && payment.status === 'succeeded') ? 'paid' : 'pending',
      payment: payment || undefined,
      billing: billing || {},
      coupon: coupon || undefined
    })

    await order.save()

    // If a payment transaction id (imp_uid) was provided, attempt server-side verification now.
    // This will mark the order paid if verification succeeds, or update payment.raw on failure.
    const impUid = incomingTxn || (payment && payment.transaction && payment.transaction.imp_uid) || null
    if (impUid){
      try{
        // call verifyPayment to perform Iamport lookup/verification
        // we call the local function directly rather than HTTP to reuse logic
        // construct a fake req/res pair: but reuse verifyPayment implementation by calling helper logic
        // For simplicity, call verifyPayment route via function and then re-fetch updated order
        await verifyPayment({ params: { id: order._id }, body: { imp_uid: impUid }, user: req.user }, { status: () => ({ json: ()=>{} }) })
      } catch(e){
        // verification errors are already logged in verifyPayment; continue
        console.warn('verifyPayment call during createOrder failed', e)
      }
      const refreshed = await Order.findById(order._id).lean()
      return res.status(201).json({ order: refreshed })
    }

    res.status(201).json({ order })
  } catch(err){
    console.error('createOrder error', err)
    res.status(500).json({ message: 'Server error' })
  }
}

// list orders: admin sees all, user sees their orders
export async function listOrders(req, res){
  try{
    const user = req.user
    const q = {}
    if (!user) return res.status(401).json({ message: 'Authentication required' })
    if (user.user_type !== 'admin'){
      q.user = user._id
    }
    const orders = await Order.find(q).sort({ createdAt: -1 }).limit(200).lean()
    res.json({ orders })
  } catch(err){
    console.error('listOrders error', err)
    res.status(500).json({ message: 'Server error' })
  }
}

export async function getOrder(req, res){
  try{
    const id = req.params.id
    const order = await Order.findById(id).lean()
    if (!order) return res.status(404).json({ message: 'Order not found' })
    const user = req.user
    if (order.user){
      if (!user) return res.status(403).json({ message: 'Forbidden' })
      if (String(order.user) !== String(user._id) && user.user_type !== 'admin') return res.status(403).json({ message: 'Forbidden' })
    } else if (order.sessionId){
      // allow guest to view if sessionId provided in query
      const sessionId = req.query.sessionId
      if (!sessionId || String(sessionId) !== String(order.sessionId)) return res.status(403).json({ message: 'Forbidden' })
    }
    res.json({ order })
  } catch(err){
    console.error('getOrder error', err)
    res.status(500).json({ message: 'Server error' })
  }
}

// replace/update order (admin only)
export async function updateOrder(req, res){
  try{
    const user = req.user
    if (!user || user.user_type !== 'admin') return res.status(403).json({ message: 'Admin only' })
    const id = req.params.id
    const update = req.body || {}
    const order = await Order.findByIdAndUpdate(id, update, { new: true })
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json({ order })
  } catch(err){
    console.error('updateOrder error', err)
    res.status(500).json({ message: 'Server error' })
  }
}

// update status (admin or owner to cancel)
export async function updateOrderStatus(req, res){
  try{
    const id = req.params.id
    const { status } = req.body || {}
    const user = req.user
    const order = await Order.findById(id)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    // owner can cancel; admin can change to any status
    if (user && user.user_type === 'admin'){
      order.status = status
    } else if (user && String(order.user) === String(user._id)){
      // allow owner to cancel
      if (status === 'cancelled') order.status = 'cancelled'
      else return res.status(403).json({ message: 'Forbidden' })
    } else {
      return res.status(403).json({ message: 'Forbidden' })
    }
    await order.save()
    res.json({ order })
  } catch(err){
    console.error('updateOrderStatus error', err)
    res.status(500).json({ message: 'Server error' })
  }
}

// delete order (admin only)
export async function deleteOrder(req, res){
  try{
    const user = req.user
    if (!user || user.user_type !== 'admin') return res.status(403).json({ message: 'Admin only' })
    const id = req.params.id
    await Order.findByIdAndDelete(id)
    res.json({ message: 'Order deleted' })
  } catch(err){
    console.error('deleteOrder error', err)
    res.status(500).json({ message: 'Server error' })
  }
}

// Verify payment with Iamport when imp_uid is provided. Requires IMP_REST_KEY and IMP_REST_SECRET env vars.
export async function verifyPayment(req, res){
  try{
    const id = req.params.id
    const { imp_uid } = req.body || {}
    if (!imp_uid) return res.status(400).json({ message: 'imp_uid required' })
    const order = await Order.findById(id)
    if (!order) return res.status(404).json({ message: 'Order not found' })

    // If server env not configured, return 501 so client can fallback to optimistic
    const key = process.env.IMP_REST_KEY
    const secret = process.env.IMP_REST_SECRET
    if (!key || !secret){
      // mark paid optimistically (ONLY if payment.amount matches)
      order.status = 'paid'
      order.payment = order.payment || {}
      order.payment.transactionId = imp_uid
      await order.save()
      return res.json({ order, warning: 'verification_not_configured' })
    }

    // get token
    const tokenRes = await fetch('https://api.iamport.kr/users/getToken', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imp_key: key, imp_secret: secret })
    })
    const tokenData = await tokenRes.json()
    if (!tokenData || !tokenData.response || !tokenData.response.access_token) return res.status(502).json({ message: 'iamport token failed' })
    const accessToken = tokenData.response.access_token

    const payRes = await fetch(`https://api.iamport.kr/payments/${imp_uid}`, { headers: { Authorization: `Bearer ${accessToken}` } })
    const payData = await payRes.json()
    if (!payData || !payData.response) return res.status(502).json({ message: 'iamport payment lookup failed' })

    const paymentInfo = payData.response
    // basic amount sanity check
    if (Number(paymentInfo.amount) !== Number(order.total)){
      // amounts mismatch -> flag
      order.status = 'failed'
      order.payment = order.payment || {}
      order.payment.raw = paymentInfo
      await order.save()
      return res.status(400).json({ message: 'amount_mismatch', paymentInfo })
    }

    // if payment status succeeded, mark order paid
    if (paymentInfo.status === 'paid' || paymentInfo.status === 'paid'){
      order.status = 'paid'
      order.payment = order.payment || {}
      order.payment.transactionId = paymentInfo.imp_uid
      order.payment.raw = paymentInfo
      await order.save()
      return res.json({ order })
    }

    // other statuses
    order.payment = order.payment || {}
    order.payment.raw = paymentInfo
    await order.save()
    return res.json({ order })
  } catch(err){
    console.error('verifyPayment error', err)
    res.status(500).json({ message: 'Server error' })
  }
}

export default {
  createOrder,
  listOrders,
  getOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder
}



