import express from 'express';
import { fetchLiveRates, fetchWarehouses, fetchCarriers, generateOrderLabel } from '../controllers/shipStationController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All ShipStation routes require authentication
router.use(protect);

// Get all warehouses
router.route('/warehouses')
    .get(fetchWarehouses);


// Get all Carriers
router.route('/carriers')
    .get(fetchCarriers);

// Rate Fetching
// POST route to accept live frontend data
// Customer-Facing Checkout Rates (Protected but NOT restricted to admin/staff)
router.post('/rates/live', fetchLiveRates);


// Label Generation (Admin/Staff only)
router.post('/label/:orderId', restrictTo('admin', 'super_admin'), generateOrderLabel);

export default router;