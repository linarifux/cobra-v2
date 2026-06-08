import express from 'express';
import {
  createCustomer,
  getAllCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer
} from '../controllers/customerController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 1. Require a valid login token for ALL customer routes
// router.use(protect); 

// 2. Base routes accessible by admin, staff, and warehouse
router.route('/')
  .get(getAllCustomers)
  .post(createCustomer);

router.route('/:id')
  .get(getCustomer)
  .put(updateCustomer)
  // 3. Chain restrictTo before the controller for sensitive actions
  .delete(restrictTo('admin', 'staff'), deleteCustomer);

export default router;