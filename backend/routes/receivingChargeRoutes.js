import express from 'express';
import {
  createReceivingCharge,
  getAllReceivingCharges,
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
  .get(getAllReceivingCharges)
  .post(createReceivingCharge);

router
  .route('/:id')
  .get(getReceivingCharge)
  .put(updateReceivingCharge)
  .delete(deleteReceivingCharge);

export default router;