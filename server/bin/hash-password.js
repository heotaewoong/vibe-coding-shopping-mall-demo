#!/usr/bin/env node
// Usage: node server/bin/hash-password.js --email tester@example.com --password "NewPass123!" --mongo "mongodb://localhost:27017/shopping"
// This script connects to MongoDB, finds user by email, hashes the provided password with bcrypt and updates the user document.

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ override: true })

const argv = process.argv.slice(2)
function getArg(name){
  const idx = argv.findIndex(a => a === name || a.startsWith(name + '='))
  if (idx === -1) return null
  const val = argv[idx]
  if (val.includes('=')) return val.split('=')[1]
  return argv[idx+1]
}

const email = getArg('--email') || getArg('-e')
const password = getArg('--password') || getArg('-p')
const MONGO_URI = getArg('--mongo') || process.env.MONGO_URI || 'mongodb://localhost:27017/shopping'

if (!email || !password){
  console.error('Usage: node server/bin/hash-password.js --email <email> --password <password> [--mongo <uri>]')
  process.exit(1)
}

async function run(){
  try{
    const validMongoScheme = /^mongodb(\+srv)?:\/\//i
    if (!validMongoScheme.test(MONGO_URI)){
      console.error('Invalid MONGO_URI:', MONGO_URI)
      process.exit(1)
    }
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    console.log('Connected to MongoDB')
    // load User model
    const User = (await import('../models/User.js')).default
    const user = await User.findOne({ email }).exec()
    if (!user){
      console.error('User not found for email:', email)
      process.exit(2)
    }
    const hashed = await bcrypt.hash(password, 10)
    user.password = hashed
    await user.save()
    console.log('Password hashed and updated for', email)
    process.exit(0)
  } catch(err){
    console.error('Error:', err && err.message ? err.message : err)
    process.exit(3)
  }
}

run()
