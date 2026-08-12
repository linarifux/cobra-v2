import express from 'express';
import { getVendorCarriers, getVendorCarrier, createVendorCarrier, updateVendorCarrier, deleteVendorCarrier } from '../controllers/vendorCarrierController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect); // Ensure user is logged in

router
  .route('/')
  .get(getVendorCarriers)
  .post(restrictTo('admin', 'super_admin', 'manager'), createVendorCarrier);

router
  .route('/:id')
  .get(getVendorCarrier)
  .put(restrictTo('admin', 'super_admin', 'manager'), updateVendorCarrier)
  .delete(restrictTo('admin', 'super_admin'), deleteVendorCarrier);

export default router;