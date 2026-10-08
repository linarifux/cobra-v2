import express from 'express';
import {
    getAllRecords,
    getRecordById,
    createRecord,
    updateRecord,
    deleteRecord
} from '../controllers/netsuiteController.js';

const router = express.Router();

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