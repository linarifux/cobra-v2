import express from 'express';
import {
  fetchLiveShipStationFreightProviders,
  getConfiguredFreightProviders,
  addFreightProvider,
  updateFreightProvider,
  deleteFreightProvider
} from '../controllers/freightProviderController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Uncomment when ready to enforce authentication globally on these routes
router.use(protect);

// 1. LIVE API Call to ShipStation
router.get('/live', fetchLiveShipStationFreightProviders);

// 2. Database CRUD Operations
router
  .route('/')
  .get(getConfiguredFreightProviders)
  .post(restrictTo('admin', 'super_admin'), addFreightProvider);

router
  .route('/:id')
  .put(restrictTo('admin', 'super_admin'), updateFreightProvider)
  .delete(restrictTo('admin', 'super_admin'), deleteFreightProvider);

export default router;