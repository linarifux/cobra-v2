import Address from '../models/Address.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

// @desc    Create a new address
// @route   POST /api/v1/addresses
// @route   POST /api/v1/customers/:customerId/addresses
export const createAddress = catchAsync(async (req, res, next) => {
  if (!req.body.customer && req.params.customerId) {
    req.body.customer = req.params.customerId;
  }

  const address = await Address.create(req.body);

  // Safe object-based syntax to populate relationships upon creation
  await address.populate({ path: 'customer', select: 'customerName contactEmail' });

  res.status(201).json({
    status: 'success',
    data: { address }
  });
});

// @desc    Get all addresses
// @route   GET /api/v1/addresses
// @route   GET /api/v1/customers/:customerId/addresses
export const getAllAddresses = catchAsync(async (req, res, next) => {
  let filter = {};
  if (req.params.customerId) {
    filter = { customer: req.params.customerId };
  }

  const addresses = await Address.find(filter)
    .populate('customer', 'customerName')
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
    .populate('customer', 'customerName');

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
  await address.populate('customer', 'customerName');

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