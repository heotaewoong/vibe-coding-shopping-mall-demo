#!/usr/bin/env node
// Migrate user_type to role field for consistency
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config({ override: true })

const MONGO_URI = process.env.MongoDB_ATLAS_URI || process.env.MONGO_URI || process.env.DATABASE_URL

if (!MONGO_URI || !MONGO_URI.startsWith('mongodb')) {
  console.error('No valid MONGO_URI found in environment')
  process.exit(1)
}

async function fixRoles() {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    console.log('✓ Connected to MongoDB')
    
    const User = (await import('../models/User.js')).default
    
    // Find users with user_type but no role field
    const usersToFix = await User.find({
      user_type: { $exists: true },
      role: { $exists: false }
    })
    
    console.log(`\n🔧 Found ${usersToFix.length} user(s) to fix\n`)
    
    for (const user of usersToFix) {
      user.role = user.user_type
      await user.save()
      console.log(`✓ Updated ${user.email}: role = "${user.role}"`)
    }
    
    console.log('\n✅ All users updated successfully!')
    process.exit(0)
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

fixRoles()
