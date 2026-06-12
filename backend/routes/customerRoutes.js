import express from 'express';
import {
  createCustomer,
  getAllCustomers,
  getCustomer,
  updateCustomer,
  updateCustomerCarriers,
  deleteCustomer
} from '../controllers/customerController.js';

// FIX: Import the correctly named function from the carrier controller
import { getCarriersForCustomer } from '../controllers/carrierController.js'; 

import { protect, restrictTo } from '../middlewares/authMiddleware.js';

import divisionRouter from './divisionRoutes.js';
import inventoryRouter from './inventoryRoutes.js';
import orderRouter from './orderRoutes.js';
import addressRouter from './addressRoutes.js';
// Note: We remove `carrierRouter` from the nested `.use()` redirects below 
// because we are handling the customer's carrier route explicitly on line 31.

const router = express.Router();

// ---------------------------------------------------------
// NESTED ROUTE REDIRECTS
// ---------------------------------------------------------
router.use('/:customerId/divisions', divisionRouter);
router.use('/:customerId/orders', orderRouter);
router.use('/:customerId/inventory', inventoryRouter);
router.use('/:customerId/addresses', addressRouter);

// ---------------------------------------------------------
// CUSTOMER-SPECIFIC CUSTOM ENDPOINTS
// ---------------------------------------------------------

// GET: Fetch the flattened list of allowed active services for a customer (used in Order Portal)
router.route('/:customerId/carriers')
  .get(getCarriersForCustomer);

// PUT: Update the assigned carriers/services array on the Customer document
// (Using :id here to match the standard update pattern)
router.route('/:id/carriers')
  .put(updateCustomerCarriers);


// ---------------------------------------------------------
// STANDARD CRUD ENDPOINTS
// ---------------------------------------------------------

// 1. Require a valid login token for ALL customer routes (Uncomment when auth is active)
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