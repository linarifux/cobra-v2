import express from 'express';
import {
  createOrder,
  getAllOrders,
  getOrder,
  updateOrder,
  deleteOrder
} from '../controllers/orderController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

// mergeParams: true allows access to :customerId from nested customerRoutes
const router = express.Router({ mergeParams: true });

// Uncomment when auth is ready
// router.use(protect);

router.route('/')
  .get(getAllOrders)
  .post(createOrder);

router.route('/:id')
  .get(getOrder)
  .put(updateOrder)
  .delete(restrictTo('admin', 'staff'), deleteOrder);

export default router;