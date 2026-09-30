import express from 'express';
import {
  createReceivingCharge,
  getReceivingChargesByCustomer,
  getReceivingCharge,
  updateReceivingCharge,
  deleteReceivingCharge
} from '../controllers/receivingChargeController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin', 'super_admin')); // Restrict financial configurations to upper management

router
  .route('/')
  .post(createReceivingCharge);

// NEW: Strict customer-targeted endpoint
router
  .route('/customer/:customerId')
  .get(getReceivingChargesByCustomer);

router
  .route('/:id')
  .get(getReceivingCharge)
  .put(updateReceivingCharge)
  .delete(deleteReceivingCharge);

export default router;