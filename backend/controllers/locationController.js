import Location from '../models/Location.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

// @desc    Create a new warehouse location
// @route   POST /api/v1/locations
export const createLocation = catchAsync(async (req, res, next) => {
  const location = await Location.create(req.body);

  res.status(201).json({
    status: 'success',
    data: { location }
  });
});

// @desc    Get all locations
// @route   GET /api/v1/locations
export const getAllLocations = catchAsync(async (req, res, next) => {
  // CRITICAL: Populate the nested inventory reference so the frontend 
  // gets the SKU and Item Name, not just an unreadable ID.
  const locations = await Location.find()
    .sort('designation')
    .populate({
      path: 'assignedMaterials.inventory',
      select: 'itemName sku unitCost unitsOnHand'
    });

  res.status(200).json({
    status: 'success',
    results: locations.length,
    data: { locations }
  });
});

// @desc    Get a single location by ID
// @route   GET /api/v1/locations/:id
export const getLocationById = catchAsync(async (req, res, next) => {
  const location = await Location.findById(req.params.id)
    .populate({
      path: 'assignedMaterials.inventory',
      select: 'itemName sku unitCost unitsOnHand'
    });

  if (!location) {
    return next(new AppError('No location found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { location }
  });
});

// @desc    Update a location (and its assigned materials)
// @route   PUT /api/v1/locations/:id
export const updateLocation = catchAsync(async (req, res, next) => {
  let location = await Location.findByIdAndUpdate(
    req.params.id, 
    req.body, 
    {
      new: true,
      runValidators: true 
    }
  );

  if (!location) {
    return next(new AppError('No location found with that ID', 404));
  }

  // --- SMART CAPACITY AUTO-TOGGLE ---
  // Calculate current usage safely
  const currentUsage = location.assignedMaterials?.reduce((sum, item) => sum + item.allocatedQty, 0) || 0;
  let statusChanged = false;

  if (currentUsage >= location.maxStorageUnits && location.status === 'Active') {
    location.status = 'At Capacity';
    statusChanged = true;
  } else if (currentUsage < location.maxStorageUnits && location.status === 'At Capacity') {
    // Automatically revert to Active if items are removed
    location.status = 'Active'; 
    statusChanged = true;
  }

  if (statusChanged) {
    await location.save();
  }

  // Repopulate the updated document before sending it back to the client
  location = await location.populate({
    path: 'assignedMaterials.inventory',
    select: 'itemName sku unitCost'
  });

  res.status(200).json({
    status: 'success',
    data: { location }
  });
});

// @desc    Delete a location
// @route   DELETE /api/v1/locations/:id
export const deleteLocation = catchAsync(async (req, res, next) => {
  const location = await Location.findByIdAndDelete(req.params.id);

  if (!location) {
    return next(new AppError('No location found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});