import Carrier from '../models/Carrier.js';
import Customer from '../models/Customer.js'; // Required for the nested fetching logic
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

// @desc    Configure/Add a new carrier integration
// @route   POST /api/v1/carriers
export const createCarrier = catchAsync(async (req, res, next) => {
  const existingCarrier = await Carrier.findOne({ carrierType: req.body.carrierType });
  if (existingCarrier) {
    return next(new AppError(`${req.body.carrierType} is already configured. Please update the existing profile instead.`, 400));
  }

  const carrier = await Carrier.create(req.body);

  res.status(201).json({
    status: 'success',
    data: { carrier }
  });
});

// @desc    Get all configured carriers
// @route   GET /api/v1/carriers
export const getAllCarriers = catchAsync(async (req, res, next) => {
  const carriers = await Carrier.find().sort('carrierType');

  res.status(200).json({
    status: 'success',
    results: carriers.length,
    data: { carriers }
  });
});

// @desc    Get a single carrier configuration by ID
// @route   GET /api/v1/carriers/:id
export const getCarrierById = catchAsync(async (req, res, next) => {
  const carrier = await Carrier.findById(req.params.id);

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

// @desc    Get all active carriers & services formatted for a specific customer's assignments
// @route   GET /api/v1/customers/:customerId/carriers
export const getCarriersForCustomer = catchAsync(async (req, res, next) => {
  // 1. Validate customer exists
  const customer = await Customer.findById(req.params.customerId);
  if (!customer) {
    return next(new AppError('No customer found with that ID', 404));
  }

  // 2. Fetch all global carriers that are currently active in the system
  const activeCarriers = await Carrier.find({ isActive: true });

  // 3. Flatten the live services for the frontend dropdown UI
  let availableServices = [];
  
  activeCarriers.forEach(carrier => {
    // Only extract services the global admin has marked as LIVE
    const liveServices = carrier.enabledServices.filter(service => service.isActive === true);
    
    liveServices.forEach(service => {
      availableServices.push({
        carrierId: carrier._id,
        carrierType: carrier.carrierType, 
        serviceCode: service.serviceCode, 
        serviceName: service.serviceName, 
        displayLabel: `${carrier.carrierType} - ${service.serviceName}` 
      });
    });
  });

  res.status(200).json({
    status: 'success',
    results: availableServices.length,
    data: { 
      carriers: availableServices 
    }
  });
});