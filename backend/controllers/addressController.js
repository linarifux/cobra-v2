import Address from '../models/Address.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

// @desc    Create a new address
// @route   POST /api/v1/addresses
// @route   POST /api/v1/users/:userId/addresses
export const createAddress = catchAsync(async (req, res, next) => {
  // Support nested routing for user boundaries
  if (!req.body.user && req.params.userId) {
    req.body.user = req.params.userId;
  }

  const address = await Address.create(req.body);

  // Safe object-based syntax to populate relationships upon creation
  await address.populate({ path: 'user', select: 'firstName lastName email portal' });

  res.status(201).json({
    status: 'success',
    data: { address }
  });
});

// @desc    Get all addresses
// @route   GET /api/v1/addresses
// @route   GET /api/v1/users/:userId/addresses
export const getAllAddresses = catchAsync(async (req, res, next) => {
  let filter = {};
  
  // Support nested routing to scope addresses to a specific user
  if (req.params.userId) {
    filter = { user: req.params.userId };
  }

  const addresses = await Address.find(filter)
    .populate('user', 'firstName lastName email')
    .sort('-isDefault -createdAt'); // Show defaults first, then newest

  res.status(200).json({
    status: 'success',
    results: addresses.length,
    data: { addresses }
  });
});

// @desc    Get a single address by ID
// @route   GET /api/v1/addresses/:id
export const getAddressById = catchAsync(async (req, res, next) => {
  const address = await Address.findById(req.params.id)
    .populate('user', 'firstName lastName email');

  if (!address) {
    return next(new AppError('No address found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { address }
  });
});

// @desc    Update an address
// @route   PUT /api/v1/addresses/:id
export const updateAddress = catchAsync(async (req, res, next) => {
  const address = await Address.findById(req.params.id);

  if (!address) {
    return next(new AppError('No address found with that ID', 404));
  }

  // Use Object.assign and .save() so the pre-save hook triggers for isDefault logic
  Object.assign(address, req.body);
  await address.save();
  await address.populate('user', 'firstName lastName email');

  res.status(200).json({
    status: 'success',
    data: { address }
  });
});

// @desc    Delete an address
// @route   DELETE /api/v1/addresses/:id
export const deleteAddress = catchAsync(async (req, res, next) => {
  const address = await Address.findByIdAndDelete(req.params.id);

  if (!address) {
    return next(new AppError('No address found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});