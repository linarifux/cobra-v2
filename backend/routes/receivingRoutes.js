import express from 'express';
import {
  createReceiving,
  getAllReceiving,
  getReceivingById,
  updateReceiving,
  deleteReceiving
} from '../controllers/receivingController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true });

// Require valid authentication for all receiving routes
router.use(protect);

router.route('/')
  // All authenticated users can view receiving logs
  .get(getAllReceiving)
  // Staff and Admins can log new inbound shipments
  .post(restrictTo('admin', 'super_admin', 'warehouse_manager', 'staff'), createReceiving);

router.route('/:id')
  // All authenticated users can view specific log details
  .get(getReceivingById)
  // Updates to a log require staff permissions
  .put(restrictTo('admin', 'super_admin', 'warehouse_manager', 'staff'), updateReceiving)
  // Deleting a financial/inventory log entirely should be strictly limited to admins
  .delete(restrictTo('admin', 'super_admin'), deleteReceiving);

export default router;