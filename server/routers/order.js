import express from 'express'
import * as orderCtrl from '../controllers/orderController.js'
import { authOptional, authRequired } from '../middleware/auth.js'
import { verifyPayment } from '../controllers/orderController.js'

const router = express.Router()

// Create order (guest allowed)
router.post('/', authOptional, orderCtrl.createOrder)

// list orders (admin sees all, user sees own) - requires auth
router.get('/', authRequired, orderCtrl.listOrders)

// get specific order - authOptional but access checks inside
router.get('/:id', authOptional, orderCtrl.getOrder)

// update order (admin only)
router.put('/:id', authRequired, orderCtrl.updateOrder)

// change status (admin or owner cancel)
router.patch('/:id/status', authOptional, orderCtrl.updateOrderStatus)
// verify payment via Iamport
router.post('/:id/verify', authOptional, verifyPayment)

// delete order (admin)
router.delete('/:id', authRequired, orderCtrl.deleteOrder)

export default router
