import FreightProvider from '../models/FreightProvider.js';
import { getFreightProviders as fetchLiveProvidersFromSS } from '../services/shipStationService.js';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/catchAsync.js';

// ==========================================
// 1. Fetch LIVE from ShipStation API
// ==========================================
export const fetchLiveShipStationFreightProviders = catchAsync(async (req, res, next) => {
  try {
    const response = await fetchLiveProvidersFromSS();
    
    // Safely extract the array based on ShipStation v2 response
    const providers = response?.freight_provider_accounts || [];
    
    res.status(200).json({ 
      status: 'success', 
      results: providers.length, 
      data: { providers } 
    });
  } catch (error) { 
    return next(new AppError(`ShipStation API Error: ${error.message}`, 502)); 
  }
});

// ==========================================
// 2. Fetch Configured Providers from DB
// ==========================================
export const getConfiguredFreightProviders = catchAsync(async (req, res, next) => {
  // Allow filtering by division via query parameters (e.g., ?division=12345)
  const filter = {};
  if (req.query.division) filter.division = req.query.division;

  const providers = await FreightProvider.find(filter).populate('division', 'divisionName');

  res.status(200).json({
    status: 'success',
    results: providers.length,
    data: { providers }
  });
});

// ==========================================
// 3. Create/Save new Configuration to DB
// ==========================================
export const addFreightProvider = catchAsync(async (req, res, next) => {
  const newProvider = await FreightProvider.create(req.body);

  res.status(201).json({
    status: 'success',
    data: { provider: newProvider }
  });
});

// ==========================================
// 4. Update existing Configuration in DB
// ==========================================
export const updateFreightProvider = catchAsync(async (req, res, next) => {
  const provider = await FreightProvider.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!provider) {
    return next(new AppError('No freight provider configuration found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { provider }
  });
});

// ==========================================
// 5. Delete Configuration from DB
// ==========================================
export const deleteFreightProvider = catchAsync(async (req, res, next) => {
  const provider = await FreightProvider.findByIdAndDelete(req.params.id);

  if (!provider) {
    return next(new AppError('No freight provider configuration found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});