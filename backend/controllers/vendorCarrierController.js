import VendorCarrier from '../models/VendorCarrier.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

// @desc    Get all vendor carriers
// @route   GET /api/v1/vendor-carriers
export const getVendorCarriers = catchAsync(async (req, res, next) => {
  const carriers = await VendorCarrier.find().sort('carrierName');
  res.status(200).json({ status: 'success', results: carriers.length, data: { vendorCarriers: carriers } });
});

// @desc    Get a single vendor carrier
// @route   GET /api/v1/vendor-carriers/:id
export const getVendorCarrier = catchAsync(async (req, res, next) => {
  const carrier = await VendorCarrier.findById(req.params.id);
  if (!carrier) return next(new AppError('No vendor carrier found with that ID', 404));
  res.status(200).json({ status: 'success', data: { vendorCarrier: carrier } });
});

// @desc    Create new vendor carrier
// @route   POST /api/v1/vendor-carriers
export const createVendorCarrier = catchAsync(async (req, res, next) => {
  const newCarrier = await VendorCarrier.create(req.body);
  res.status(201).json({ status: 'success', data: { vendorCarrier: newCarrier } });
});

// @desc    Update a vendor carrier
// @route   PUT /api/v1/vendor-carriers/:id
export const updateVendorCarrier = catchAsync(async (req, res, next) => {
  const carrier = await VendorCarrier.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  if (!carrier) return next(new AppError('No vendor carrier found with that ID', 404));
  res.status(200).json({ status: 'success', data: { vendorCarrier: carrier } });
});

// @desc    Delete a vendor carrier
// @route   DELETE /api/v1/vendor-carriers/:id
export const deleteVendorCarrier = catchAsync(async (req, res, next) => {
  const carrier = await VendorCarrier.findByIdAndDelete(req.params.id);
  if (!carrier) return next(new AppError('No vendor carrier found with that ID', 404));
  res.status(204).json({ status: 'success', data: null });
});