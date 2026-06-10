import express from 'express';
import {
  createDivision,
  getAllDivisions,
  getDivision,
  updateDivision,
  deleteDivision
} from '../controllers/divisionController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Require a valid login token for ALL division routes
// router.use(protect);

router.route('/')
  .get(getAllDivisions)
  // Example: Only admins and staff can create new divisions
  // .post(restrictTo('admin', 'staff'), createDivision);
  .post(createDivision);

router.route('/:id')
  .get(getDivision)
  // .put(restrictTo('admin', 'staff'), updateDivision)
  .put(updateDivision)
  .delete(restrictTo('admin', 'staff'), deleteDivision);

export default router;