import mongoose from 'mongoose'

const CATEGORY_VALUES = ['자기계발', '외국어', 'ai']

const itemSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, enum: CATEGORY_VALUES, required: true },
  image: { type: String, required: false },
  // public or protected file URL/path for downloadable PDF
  fileUrl: { type: String, required: false },
  description: { type: String, required: false },
  // legacy/supporting field kept if inventory tracking is needed later
  qty: { type: Number, default: 1 }
}, { timestamps: true })

// Ensure an index on sku for uniqueness at the DB level
itemSchema.index({ sku: 1 }, { unique: true })

// Simple pre-save cleanup: ensure sku is uppercased and trimmed
itemSchema.pre('save', function(next){
  if (this.sku && typeof this.sku === 'string') this.sku = this.sku.trim()
  next()
})

export default mongoose.models.Item || mongoose.model('Item', itemSchema)
