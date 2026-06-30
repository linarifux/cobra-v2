import Division from '../models/Division.js';
import Carrier from '../models/Carrier.js';
import TypePiece from '../models/TypePiece.js';
import Inventory from '../models/Inventory.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

// @desc    Create a new division
// @route   POST /api/v1/divisions
// @route   POST /api/v1/customers/:customerId/divisions
export const createDivision = catchAsync(async (req, res, next) => {
  // Support nested routing creation
  if (!req.body.customer && req.params.customerId) {
    req.body.customer = req.params.customerId;
  }

  const division = await Division.create(req.body);

  // Populate customer before returning
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
  
  // Support fetching exclusively for one customer
  if (req.params.customerId) {
    filter = { customer: req.params.customerId };
  }

  const divisions = await Division.find(filter)
    .populate('customer', 'customerName contactEmail') 
    .populate({
      path: 'users',
      select: 'name email role portal isActive'
    })
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
    .populate('customer', 'customerName contactEmail')
    .populate({
      path: 'users',
      select: 'name email role portal isActive'
    });

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
  )
  .populate('customer', 'customerName contactEmail')
  .populate({
    path: 'users',
    select: 'name email role portal isActive'
  });

  if (!division) {
    return next(new AppError('No division found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { division }
  });
});

// @desc    Delete a division and cascade delete its scoped assets
// @route   DELETE /api/v1/divisions/:id
export const deleteDivision = catchAsync(async (req, res, next) => {
  // Use findById instead of findByIdAndDelete so we can trigger cleanup logic
  const division = await Division.findById(req.params.id);

  if (!division) {
    return next(new AppError('No division found with that ID', 404));
  }

  // ==========================================
  // CASCADING DELETES (Data Integrity)
  // ==========================================
  // Wipe all resources that were strictly scoped to this specific division 
  // so they don't become orphaned in the database.
  await Carrier.deleteMany({ division: division._id });
  await TypePiece.deleteMany({ division: division._id });
  await Inventory.deleteMany({ division: division._id });
  
  // NOTE: If you have Receiving Logs, Rates, or Orders scoped to this division, 
  // you can add `await Model.deleteMany(...)` for them here as well.

  // Finally, delete the division itself
  await division.deleteOne();

  res.status(204).json({
    status: 'success',
    data: null
  });
});