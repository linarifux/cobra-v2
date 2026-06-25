import Receiving from '../models/Receiving.js';
import Inventory from '../models/Inventory.js'; // MUST IMPORT INVENTORY MODEL
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

// @desc    Create a new receiving record
// @route   POST /api/v1/receiving
export const createReceiving = catchAsync(async (req, res, next) => {
  let receiving = await Receiving.create(req.body);

  // 1. UPDATE INVENTORY ALONG WITH AUDIT LEDGER
  const inventoryItem = await Inventory.findById(receiving.inventoryItem);
  
  if (inventoryItem) {
    inventoryItem.available += receiving.quantity;
    inventoryItem.unitsOnHand += receiving.quantity; // Keep internal fallback synced
    inventoryItem.qtyLastReceived = receiving.quantity;
    inventoryItem.dateLastReceived = receiving.dateReceived || Date.now();
    
    // Push the event to the embedded ledger
    inventoryItem.auditLedger.push({
      event: 'Inbound Receipt',
      referenceId: receiving.receivingId,
      quantityDelta: receiving.quantity
    });

    await inventoryItem.save();
  }

  // Populate the document before sending it back so the React 
  // frontend can immediately display the names without a hard refresh.
  receiving = await receiving.populate([
    { path: 'customer', select: 'customerName' },
    { 
      path: 'inventoryItem', 
      select: 'itemName description sku productCode division category1 category2 category3 typePiece',
      populate: [
        { path: 'division', select: 'divisionName' },
        { path: 'category1', select: 'categoryName' },
        { path: 'category2', select: 'categoryName' },
        { path: 'category3', select: 'categoryName' }
      ]
    },
    { path: 'locations', select: 'designation storageCategory' }
  ]);

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
    .populate({
      path: 'inventoryItem',
      select: 'itemName description sku productCode unitCost price division category1 category2 category3 typePiece',
      populate: [
        { path: 'division', select: 'divisionName' },
        { path: 'category1', select: 'categoryName' },
        { path: 'category2', select: 'categoryName' },
        { path: 'category3', select: 'categoryName' }
      ]
    })
    .populate('locations', 'designation storageCategory');

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
    .populate({
      path: 'inventoryItem',
      select: 'itemName description sku productCode unitCost price division category1 category2 category3 typePiece',
      populate: [
        { path: 'division', select: 'divisionName' },
        { path: 'category1', select: 'categoryName' },
        { path: 'category2', select: 'categoryName' },
        { path: 'category3', select: 'categoryName' }
      ]
    })
    .populate('locations', 'designation storageCategory');

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
  // 1. Fetch the OLD record first so we can calculate the difference
  let receiving = await Receiving.findById(req.params.id);
  if (!receiving) {
    return next(new AppError('No receiving record found with that ID', 404));
  }

  const oldQuantity = receiving.quantity;
  const oldInventoryId = receiving.inventoryItem.toString();

  // 2. Apply updates and save (Using .save() instead of findByIdAndUpdate ensures the Receiving model's pre-save math hooks execute correctly)
  Object.keys(req.body).forEach(key => {
    receiving[key] = req.body[key];
  });
  await receiving.save();

  const newQuantity = receiving.quantity;
  const newInventoryId = receiving.inventoryItem.toString();

  // 3. INVENTORY SYNC LOGIC
  if (oldInventoryId === newInventoryId) {
    // SCENARIO A: The quantity changed, but the item is the same
    const delta = newQuantity - oldQuantity;
    
    if (delta !== 0) {
      const inventoryItem = await Inventory.findById(newInventoryId);
      if (inventoryItem) {
        inventoryItem.available += delta;
        inventoryItem.unitsOnHand += delta;
        inventoryItem.auditLedger.push({
          event: 'Receipt Modification',
          referenceId: receiving.receivingId,
          quantityDelta: delta
        });
        await inventoryItem.save();
      }
    }
  } else {
    // SCENARIO B: The user changed which item was received entirely
    // Remove quantity from the old item
    const oldInv = await Inventory.findById(oldInventoryId);
    if (oldInv) {
      oldInv.available -= oldQuantity;
      oldInv.unitsOnHand -= oldQuantity;
      oldInv.auditLedger.push({
        event: 'Receipt Reassigned (Removed)',
        referenceId: receiving.receivingId,
        quantityDelta: -oldQuantity
      });
      await oldInv.save();
    }
    // Add quantity to the new item
    const newInv = await Inventory.findById(newInventoryId);
    if (newInv) {
      newInv.available += newQuantity;
      newInv.unitsOnHand += newQuantity;
      newInv.qtyLastReceived = newQuantity;
      newInv.dateLastReceived = receiving.dateReceived || Date.now();
      newInv.auditLedger.push({
        event: 'Receipt Reassigned (Added)',
        referenceId: receiving.receivingId,
        quantityDelta: newQuantity
      });
      await newInv.save();
    }
  }

  // 4. Repopulate before sending the response to keep the UI in sync
  receiving = await receiving.populate([
    { path: 'customer', select: 'customerName' },
    { 
      path: 'inventoryItem', 
      select: 'itemName description sku productCode division category1 category2 category3 typePiece',
      populate: [
        { path: 'division', select: 'divisionName' },
        { path: 'category1', select: 'categoryName' },
        { path: 'category2', select: 'categoryName' },
        { path: 'category3', select: 'categoryName' }
      ]
    },
    { path: 'locations', select: 'designation storageCategory' }
  ]);

  res.status(200).json({
    status: 'success',
    data: { receiving }
  });
});

// @desc    Delete a receiving record
// @route   DELETE /api/v1/receiving/:id
export const deleteReceiving = catchAsync(async (req, res, next) => {
  const receiving = await Receiving.findById(req.params.id);

  if (!receiving) {
    return next(new AppError('No receiving record found with that ID', 404));
  }

  // 1. REVERSE INVENTORY QUANTITY
  const inventoryItem = await Inventory.findById(receiving.inventoryItem);
  if (inventoryItem) {
    inventoryItem.available -= receiving.quantity;
    inventoryItem.unitsOnHand -= receiving.quantity;
    inventoryItem.auditLedger.push({
      event: 'Receipt Deleted / Reversed',
      referenceId: receiving.receivingId,
      quantityDelta: -receiving.quantity
    });
    await inventoryItem.save();
  }

  // 2. Delete the record
  await Receiving.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null
  });
});