import mongoose from 'mongoose'
const { Schema } = mongoose

const OrderItemSchema = new Schema({
  // keep only reference to product and quantity (no snapshot fields)
  item: { type: Schema.Types.ObjectId, ref: 'Item' },
  sku: { type: String },
  quantity: { type: Number, default: 1, min: 1 }
}, { _id: false })

const PaymentSchema = new Schema({
  method: { type: String }, // e.g. 'card', 'paypal', 'manual'
  provider: { type: String }, // e.g. 'stripe', 'paypal'
  amount: { type: Number, default: 0 },
  currency: { type: String, default: 'KRW' },
  transactionId: { type: String },
  status: { type: String }, // e.g. 'pending','succeeded','failed'
  raw: { type: Schema.Types.Mixed }
}, { _id: false })

const OrderSchema = new Schema({
  // Human-friendly order number for display/reference
  orderNumber: { type: String, unique: true, index: true },

  // Link to user if available (authenticated purchase)
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true },

  // For guest checkout, keep a sessionId or anonymous id reference
  sessionId: { type: String, index: true },

  // Items (references only; snapshots removed)
  items: { type: [OrderItemSchema], default: [] },

  // Totals (subtotal and delivery fee removed per request)
  tax: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  currency: { type: String, default: 'KRW' },

  // Order lifecycle status
  status: { type: String, enum: ['pending','paid','failed','fulfilled','cancelled','refunded'], default: 'pending', index: true },

  // Payment snapshot
  payment: { type: PaymentSchema },

  // Billing / purchaser info (minimal for digital goods)
  billing: {
    name: { type: String },
    email: { type: String, index: true },
    address: { type: String },
    phone: { type: String }
  },

  coupon: {
    code: { type: String },
    discountAmount: { type: Number, default: 0 }
  },

  // admin metadata
  meta: { type: Schema.Types.Mixed }
}, { timestamps: true })

// simple orderNumber generator if none set (non-cryptographic)
OrderSchema.pre('save', function(next){
  if (!this.orderNumber){
    const t = Date.now().toString(36).toUpperCase()
    const r = Math.random().toString(36).slice(2,6).toUpperCase()
    this.orderNumber = `ORD-${t}-${r}`
  }

  // ensure totals are numbers (subtotal/shipping removed)
  this.tax = Number(this.tax || 0)
  this.total = Number(this.total || 0)
  next()
})

export default mongoose.models.Order || mongoose.model('Order', OrderSchema)
