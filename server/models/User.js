import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  name: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  user_type: { type: String, required: true, enum: ['customer', 'admin'], default: 'customer' },
  address: { type: String },
  agree_terms: { type: Boolean, default: false },
  agree_marketing: { type: Boolean, default: false },
  // store issued refresh tokens (optional - simple single-device/session tokens)
  refreshTokens: [{ token: String, createdAt: Date, expiresAt: Date }]
}, { timestamps: true })

// Hash password before saving when modified
userSchema.pre('save', async function(next) {
  try {
    if (!this.isModified('password')) return next()
    const hashed = await bcrypt.hash(this.password, 10)
    this.password = hashed
    next()
  } catch (err) {
    next(err)
  }
})

// Hash password when using findOneAndUpdate / findByIdAndUpdate
userSchema.pre('findOneAndUpdate', async function(next) {
  try {
    const update = this.getUpdate()
    if (!update) return next()
    // password may be set directly or inside $set
    const raw = update.password || (update.$set && update.$set.password)
    if (!raw) return next()
    const hashed = await bcrypt.hash(raw, 10)
    if (update.password) update.password = hashed
    if (update.$set && update.$set.password) update.$set.password = hashed
    this.setUpdate(update)
    next()
  } catch (err) {
    next(err)
  }
})

export default mongoose.models.User || mongoose.model('User', userSchema)
