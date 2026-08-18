import express from 'express';
import {
  createCustomer,
  getAllCustomers,
  getCustomer,
  updateCustomer,
  updateCustomerCarriers,
  getCustomerCarriers, // <-- NEW: Import the GET controller for carriers
  deleteCustomer
} from '../controllers/customerController.js';

import { protect, restrictTo } from '../middlewares/authMiddleware.js';

import divisionRouter from './divisionRoutes.js';
import inventoryRouter from './inventoryRoutes.js';
import orderRouter from './orderRoutes.js';
import addressRouter from './addressRoutes.js';
import userRouter from './userRoutes.js';

const router = express.Router();

// 1. Require a valid login token for ALL customer routes
router.use(protect);

// ---------------------------------------------------------
// NESTED ROUTE REDIRECTS
// ---------------------------------------------------------
// These automatically handle GET /:customerId/inventory and GET /:customerId/users
router.use('/:customerId/divisions', divisionRouter);
router.use('/:customerId/orders', orderRouter);
router.use('/:customerId/inventory', inventoryRouter);
router.use('/:customerId/addresses', addressRouter);
router.use('/:customerId/users', userRouter); 

// ---------------------------------------------------------
// CUSTOMER-SPECIFIC CUSTOM ENDPOINTS
// ---------------------------------------------------------

// Manage Carrier configurations directly on the Customer document
router.route('/:id/carriers')
  .get(getCustomerCarriers)
  .put(restrictTo('admin', 'super_admin', 'manager'), updateCustomerCarriers);

// ---------------------------------------------------------
// STANDARD CRUD ENDPOINTS
// ---------------------------------------------------------

// 2. Base routes accessible by admin, staff, and warehouse
router.route('/')
  .get(getAllCustomers)
  .post(restrictTo('admin', 'super_admin', 'manager'), createCustomer);

router.route('/:id')
  .get(getCustomer)
  .put(restrictTo('admin', 'super_admin', 'manager'), updateCustomer)
  // 3. Chain restrictTo before the controller for sensitive actions
  .delete(restrictTo('admin', 'super_admin'), deleteCustomer);

export default router;