import express from 'express';
import {
  createCarrier,
  getAllCarriers,
  getCarrierById,
  updateCarrier,
  deleteCarrier
} from '../controllers/carrierController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true });

// Require valid JWT authentication for all carrier routes
// router.use(protect);

// Restrict ALL integration settings strictly to Administrators
// router.use(restrictTo('admin')); 

router.route('/')
  .get(getAllCarriers)
  .post(createCarrier);

router.route('/:id')
  .get(getCarrierById)
  .put(updateCarrier)
  .delete(deleteCarrier);

export default router;