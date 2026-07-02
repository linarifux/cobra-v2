import express from 'express';
import {
  createDivision,
  getAllDivisions,
  getDivision,
  updateDivision,
  deleteDivision
} from '../controllers/divisionController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

// Nested Route Imports
import carrierRouter from './carrierRoutes.js';
import typePieceRouter from './typePieceRoutes.js';
import inventoryRouter from './inventoryRoutes.js'; // <-- NEW: Import inventory router

// mergeParams: true allows access to parent router params (like customerId from customerRoutes)
const router = express.Router({ mergeParams: true });

// ==========================================
// 1. NESTED ROUTE DELEGATION
// ==========================================
// Re-route requests to specific sub-resources to their respective routers.
// E.g., GET /api/v1/divisions/123/carriers --> handled by carrierRoutes.js
router.use('/:divisionId/carriers', carrierRouter);
router.use('/:divisionId/type-pieces', typePieceRouter);
router.use('/:divisionId/inventories', inventoryRouter); 



// ==========================================
// 2. AUTHENTICATION & AUTHORIZATION
// ==========================================
// Require a valid login token for ALL division routes
// UNCOMMENT IN PRODUCTION
router.use(protect);

// ==========================================
// 3. CORE DIVISION ROUTES
// ==========================================
router
  .route('/')
  .get(restrictTo('admin', 'super_admin', 'standard', 'super_user', 'manager'), getAllDivisions)
  // .get(getAllDivisions)
  // UNCOMMENT IN PRODUCTION
  .post(restrictTo('admin', 'super_admin'), createDivision);
  // .post(createDivision);

router
  .route('/:id')
  .get(restrictTo('admin', 'super_admin', 'standard', 'super_user', 'manager'), getDivision)
  // .get(getDivision)
  // UNCOMMENT IN PRODUCTION
  .put(restrictTo('admin', 'super_admin'), updateDivision)
  // .put(updateDivision)
  // UNCOMMENT IN PRODUCTION
  .delete(restrictTo('admin', 'super_admin'), deleteDivision);
  // .delete(deleteDivision);

export default router;