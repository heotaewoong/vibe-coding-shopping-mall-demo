#!/usr/bin/env node
// Quick diagnostic to check admin user setup in MongoDB
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config({ override: true })

const MONGO_URI = process.env.MongoDB_ATLAS_URI || process.env.MONGO_URI || process.env.DATABASE_URL

if (!MONGO_URI || !MONGO_URI.startsWith('mongodb')) {
  console.error('No valid MONGO_URI found in environment')
  process.exit(1)
}

async function checkAdmin() {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    console.log('✓ Connected to MongoDB')
    
    const User = (await import('../models/User.js')).default
    
    // Find all admin users (refresh from DB)
    const admins = await User.find({
      $or: [
        { role: 'admin' },
        { user_type: 'admin' }
      ]
    }).lean().exec()
    
    console.log(`\n📊 Found ${admins.length} admin user(s):\n`)
    
    admins.forEach((user, idx) => {
      console.log(`Admin #${idx + 1}:`)
      console.log(`  Email: ${user.email}`)
      console.log(`  Name: ${user.name}`)
      console.log(`  role field: ${user.role || '(not set)'}`)
      console.log(`  user_type field: ${user.user_type || '(not set)'}`)
      console.log(`  _id: ${user._id}`)
      console.log('')
    })
    
    if (admins.length === 0) {
      console.log('⚠️  No admin users found!')
      console.log('\nTo create an admin user, update an existing user in MongoDB:')
      console.log('  db.users.updateOne({ email: "your@email.com" }, { $set: { role: "admin" } })')
    }
    
    process.exit(0)
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

checkAdmin()
