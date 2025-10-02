import mongoose from 'mongoose'
const { Schema } = mongoose

// Cart schema for a PDF-selling storefront
// Supports both logged-in users and guest carts (sessionId or anonymousId)
// Each cart contains multiple line items that reference an Item (product) and
// store a small snapshot of price/title/image at the time it was added to avoid
// historical mutation issues.

const LineItemSchema = new Schema({
  item: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
  sku: { type: String },
  title: { type: String },
  price: { type: Number, required: true }, // price per unit in smallest unit (e.g. cents)
  currency: { type: String, default: 'KRW' },
  quantity: { type: Number, default: 1, min: 1 },
  meta: { type: Schema.Types.Mixed }, // optional extra metadata (e.g. selected file id, license tier)
}, { _id: false })

const CartSchema = new Schema({
  // If the user is logged in, link to the User model
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true },

  // For guest carts, a sessionId or anonymousId may be used
  sessionId: { type: String, index: true },

  // Array of line items
  items: { type: [LineItemSchema], default: [] },

  // Cached totals for faster lookups
  subtotal: { type: Number, default: 0 }, // in smallest currency unit
  tax: { type: Number, default: 0 },
  shipping: { type: Number, default: 0 },
  total: { type: Number, default: 0 },

  // Cart status (active until converted to an order)
  status: { type: String, enum: ['active','abandoned','converted'], default: 'active', index: true },

  // Optional coupon/promotion snapshot
  coupon: {
    code: { type: String },
    discountAmount: { type: Number, default: 0 }
  },

}, { timestamps: true })

// Recalculate totals before save
CartSchema.pre('save', function(next){
  try{
    let subtotal = 0
    for (const li of this.items || []){
      const unit = (typeof li.price === 'number') ? li.price : Number(li.price || 0)
      const qty = Math.max(0, Number(li.quantity) || 0)
      subtotal += unit * qty
    }
    this.subtotal = subtotal
    // tax / shipping / coupon handled elsewhere or simple defaults here
    const couponDeduct = (this.coupon && this.coupon.discountAmount) ? Number(this.coupon.discountAmount) : 0
    this.total = Math.max(0, subtotal + (this.tax || 0) + (this.shipping || 0) - couponDeduct)
    next()
  } catch(err){
    next(err)
  }
})

export default mongoose.models.Cart || mongoose.model('Cart', CartSchema)
