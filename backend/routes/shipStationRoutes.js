import express from 'express';
import { 
    fetchLiveRates, 
    getCheckoutRates,
    fetchWarehouses, 
    fetchCarriers, 
    generateOrderLabel,
    createOrderShipment,
    downloadOrderLabel,
    voidOrderLabel,
    cancelOrderShipment,
    fetchCarrierPackages
} from '../controllers/shipStationController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All ShipStation routes require authentication
router.use(protect);

// Get all warehouses & carriers
router.route('/warehouses').get(fetchWarehouses);
router.route('/carriers').get(fetchCarriers);
router.route('/carriers/:carrierId/packages').get(fetchCarrierPackages);

// --- Rate Fetching ---
// POST route to accept live frontend data
router.post('/rates/live', fetchLiveRates);
router.post('/checkout/rates', getCheckoutRates);

// --- Fulfillment & Logistics ---
// Restrict to admins and staff members
router.post('/label/:orderId', restrictTo('admin', 'super_admin', 'staff'), generateOrderLabel);
router.post('/shipments/:orderId', restrictTo('admin', 'super_admin', 'staff'), createOrderShipment);

// View/Download/Cancel/Void operations
router.get('/labels/download/:orderId', restrictTo('admin', 'super_admin', 'staff'), downloadOrderLabel);
router.put('/labels/void/:orderId', restrictTo('admin', 'super_admin', 'staff'), voidOrderLabel);
router.put('/shipments/cancel/:orderId', restrictTo('admin', 'super_admin', 'staff'), cancelOrderShipment);

export default router;