import Carrier from '../models/Carrier.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

// @desc    Configure/Add a new carrier integration (Division Scoped)
// @route   POST /api/v1/carriers
// @route   POST /api/v1/divisions/:divisionId/carriers
export const createCarrier = catchAsync(async (req, res, next) => {
  // 1. Support nested routes: Grab division ID from the URL if not provided in the body
  if (!req.body.division) req.body.division = req.params.divisionId;

  if (!req.body.division) {
    return next(new AppError('A division ID is required to configure a carrier.', 400));
  }

  // 2. Enforce the Compound Index manually for a cleaner error message
  const existingCarrier = await Carrier.findOne({ 
    division: req.body.division, 
    carrierType: req.body.carrierType 
  });

  if (existingCarrier) {
    return next(new AppError(`${req.body.carrierType} is already configured for this division. Please update the existing profile instead.`, 400));
  }

  const carrier = await Carrier.create(req.body);

  res.status(201).json({
    status: 'success',
    data: { carrier }
  });
});

// @desc    Get all configured carriers (Globally OR by Division)
// @route   GET /api/v1/carriers
// @route   GET /api/v1/divisions/:divisionId/carriers
export const getAllCarriers = catchAsync(async (req, res, next) => {
  // 1. Support nested routes: If accessed via division route, apply filter
  let filter = {};
  if (req.params.divisionId) {
    filter = { division: req.params.divisionId };
  }

  // Populate the division name so the frontend can display it if needed
  const carriers = await Carrier.find(filter)
    .populate('division', 'divisionName divisionCode')
    .sort('carrierType');

  res.status(200).json({
    status: 'success',
    results: carriers.length,
    data: { carriers }
  });
});

// @desc    Get a single carrier configuration by ID
// @route   GET /api/v1/carriers/:id
export const getCarrierById = catchAsync(async (req, res, next) => {
  const carrier = await Carrier.findById(req.params.id).populate('division', 'divisionName divisionCode');

  if (!carrier) {
    return next(new AppError('No carrier configuration found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { carrier }
  });
});

// @desc    Update credentials or services for a carrier
// @route   PUT /api/v1/carriers/:id
export const updateCarrier = catchAsync(async (req, res, next) => {
  const carrier = await Carrier.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  if (!carrier) {
    return next(new AppError('No carrier found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { carrier }
  });
});

// @desc    Remove a carrier integration profile
// @route   DELETE /api/v1/carriers/:id
export const deleteCarrier = catchAsync(async (req, res, next) => {
  const carrier = await Carrier.findByIdAndDelete(req.params.id);

  if (!carrier) {
    return next(new AppError('No carrier profile found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});