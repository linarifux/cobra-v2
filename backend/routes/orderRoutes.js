import express from 'express';
import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder
} from '../controllers/orderController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

// mergeParams: true allows fetching orders under a specific customer route if needed
const router = express.Router({ mergeParams: true });

// Require authentication for all order routes
router.use(protect);

router.route('/')
  .get(getAllOrders)
  // E.g., Only admins and office staff can generate new B2B orders
  .post(restrictTo('admin', 'staff'), createOrder);

router.route('/:id')
  .get(getOrderById)
  // Warehouse staff can update statuses/tracking
  .put(restrictTo('admin', 'staff', 'warehouse'), updateOrder)
  // Only admins can delete orders
  .delete(restrictTo('admin'), deleteOrder);

export default router;