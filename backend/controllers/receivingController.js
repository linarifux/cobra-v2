import Receiving from '../models/Receiving.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

// @desc    Create a new receiving record
// @route   POST /api/v1/receiving
export const createReceiving = catchAsync(async (req, res, next) => {
  const receiving = await Receiving.create(req.body);

  // You could also add logic here to automatically update the Inventory collection's
  // `unitsOnHand` based on the received `quantity`.

  res.status(201).json({
    status: 'success',
    data: { receiving }
  });
});

// @desc    Get all receiving records
// @route   GET /api/v1/receiving
export const getAllReceiving = catchAsync(async (req, res, next) => {
  const receivingRecords = await Receiving.find()
    .sort({ dateReceived: -1 })
    .populate('customer', 'customerName contactEmail')
    .populate('inventoryItem', 'itemName sku unitCost')
    .populate('location', 'designation storageCategory');

  res.status(200).json({
    status: 'success',
    results: receivingRecords.length,
    data: { receiving: receivingRecords }
  });
});

// @desc    Get a single receiving record by ID
// @route   GET /api/v1/receiving/:id
export const getReceivingById = catchAsync(async (req, res, next) => {
  const receiving = await Receiving.findById(req.params.id)
    .populate('customer', 'customerName contactEmail')
    .populate('inventoryItem', 'itemName sku unitCost')
    .populate('location', 'designation storageCategory');

  if (!receiving) {
    return next(new AppError('No receiving record found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { receiving }
  });
});

// @desc    Update a receiving record
// @route   PUT /api/v1/receiving/:id
export const updateReceiving = catchAsync(async (req, res, next) => {
  let receiving = await Receiving.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!receiving) {
    return next(new AppError('No receiving record found with that ID', 404));
  }

  // Repopulate before sending the response
  receiving = await receiving.populate([
    { path: 'customer', select: 'customerName' },
    { path: 'inventoryItem', select: 'itemName sku' },
    { path: 'location', select: 'designation' }
  ]);

  res.status(200).json({
    status: 'success',
    data: { receiving }
  });
});

// @desc    Delete a receiving record
// @route   DELETE /api/v1/receiving/:id
export const deleteReceiving = catchAsync(async (req, res, next) => {
  const receiving = await Receiving.findByIdAndDelete(req.params.id);

  if (!receiving) {
    return next(new AppError('No receiving record found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});