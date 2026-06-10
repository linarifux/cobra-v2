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
  const locations = await Location.find().sort('designation');

  res.status(200).json({
    status: 'success',
    results: locations.length,
    data: { locations }
  });
});

// @desc    Get a single location by ID
// @route   GET /api/v1/locations/:id
export const getLocationById = catchAsync(async (req, res, next) => {
  const location = await Location.findById(req.params.id);

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
  // If the update causes usage to exceed maxStorageUnits, you could add validation here
  const location = await Location.findByIdAndUpdate(
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

  // Optional: Auto-update status if At Capacity
  const currentUsage = location.assignedMaterials.reduce((sum, item) => sum + item.allocatedQty, 0);
  if (currentUsage >= location.maxStorageUnits && location.status === 'Active') {
    location.status = 'At Capacity';
    await location.save();
  }

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