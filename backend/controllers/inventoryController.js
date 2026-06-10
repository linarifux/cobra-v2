import Inventory from '../models/Inventory.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

// @desc    Create new inventory item
// @route   POST /api/v1/inventory
// @route   POST /api/v1/customers/:customerId/inventory
export const createInventory = catchAsync(async (req, res, next) => {
  // Support nested routing for specific customers
  if (!req.body.customer && req.params.customerId) {
    req.body.customer = req.params.customerId;
  }

  // Automatically inject the initial baseline ledger entry if stock is provided
  if (req.body.unitsOnHand > 0 && (!req.body.auditLedger || req.body.auditLedger.length === 0)) {
    req.body.auditLedger = [{
      event: 'Baseline Audit Intake',
      referenceId: `SYS-REC-${req.body.sku}`,
      quantityDelta: req.body.unitsOnHand
    }];
  }

  const inventory = await Inventory.create(req.body);

  // Populate relational data before sending back
  await inventory.populate([
    { path: 'customer', select: 'customerName' },
    { path: 'divisions', select: 'divisionName divisionCode' },
    { path: 'categories', select: 'categoryName hierarchyDepth' }
  ]);

  res.status(201).json({
    status: 'success',
    data: { inventory }
  });
});

// @desc    Get all inventory
// @route   GET /api/v1/inventory
// @route   GET /api/v1/customers/:customerId/inventory
export const getAllInventory = catchAsync(async (req, res, next) => {
  let filter = {};
  if (req.params.customerId) {
    filter = { customer: req.params.customerId };
  }

  const inventory = await Inventory.find(filter)
    .populate('customer', 'customerName')
    .populate('divisions', 'divisionName')
    .populate('categories', 'categoryName')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: inventory.length,
    data: { inventory }
  });
});

// @desc    Get single inventory item by ID
// @route   GET /api/v1/inventory/:id
export const getInventoryById = catchAsync(async (req, res, next) => {
  const inventory = await Inventory.findById(req.params.id)
    .populate('customer', 'customerName contactEmail')
    .populate('divisions', 'divisionName divisionCode')
    .populate('categories', 'categoryName');

  if (!inventory) {
    return next(new AppError('No inventory item found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { inventory }
  });
});

// @desc    Update inventory item
// @route   PUT /api/v1/inventory/:id
export const updateInventory = catchAsync(async (req, res, next) => {
  // If the update includes a stock change, we append to the ledger
  const inventoryToUpdate = await Inventory.findById(req.params.id);
  
  if (!inventoryToUpdate) {
    return next(new AppError('No inventory item found with that ID', 404));
  }

  // Handle manual stock adjustments pushing to the ledger
  if (req.body.unitsOnHand !== undefined && req.body.unitsOnHand !== inventoryToUpdate.unitsOnHand) {
    const delta = req.body.unitsOnHand - inventoryToUpdate.unitsOnHand;
    
    inventoryToUpdate.auditLedger.push({
      event: req.body.updateReason || 'Manual Adjustment',
      referenceId: req.body.updateReference || `ADJ-${Date.now().toString().slice(-6)}`,
      quantityDelta: delta
    });
    
    inventoryToUpdate.lastAuditedAt = Date.now();
    if (req.user && req.user.name) {
      inventoryToUpdate.lastAuditedBy = req.user.name;
    }
  }

  // Update other fields natively
  Object.assign(inventoryToUpdate, req.body);
  await inventoryToUpdate.save();

  await inventoryToUpdate.populate([
    { path: 'customer', select: 'customerName' },
    { path: 'divisions', select: 'divisionName' },
    { path: 'categories', select: 'categoryName' }
  ]);

  res.status(200).json({
    status: 'success',
    data: { inventory: inventoryToUpdate }
  });
});

// @desc    Delete inventory item
// @route   DELETE /api/v1/inventory/:id
export const deleteInventory = catchAsync(async (req, res, next) => {
  const inventory = await Inventory.findByIdAndDelete(req.params.id);

  if (!inventory) {
    return next(new AppError('No inventory item found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});