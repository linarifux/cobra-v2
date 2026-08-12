import Vendor from '../models/Vendor.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

// @desc    Get all vendors
// @route   GET /api/v1/vendors
export const getVendors = catchAsync(async (req, res, next) => {
  const vendors = await Vendor.find().sort('vendorName');
  res.status(200).json({ status: 'success', results: vendors.length, data: { vendors } });
});

// @desc    Get a single vendor
// @route   GET /api/v1/vendors/:id
export const getVendor = catchAsync(async (req, res, next) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) return next(new AppError('No vendor found with that ID', 404));
  res.status(200).json({ status: 'success', data: { vendor } });
});

// @desc    Create new vendor
// @route   POST /api/v1/vendors
export const createVendor = catchAsync(async (req, res, next) => {
  const newVendor = await Vendor.create(req.body);
  res.status(201).json({ status: 'success', data: { vendor: newVendor } });
});

// @desc    Update a vendor
// @route   PUT /api/v1/vendors/:id
export const updateVendor = catchAsync(async (req, res, next) => {
  const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  if (!vendor) return next(new AppError('No vendor found with that ID', 404));
  res.status(200).json({ status: 'success', data: { vendor } });
});

// @desc    Delete a vendor
// @route   DELETE /api/v1/vendors/:id
export const deleteVendor = catchAsync(async (req, res, next) => {
  const vendor = await Vendor.findByIdAndDelete(req.params.id);
  if (!vendor) return next(new AppError('No vendor found with that ID', 404));
  res.status(204).json({ status: 'success', data: null });
});