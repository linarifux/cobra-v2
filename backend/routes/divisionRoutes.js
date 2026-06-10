import express from 'express';
import {
  createDivision,
  getAllDivisions,
  getDivision,
  updateDivision,
  deleteDivision
} from '../controllers/divisionController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

// mergeParams: true allows access to parent router params (like customerId)
const router = express.Router({ mergeParams: true });

// Require a valid login token for ALL division routes
// router.use(protect);

router.route('/')
  .get(getAllDivisions)
  // .post(restrictTo('admin', 'staff'), createDivision);
  .post(createDivision);

router.route('/:id')
  .get(getDivision)
  // .put(restrictTo('admin', 'staff'), updateDivision)
  .put(updateDivision)
  // .delete(restrictTo('admin', 'staff'), deleteDivision);
  .delete(deleteDivision);

export default router;