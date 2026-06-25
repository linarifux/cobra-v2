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
router.use(protect);

router.route('/')
  .get(getAllInventory)
  .post(restrictTo('super_admin','admin', 'staff', 'warehouse'), createInventory);
  

router.route('/:id')
  .get(restrictTo('super_admin','admin', 'staff', 'warehouse'), getInventoryById)
  // Warehouse staff can adjust stock; admins/staff can edit full details
  .put(restrictTo('super_admin','admin', 'staff', 'warehouse'), updateInventory)
  // .put(updateInventory)
  // Only admins and staff can permanently delete inventory records
  .delete(restrictTo('super_admin','admin', 'staff'), deleteInventory);
  // .delete(deleteInventory);

export default router;
