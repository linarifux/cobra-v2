import Order from '../models/Order.js';
import Inventory from '../models/Inventory.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { getRates, getWarehouses, getCarriers } from '../services/shipStationService.js';

// Fallback to 08036 if not set in .env
const originZip = process.env.SHIPSTATION_ORIGIN_ZIP?.replace(/['"]/g, '').trim() || '08036';

// @desc    Fetch all warehouses from ShipStation
// @route   GET /api/v1/shipstation/warehouses
export const fetchWarehouses = catchAsync(async (req, res, next) => {
  try {
    // Cleanly call the service without worrying about headers
    const warehouses = await getWarehouses();
    
    res.status(200).json({
      status: 'success',
      results: warehouses?.length || 0,
      data: { warehouses }
    });
  } catch (error) {
    return next(new AppError(`ShipStation Error: ${error.message}`, 502));
  }
});


// @desc    Fetch all connected carriers from ShipStation
// @route   GET /api/v1/shipstation/carriers
export const fetchCarriers = catchAsync(async (req, res, next) => {
  try {
    const carriers = await getCarriers();
    
    res.status(200).json({
      status: 'success',
      results: carriers?.length || 0,
      data: { carriers }
    });
  } catch (error) {
    return next(new AppError(`ShipStation Error: ${error.message}`, 502));
  }
});

// @desc    Get live shipping rates using unsaved frontend data
// @route   POST /api/v1/shipstation/rates/live
export const fetchLiveRates = catchAsync(async (req, res, next) => {
  const { carrierCode, address, totalWeightInOunces } = req.body;

  // 1. Validate incoming data
  if (!address || !address.zip || !address.state || !address.city) {
    return next(new AppError('Missing required shipping address fields (City, State, Zip).', 400));
  }

  if (!carrierCode) {
    return next(new AppError('Carrier Code is required to fetch rates.', 400));
  }

  // 2. Fetch Origin Zip from .env (Fallback to 10001 if missing)
  const originZip = process.env.SHIPSTATION_ORIGIN_ZIP?.replace(/['"]/g, '').trim() || '10001';

  // 3. Construct ShipStation Payload
  const ratePayload = {
    carrierCode,
    fromPostalCode: originZip,
    toState: address.state,
    toCountry: address.country || "US",
    toPostalCode: address.zip,
    toCity: address.city,
    weight: {
      // ShipStation requires an integer for ounces. Fallback to 1lb (16oz) if 0 to prevent crashes.
      value: totalWeightInOunces > 0 ? Math.ceil(totalWeightInOunces) : 16, 
      units: "ounces"
    },
    dimensions: {
      units: "inches",
      length: 10,
      width: 10,
      height: 10
    },
    confirmation: "none",
    residential: false
  };

  try {
    // 4. Hit the ShipStation API via your service
    const rates = await getRates(ratePayload);

    res.status(200).json({
      status: 'success',
      results: rates?.length || 0,
      data: { rates }
    });
  } catch (error) {
    return next(new AppError(`ShipStation Error: ${error.message}`, 502));
  }
});