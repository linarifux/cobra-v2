import express from 'express';
import { fetchLiveRates, fetchWarehouses, fetchCarriers } from '../controllers/shipStationController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All ShipStation routes require authentication
// router.use(protect);

// Get all warehouses
router.route('/warehouses')
    .get(fetchWarehouses);


// Get all Carriers
router.route('/carriers')
    .get(fetchCarriers);

// Rate Fetching
// POST route to accept live frontend data
router.post('/rates/live', restrictTo('admin', 'staff'), fetchLiveRates);

export default router;