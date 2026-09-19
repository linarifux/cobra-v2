import ProcessingCharge from '../models/ProcessingCharge.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

// @desc    Create a new processing charge configuration
export const createProcessingCharge = catchAsync(async (req, res, next) => {
  const newCharge = await ProcessingCharge.create(req.body);
  
  res.status(201).json({
    status: 'success',
    data: {
      processingCharge: newCharge
    }
  });
});

// @desc    Get processing charges by Customer ID
export const getProcessingChargesByCustomer = catchAsync(async (req, res, next) => {
  const processingCharges = await ProcessingCharge.find({ customer: req.params.customerId });
  
  res.status(200).json({
    status: 'success',
    results: processingCharges.length,
    data: {
      processingCharges
    }
  });
});

// @desc    Get a single processing charge by ID
export const getProcessingCharge = catchAsync(async (req, res, next) => {
  const processingCharge = await ProcessingCharge.findById(req.params.id);
  
  if (!processingCharge) {
    return next(new AppError('No processing charge configuration found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      processingCharge
    }
  });
});

// @desc    Update a processing charge configuration
export const updateProcessingCharge = catchAsync(async (req, res, next) => {
  const processingCharge = await ProcessingCharge.findByIdAndUpdate(
    req.params.id, 
    req.body, 
    { new: true, runValidators: true }
  );

  if (!processingCharge) {
    return next(new AppError('No processing charge configuration found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      processingCharge
    }
  });
});

// @desc    Delete a processing charge configuration
export const deleteProcessingCharge = catchAsync(async (req, res, next) => {
  const processingCharge = await ProcessingCharge.findByIdAndDelete(req.params.id);

  if (!processingCharge) {
    return next(new AppError('No processing charge configuration found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});