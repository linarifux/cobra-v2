import express from 'express';
import { getChargeTypes, getChargeType, createChargeType, updateChargeType, deleteChargeType } from '../controllers/chargeTypeController.js';
import { protect, restrictTo } from '../controllers/authController.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getChargeTypes)
  .post(restrictTo('admin', 'super_admin', 'manager'), createChargeType);

router
  .route('/:id')
  .get(getChargeType)
  .put(restrictTo('admin', 'super_admin', 'manager'), updateChargeType)
  .delete(restrictTo('admin', 'super_admin'), deleteChargeType);

export default router;