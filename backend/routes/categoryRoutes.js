import express from 'express';
import {
  createCategory,
  getAllCategories,
  getCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

// mergeParams: true allows access to parent router params (like divisionId)
const router = express.Router({ mergeParams: true });

// Protect all category routes via JWT
// router.use(protect);

router.route('/')
  .get(getAllCategories)
//   .post(restrictTo('admin', 'staff'), createCategory);
    .post(createCategory);

router.route('/:id')
  .get(getCategory)
  .put(restrictTo('admin', 'staff'), updateCategory)
  .delete(restrictTo('admin', 'staff'), deleteCategory);

export default router;