import express from 'express';
import {
  createCustomer,
  getAllCustomers,
  getCustomer,
  updateCustomer,
  updateCustomerCarriers,
  deleteCustomer
} from '../controllers/customerController.js';

import { getCarriersForCustomer } from '../controllers/carrierController.js'; 
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

import divisionRouter from './divisionRoutes.js';
import inventoryRouter from './inventoryRoutes.js';
import orderRouter from './orderRoutes.js';
import addressRouter from './addressRoutes.js';
import userRouter from './userRoutes.js'; // <-- NEW: Import User Router

const router = express.Router();


// ---------------------------------------------------------
// NESTED ROUTE REDIRECTS
// ---------------------------------------------------------
router.use('/:customerId/divisions', divisionRouter);
router.use('/:customerId/orders', orderRouter);
router.use('/:customerId/inventory', inventoryRouter);
router.use('/:customerId/addresses', addressRouter);
router.use('/:customerId/users', userRouter); 

// ---------------------------------------------------------
// CUSTOMER-SPECIFIC CUSTOM ENDPOINTS
// ---------------------------------------------------------

// GET: Fetch the flattened list of allowed active services for a customer
router.route('/:customerId/carriers')
  .get(getCarriersForCustomer);

// PUT: Update the assigned carriers/services array on the Customer document
router.route('/:id/carriers')
  .put(updateCustomerCarriers);


// ---------------------------------------------------------
// STANDARD CRUD ENDPOINTS
// ---------------------------------------------------------

// 1. Require a valid login token for ALL customer routes (Uncomment when auth is active)
router.use(protect); 

// 2. Base routes accessible by admin, staff, and warehouse
router.route('/')
  .get(getAllCustomers)
  .post(createCustomer);

router.route('/:id')
  .get(getCustomer)
  .put(updateCustomer)
  // 3. Chain restrictTo before the controller for sensitive actions
  .delete(restrictTo('admin', 'super_admin'), deleteCustomer);

export default router;