import express from 'express'
import * as cartCtrl from '../controllers/cartController.js'
import { authOptional, authRequired } from '../middleware/auth.js'

const router = express.Router()

router.get('/', authOptional, cartCtrl.getCart)
router.post('/', authOptional, cartCtrl.createCart)
router.patch('/items', authOptional, cartCtrl.patchCartItemsOptional)
router.put('/:id', authRequired, cartCtrl.replaceCart)
router.patch('/:id/items', authRequired, cartCtrl.patchCartItems)
router.delete('/:id', authRequired, cartCtrl.deleteCart)

export default router
