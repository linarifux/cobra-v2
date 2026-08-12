import express from 'express';
import { getVendors, getVendor, createVendor, updateVendor, deleteVendor } from '../controllers/vendorController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect); // Ensure user is logged in

router
  .route('/')
  .get(getVendors)
  .post(restrictTo('admin', 'super_admin', 'manager'), createVendor);

router
  .route('/:id')
  .get(getVendor)
  .put(restrictTo('admin', 'super_admin', 'manager'), updateVendor)
  .delete(restrictTo('admin', 'super_admin'), deleteVendor);

export default router;