import express from 'express';
import {
    syncAllOrdersBackground,
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
 * 
 * IMPORTANT: This specific route MUST come before the /:recordType wildcard route!
 */
router.get('/sync/sales-orders', syncAllOrdersBackground);

/**
 * @route   GET /api/netsuite/:recordType
 * @desc    Get all records of a specific type (e.g., salesOrder, customer)
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