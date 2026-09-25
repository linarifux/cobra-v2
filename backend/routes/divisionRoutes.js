import express from 'express';
import multer from 'multer';
import {
  createDivision,
  getAllDivisions,
  getDivision,
  updateDivision,
  deleteDivision,
  uploadDivisionLogo // <-- NEW
} from '../controllers/divisionController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

// Nested Route Imports
import carrierRouter from './carrierRoutes.js';
import typePieceRouter from './typePieceRoutes.js';
import inventoryRouter from './inventoryRoutes.js'; 

const router = express.Router({ mergeParams: true });

// Setup multer memory storage (stores file in memory buffer instead of disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB Limit
});

// ==========================================
// 1. NESTED ROUTE DELEGATION
// ==========================================
router.use('/:divisionId/carriers', carrierRouter);
router.use('/:divisionId/type-pieces', typePieceRouter);
router.use('/:divisionId/inventories', inventoryRouter); 

// ==========================================
// 2. AUTHENTICATION & AUTHORIZATION
// ==========================================
router.use(protect);

// ==========================================
// 3. CORE DIVISION ROUTES
// ==========================================
router
  .route('/')
  .get(restrictTo('admin', 'super_admin', 'standard', 'super_user', 'manager'), getAllDivisions)
  .post(restrictTo('admin', 'super_admin'), createDivision);

router
  .route('/:id')
  .get(restrictTo('admin', 'super_admin', 'standard', 'super_user', 'manager'), getDivision)
  .put(restrictTo('admin', 'super_admin'), updateDivision)
  .delete(restrictTo('admin', 'super_admin'), deleteDivision);

// --- NEW MEDIA UPLOAD ROUTE ---
router
  .route('/:id/logo')
  .put(restrictTo('admin', 'super_admin'), upload.single('logo'), uploadDivisionLogo);

export default router;