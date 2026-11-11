import express from 'express';
import {
    syncAllOrdersBackground,
    getRecordMetadata,
    getSalesOrdersByLocation,
    getAllOrders, // <-- Import the new function
    getAllRecords,
    getRecordById,
    createRecord,
    updateRecord,
    deleteRecord
} from '../controllers/netsuiteController.js';

const router = express.Router();

/**
 * @route   GET /api/netsuite/sync/sales-orders
 * @desc    Triggers a background process to sync all NetSuite Sales Orders to MongoDB
 * @access  Private
 */
router.get('/sync/sales-orders', syncAllOrdersBackground);

/**
 * @route   GET /api/netsuite/metadata/:recordType
 * @desc    Get OpenAPI/Swagger Schema mapping for a record type
 * @access  Private
 */
router.get('/metadata/:recordType', getRecordMetadata);

/**
 * @route   GET /api/netsuite/salesOrder/location/:locationId
 * @desc    Get all Sales Orders strictly filtered by a location/warehouse ID
 * @access  Private
 */
router.get('/salesOrder/location/:locationId', getSalesOrdersByLocation);

/**
 * @route   GET /api/netsuite/orders
 * @desc    Get combined Sales Orders and Transfer Orders (SuiteQL)
 * @access  Private
 */
router.get('/orders', getAllOrders);


// =====================================================================
// GENERIC WILDCARD ROUTES (Must ALWAYS be at the bottom of the file)
// =====================================================================

/**
 * @route   GET /api/netsuite/:recordType
 * @desc    Get all records of a generic REST type (e.g., customer)
 * @access  Private
 */
router.get('/:recordType', getAllRecords);

/**
 * @route   GET /api/netsuite/:recordType/:id
 * @desc    Get a single record by its NetSuite Internal ID
 * @access  Private
 */
router.get('/:recordType/:id', getRecordById);

/**
 * @route   POST /api/netsuite/:recordType
 * @desc    Create a new record in NetSuite
 * @access  Private
 */
router.post('/:recordType', createRecord);

/**
 * @route   PATCH /api/netsuite/:recordType/:id
 * @desc    Update an existing record (Partial update)
 * @access  Private
 */
router.patch('/:recordType/:id', updateRecord);

/**
 * @route   DELETE /api/netsuite/:recordType/:id
 * @desc    Delete a record from NetSuite
 * @access  Private
 */
router.delete('/:recordType/:id', deleteRecord);

export default router;