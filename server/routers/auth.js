import express from 'express'
import { login, refreshToken, logout, me } from '../controllers/authController.js'

const router = express.Router()

router.post('/login', login)
router.post('/refresh', refreshToken)
router.post('/logout', logout)
router.get('/me', me)

export default router
