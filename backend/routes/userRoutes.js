import express from 'express';
import {
  createUser,
  getAllUsers,
  updateUser,
  deleteUser
} from '../controllers/userController.js';
import { protect, requirePortal, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true }); // Merge params to access :customerId in nested routes

// ALL user management requires the user to be logged in
router.use(protect);

// ALL user management requires the user to be on the ADMIN portal
router.use(requirePortal('admin'));

// Admin & Super Admin can view, create, and update
router.route('/')
  .get(restrictTo('super_admin', 'admin'), getAllUsers)
  .post(restrictTo('super_admin', 'admin'), createUser);

router.route('/:id')
  .put(restrictTo('super_admin', 'admin'), updateUser)
  // ONLY Super Admin can delete
  .delete(restrictTo('super_admin'), deleteUser);

export default router;