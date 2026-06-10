import Division from '../models/Division.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

// @desc    Create a new division
// @route   POST /api/v1/divisions
// @route   POST /api/v1/customers/:customerId/divisions
export const createDivision = catchAsync(async (req, res, next) => {
  if (!req.body.customer && req.params.customerId) {
    req.body.customer = req.params.customerId;
  }

  const division = await Division.create(req.body);

  // FIX: Explicitly populate the customer field before returning the new division
  await division.populate('customer', 'customerName contactEmail');

  res.status(201).json({
    status: 'success',
    data: { division }
  });
});

// @desc    Get all divisions
// @route   GET /api/v1/divisions
// @route   GET /api/v1/customers/:customerId/divisions
export const getAllDivisions = catchAsync(async (req, res, next) => {
  let filter = {};
  if (req.params.customerId) {
    filter = { customer: req.params.customerId };
  }

  const divisions = await Division.find(filter)
    .populate('customer', 'customerName contactEmail') 
    .sort('divisionName');

  res.status(200).json({
    status: 'success',
    results: divisions.length,
    data: { divisions }
  });
});

// @desc    Get a single division by ID
// @route   GET /api/v1/divisions/:id
export const getDivision = catchAsync(async (req, res, next) => {
  const division = await Division.findById(req.params.id)
    .populate('customer', 'customerName contactEmail');

  if (!division) {
    return next(new AppError('No division found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { division }
  });
});

// @desc    Update a division
// @route   PUT /api/v1/divisions/:id
export const updateDivision = catchAsync(async (req, res, next) => {
  const division = await Division.findByIdAndUpdate(
    req.params.id, 
    req.body, 
    {
      new: true,
      runValidators: true 
    }
  ).populate('customer', 'customerName contactEmail');

  if (!division) {
    return next(new AppError('No division found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { division }
  });
});

// @desc    Delete a division
// @route   DELETE /api/v1/divisions/:id
export const deleteDivision = catchAsync(async (req, res, next) => {
  const division = await Division.findByIdAndDelete(req.params.id);

  if (!division) {
    return next(new AppError('No division found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});