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
  .get(restrictTo('super_admin','admin', 'staff', 'manager','standard', 'super_user'), getAllInventory)
  .post(restrictTo('super_admin','admin', 'staff', 'manager','standard', 'super_user'), createInventory);
  

router.route('/:id')
  .get(restrictTo('super_admin','admin', 'staff', 'manager','standard', 'super_user'), getInventoryById)
  // Warehouse staff can adjust stock; admins/staff can edit full details
  .put(restrictTo('super_admin','admin', 'staff', 'manager','standard', 'super_user'), updateInventory)
  // .put(updateInventory)
  // Only admins and staff can permanently delete inventory records
  .delete(restrictTo('super_admin','admin', 'staff', 'manager','standard', 'super_user'), deleteInventory);
  // .delete(deleteInventory);

export default router;
