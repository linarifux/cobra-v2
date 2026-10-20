import express from 'express';
import {
  createCarrier,
  getAllCarriers,
  getCarrierById,
  updateCarrier,
  deleteCarrier
} from '../controllers/carrierController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

// ==========================================
// ROUTER SETUP
// ==========================================
// CRITICAL: mergeParams: true allows this router to access parameters from the parent router.
// Because this is mounted in divisionRoutes as `/:divisionId/carriers`, 
// we can access `req.params.divisionId` inside our carrier controllers.
const router = express.Router({ mergeParams: true });

// ==========================================
// AUTHENTICATION & AUTHORIZATION
// ==========================================
// Require valid JWT authentication for all carrier routes
// UNCOMMENT IN PRODUCTION
// router.use(protect);

// Restrict ALL integration settings strictly to Administrators
// UNCOMMENT IN PRODUCTION
// router.use(restrictTo('admin')); 

// ==========================================
// CARRIER ROUTES
// ==========================================

router.route('/')
  // GET /api/v1/carriers (All Global) 
  // GET /api/v1/divisions/:divisionId/carriers (Division Specific)
  .get(getAllCarriers)
  
  // POST /api/v1/carriers
  // POST /api/v1/divisions/:divisionId/carriers
  .post(createCarrier);

router.route('/:id')
  // GET, PUT, DELETE /api/v1/carriers/:id
  // GET, PUT, DELETE /api/v1/divisions/:divisionId/carriers/:id
  .get(getCarrierById)
  .put(updateCarrier)
  .delete(deleteCarrier);

export default router;