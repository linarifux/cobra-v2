import express from 'express';
import {
  createInventory,
  getAllInventory,
  getInventoryById,
  updateInventory,
  deleteInventory,
  getInventoryByDivisionAndCorporateSku // <-- NEW EXPORT ADDED
} from '../controllers/inventoryController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

// mergeParams: true allows fetching inventory under a specific /customers/:customerId route
const router = express.Router({ mergeParams: true });

// Require authentication for all inventory routes
router.use(protect);

router.route('/')
  .get(restrictTo('super_admin','admin', 'staff', 'manager','standard', 'super_user'), getAllInventory)
  .post(restrictTo('super_admin','admin', 'staff', 'manager','standard', 'super_user'), createInventory);
  
  
// --- NEW LOOKUP ROUTE ---
router.route('/lookup/division/:divisionId/sku/:corporateSku')
  .get(restrictTo('super_admin','admin', 'staff', 'manager','standard', 'super_user'), getInventoryByDivisionAndCorporateSku);



router.route('/:id')
  .get(restrictTo('super_admin','admin', 'staff', 'manager','standard', 'super_user'), getInventoryById)
  // Warehouse staff can adjust stock; admins/staff can edit full details
  .put(restrictTo('super_admin','admin', 'staff', 'manager','standard', 'super_user'), updateInventory)
  // Only admins and staff can permanently delete inventory records
  .delete(restrictTo('super_admin','admin', 'staff', 'manager','standard', 'super_user'), deleteInventory);

export default router;