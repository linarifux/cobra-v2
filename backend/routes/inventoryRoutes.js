import express from 'express';
import {
  createInventory,
  getAllInventory,
  getInventoryById,
  updateInventory,
  deleteInventory
} from '../controllers/inventoryController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

// mergeParams: true allows fetching inventory under a specific /customers/:customerId route
const router = express.Router({ mergeParams: true });

// Require authentication for all inventory routes
// router.use(protect);

router.route('/')
  .get(getAllInventory)
  // .post(restrictTo('admin', 'staff', 'warehouse'), createInventory);
  .post(createInventory);

router.route('/:id')
  .get(getInventoryById)
  // Warehouse staff can adjust stock; admins/staff can edit full details
  // .put(restrictTo('admin', 'staff', 'warehouse'), updateInventory)
  .put(updateInventory)
  // Only admins and staff can permanently delete inventory records
  // .delete(restrictTo('admin', 'staff'), deleteInventory);
  .delete(deleteInventory);

export default router;