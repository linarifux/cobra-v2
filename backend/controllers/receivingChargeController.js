import ReceivingCharge from '../models/ReceivingCharge.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

/**
 * UTILITY: Calculate Receiving Fees based on the exact spreadsheet model.
 * Formula: (BaseRate * LineItems) + (Weight > Allowance ? (Weight - Allowance) * OverageRate : 0) + (PalletFee * Pallets) + (PPF * PPF_Count)
 */
export const calculateReceivingTotal = (config, metrics) => {
  const lineItems = Number(metrics.lineItems) || 0;
  const weight = Number(metrics.weight) || 0;
  const providedPallets = Number(metrics.providedPallets) || 0;
  const incomingPalletsPPF = Number(metrics.incomingPalletsPPF) || 0;

  // 1. Base Line Item Calculation
  const baseTotal = config.baseRatePerLineItem * lineItems;

  // 2. Weight Overage Calculation
  let weightOverageTotal = 0;
  if (weight >= config.baseWeightAllowance) {
    weightOverageTotal = (weight - config.baseWeightAllowance) * config.overageRatePerPound;
  }

  // 3. Provided Pallet Fee
  const palletFeeTotal = config.providedPalletFeeRate * providedPallets;

  // 4. Pallet Processing Fee (PPF)
  const ppfTotal = config.palletProcessingFeeRate * incomingPalletsPPF;

  // Grand Total
  const grandTotal = baseTotal + weightOverageTotal + palletFeeTotal + ppfTotal;

  return {
    breakdown: { baseTotal, weightOverageTotal, palletFeeTotal, ppfTotal },
    grandTotal: Math.round(grandTotal * 100) / 100
  };
};

// @desc    Create a new receiving charge configuration
// @route   POST /api/v1/receiving-charges
export const createReceivingCharge = catchAsync(async (req, res, next) => {
  const existingConfig = await ReceivingCharge.findOne({ customer: req.body.customer });
  if (existingConfig) {
    return next(new AppError('A receiving configuration already exists for this customer. Please update the existing one.', 400));
  }

  const charge = await ReceivingCharge.create(req.body);
  await charge.populate('customer', 'customerName');

  res.status(201).json({ status: 'success', data: { charge } });
});

// @desc    Get receiving charge configuration for a specific customer
// @route   GET /api/v1/receiving-charges/customer/:customerId
export const getReceivingChargesByCustomer = catchAsync(async (req, res, next) => {
  if (!req.params.customerId) {
    return next(new AppError('Please provide a customer ID', 400));
  }

  const charges = await ReceivingCharge.find({ customer: req.params.customerId }).populate('customer', 'customerName');

  res.status(200).json({ status: 'success', results: charges.length, data: { charges } });
});

// @desc    Get a single receiving charge configuration by its ID
// @route   GET /api/v1/receiving-charges/:id
export const getReceivingCharge = catchAsync(async (req, res, next) => {
  const charge = await ReceivingCharge.findById(req.params.id).populate('customer', 'customerName');
  if (!charge) return next(new AppError('No configuration found with that ID', 404));

  res.status(200).json({ status: 'success', data: { charge } });
});

// @desc    Update a receiving charge configuration
// @route   PUT /api/v1/receiving-charges/:id
export const updateReceivingCharge = catchAsync(async (req, res, next) => {
  const charge = await ReceivingCharge.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).populate('customer', 'customerName');

  if (!charge) return next(new AppError('No configuration found with that ID', 404));

  res.status(200).json({ status: 'success', data: { charge } });
});

// @desc    Delete a receiving charge configuration
// @route   DELETE /api/v1/receiving-charges/:id
export const deleteReceivingCharge = catchAsync(async (req, res, next) => {
  const charge = await ReceivingCharge.findByIdAndDelete(req.params.id);
  if (!charge) return next(new AppError('No configuration found with that ID', 404));

  res.status(204).json({ status: 'success', data: null });
});