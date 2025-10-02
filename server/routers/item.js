import express from 'express'
import * as itemCtrl from '../controllers/itemController.js'
import { authOptional } from '../middleware/auth.js'

const router = express.Router()

// List items
router.get('/', itemCtrl.listItems)

// Create item
router.post('/', itemCtrl.createItem)

// Read single by id or sku
router.get('/:id', itemCtrl.getItem)

// Protected download endpoint (auth optional - checks order/session)
router.get('/:id/download', authOptional, itemCtrl.downloadItem)

// Update
router.put('/:id', itemCtrl.updateItem)

// Delete
router.delete('/:id', itemCtrl.deleteItem)

export default router
