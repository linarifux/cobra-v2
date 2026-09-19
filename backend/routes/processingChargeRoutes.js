import express from 'express';
import {
  createProcessingCharge,
  getProcessingChargesByCustomer,
  getProcessingCharge,
  updateProcessingCharge,
  deleteProcessingCharge
} from '../controllers/processingChargeController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Require authentication for all routes
router.use(protect);

// ==========================================
// READ ACCESS 
// Admin Portal Roles + Order Portal Super User
// ==========================================
router.route('/customer/:customerId')
  .get(restrictTo('admin', 'super_admin', 'staff', 'super_user'), getProcessingChargesByCustomer);

router.route('/:id')
  .get(restrictTo('admin', 'super_admin', 'staff', 'super_user'), getProcessingCharge);

// ==========================================
// WRITE ACCESS (CRUD)
// Strictly Admin Portal Roles Only
// ==========================================
router.use(restrictTo('admin', 'super_admin', 'staff'));

router.route('/')
  .post(createProcessingCharge);

router.route('/:id')
  .put(updateProcessingCharge)
  .delete(deleteProcessingCharge);

export default router;