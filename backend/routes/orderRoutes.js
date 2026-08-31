import express from 'express';
import {
  createOrder,
  getAllOrders,
  getOrder,
  updateOrder,
  deleteOrder,
  getOrdersByUserId
} from '../controllers/orderController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

// mergeParams: true allows access to :customerId or :divisionId from nested parent routes
const router = express.Router({ mergeParams: true });

// Enforce authentication for all order operations
router.use(protect);

router.route('/')
  .get(getAllOrders)
  .post(createOrder); 

router.route('/:id')
  .get(getOrder)
  .put(updateOrder)
  .delete(restrictTo('admin', 'super_admin', 'staff'), deleteOrder); 

router.get('/user/:userId', protect, getOrdersByUserId);

export default router;