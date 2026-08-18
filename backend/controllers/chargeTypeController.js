import ChargeType from '../models/ChargeType.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

// @desc    Get all charge types
// @route   GET /api/v1/charge-types
export const getChargeTypes = catchAsync(async (req, res, next) => {
  const chargeTypes = await ChargeType.find().sort('name');
  res.status(200).json({ status: 'success', results: chargeTypes.length, data: { chargeTypes } });
});

// @desc    Get a single charge type
// @route   GET /api/v1/charge-types/:id
export const getChargeType = catchAsync(async (req, res, next) => {
  const chargeType = await ChargeType.findById(req.params.id);
  if (!chargeType) return next(new AppError('No charge type found with that ID', 404));
  res.status(200).json({ status: 'success', data: { chargeType } });
});

// @desc    Create new charge type
// @route   POST /api/v1/charge-types
export const createChargeType = catchAsync(async (req, res, next) => {
  const newChargeType = await ChargeType.create(req.body);
  res.status(201).json({ status: 'success', data: { chargeType: newChargeType } });
});

// @desc    Update a charge type
// @route   PUT /api/v1/charge-types/:id
export const updateChargeType = catchAsync(async (req, res, next) => {
  const chargeType = await ChargeType.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  if (!chargeType) return next(new AppError('No charge type found with that ID', 404));
  res.status(200).json({ status: 'success', data: { chargeType } });
});

// @desc    Delete a charge type
// @route   DELETE /api/v1/charge-types/:id
export const deleteChargeType = catchAsync(async (req, res, next) => {
  const chargeType = await ChargeType.findByIdAndDelete(req.params.id);
  if (!chargeType) return next(new AppError('No charge type found with that ID', 404));
  res.status(204).json({ status: 'success', data: null });
});