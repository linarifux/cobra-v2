import Order from '../models/Order.js';
import Inventory from '../models/Inventory.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import Carrier from '../models/Carrier.js'; 
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

    const filteredCarriers = await carriers?.carriers?.map(carrier => ({
      code: carrier.carrier_code,
      id: carrier.carrier_id,
      accountNumber: carrier.account_number,
      name: carrier.friendly_name,
      services: carrier.services?.map(service => ({
        code: service.service_code,
        name: service.name,
      }))
    }));

    res.status(200).json({
      status: 'success',
      results: filteredCarriers?.length || 0,
      data: filteredCarriers,
      // carriers: {carriers}
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


// @desc    Get clean, filtered live shipping rates for a customer checking out
// @route   POST /api/v1/shipstation/checkout/rates
export const getCheckoutRates = catchAsync(async (req, res, next) => {
  const { divisionId, address, totalWeightInOunces } = req.body;

  // 1. Validation
  if (!divisionId) {
    return next(new AppError('Division ID context is required.', 400));
  }
  if (!address || !address.zip || !address.state || !address.city) {
    return next(new AppError('Missing required shipping address fields.', 400));
  }

  // 2. Fetch all active carrier profiles configured for this specific Division
  const configuredCarriers = await Carrier.find({ division: divisionId, isActive: true });
  if (!configuredCarriers || configuredCarriers.length === 0) {
    return res.status(200).json({ status: 'success', data: { rates: [] } });
  }

  const originZip = process.env.SHIPSTATION_ORIGIN_ZIP?.replace(/['"]/g, '').trim() || '10001';
  let unifiedRates = [];

  // 3. Request rates from ShipStation for all active carriers concurrently
  try {
    const rateRequests = configuredCarriers.map(async (carrier) => {
      const ratePayload = {
        carrierCode: carrier.carrierType,
        fromPostalCode: originZip,
        toState: address.state,
        toCountry: address.country || "US",
        toPostalCode: address.zip,
        toCity: address.city,
        weight: {
          value: totalWeightInOunces > 0 ? Math.ceil(totalWeightInOunces) : 16, 
          units: "ounces"
        },
        dimensions: { units: "inches", length: 10, width: 10, height: 10 },
        confirmation: "none",
        residential: false
      };

      // Hit ShipStation API
      const ssRates = await getRates(ratePayload);
      if (!ssRates) return;

      // Extract allowed service codes from our local DB profile
      const enabledServiceCodes = carrier.enabledServices
        .filter(s => s.isActive)
        .map(s => s.serviceCode);

      // Filter and map incoming rates against allowed methods
      ssRates.forEach(rate => {
        if (enabledServiceCodes.includes(rate.serviceCode)) {
          unifiedRates.push({
            code: rate.serviceCode,
            name: rate.serviceName,
            carrierCode: carrier.carrierType,
            carrierId: carrier._id,
            cost: rate.shipmentCost,
            transitDays: rate.transitDays || null
          });
        }
      });
    });

    // Wait for all carrier API calls to resolve in parallel
    await Promise.all(rateRequests);

    // 4. Sort rates out: Cheapest options first
    unifiedRates.sort((a, b) => a.cost - b.cost);

    res.status(200).json({
      status: 'success',
      results: unifiedRates.length,
      data: { rates: unifiedRates }
    });

  } catch (error) {
    console.error("Checkout Rate Fetching Failure:", error.message);
    return next(new AppError('Fulfillment system was unable to calculate shipping rates.', 502));
  }
});