import Order from '../models/Order.js';
import Inventory from '../models/Inventory.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import Carrier from '../models/Carrier.js'; 
import { getRates, getWarehouses, getCarriers, createLabel } from '../services/shipStationService.js';

const originZip = process.env.SHIPSTATION_ORIGIN_ZIP?.replace(/['"]/g, '').trim() || '08036';

const normalizeCountry = (countryStr) => {
  if (!countryStr) return 'US';
  const c = countryStr.toLowerCase().trim();
  if (c === 'usa' || c === 'united states' || c === 'us') return 'US';
  if (c === 'canada' || c === 'can' || c === 'ca') return 'CA';
  if (c === 'mexico' || c === 'mex' || c === 'mx') return 'MX';
  if (c === 'united kingdom' || c === 'uk' || c === 'gb') return 'GB';
  if (c === 'australia' || c === 'aus' || c === 'au') return 'AU';
  return countryStr.substring(0, 2).toUpperCase(); 
};

export const fetchWarehouses = catchAsync(async (req, res, next) => {
  try {
    const warehouses = await getWarehouses();
    res.status(200).json({ status: 'success', results: warehouses?.length || 0, data: { warehouses } });
  } catch (error) {
    return next(new AppError(`ShipStation Error: ${error.message}`, 502));
  }
});

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
    res.status(200).json({ status: 'success', results: filteredCarriers?.length || 0, data: filteredCarriers });
  } catch (error) {
    return next(new AppError(`ShipStation Error: ${error.message}`, 502));
  }
});

export const fetchLiveRates = catchAsync(async (req, res, next) => {
  const { carrierCode, address, totalWeightInOunces, divisionId } = req.body;

  if (!address || (!address.zipCode && !address.zip) || (!address.state && !address.state_province) || (!address.city && !address.city_locality)) {
    return next(new AppError('Missing required shipping address fields (City, State, Zip).', 400));
  }
  if (!carrierCode) return next(new AppError('Carrier Code is required to fetch rates.', 400));

  const carrier = await Carrier.findOne({ carrierType: carrierCode, division: divisionId, isActive: true });
  if (!carrier) return next(new AppError(`Carrier ${carrierCode} is not configured or disabled.`, 404));

  const ratePayload = {
    shipment: {
      validate_address: "no_validation",
      ship_to: {
        name: address.firstName ? `${address.firstName} ${address.lastName}`.trim() : (address.name || "Customer"),
        phone: address.contactPhone || address.phone || "",
        email: address.contactEmail || address.email || "",
        company_name: address.company || address.company_name || "",
        address_line1: address.street1 || address.line1 || "123 Main St",
        address_line2: address.street2 || address.line2 || "",
        city_locality: address.city || address.city_locality,
        state_province: address.state || address.state_province,
        postal_code: address.zipCode || address.zip || address.postal_code,
        country_code: normalizeCountry(address.country || address.country_code),
        address_residential_indicator: address.isResidential ? "yes" : "no"
      },
      ship_from: {
        name: "Origin Warehouse",
        company_name: "DSM Logistics",
        address_line1: "Warehouse St",
        city_locality: "Origin City",
        state_province: "Origin State",
        postal_code: originZip,
        country_code: "US",
        address_residential_indicator: "no"
      },
      packages: [
        {
          weight: {
            value: totalWeightInOunces > 0 ? Math.ceil(totalWeightInOunces) : 16, 
            unit: "ounce" 
          },
          dimensions: { unit: "inch", length: 10, width: 10, height: 10 }
        }
      ]
    },
    rate_options: {
      carrier_ids: [carrier.shipStationId] 
    }
  };

  try {
    const response = await getRates(ratePayload);
    const rates = response?.rate_response?.rates || []; 

    const normalizedRates = rates.map(r => ({
      serviceCode: r.service_code,
      serviceName: r.service_type || r.service_code,
      shipmentCost: r.shipping_amount?.amount || 0,
      transitDays: r.delivery_days || null
    }));

    res.status(200).json({ status: 'success', results: normalizedRates?.length || 0, data: { rates: normalizedRates } });
  } catch (error) {
    return next(new AppError(`ShipStation Error: ${error.message}`, 502));
  }
});

export const getCheckoutRates = catchAsync(async (req, res, next) => {
  const { divisionId, address, totalWeightInOunces } = req.body;

  if (!divisionId) return next(new AppError('Division ID context is required.', 400));
  if (!address || (!address.zipCode && !address.zip) || !address.state || !address.city) {
    return next(new AppError('Missing required shipping address fields.', 400));
  }

  const configuredCarriers = await Carrier.find({ division: divisionId, isActive: true });
  if (!configuredCarriers || configuredCarriers.length === 0) {
    return res.status(200).json({ status: 'success', data: { rates: [] } });
  }

  let unifiedRates = [];

  try {
    const rateRequests = configuredCarriers.map(async (carrier) => {
      const ratePayload = {
        shipment: {
          validate_address: "no_validation",
          ship_to: {
            name: address.firstName ? `${address.firstName} ${address.lastName}`.trim() : "Customer",
            phone: address.contactPhone || "",
            email: address.contactEmail || "",
            company_name: address.company || "",
            address_line1: address.street1 || "123 Main St",
            address_line2: address.street2 || "",
            city_locality: address.city,
            state_province: address.state,
            postal_code: address.zipCode || address.zip,
            country_code: normalizeCountry(address.country),
            address_residential_indicator: "yes" 
          },
          ship_from: {
            name: "Origin Warehouse",
            company_name: "DSM Logistics",
            address_line1: "Warehouse St",
            city_locality: "Origin City",
            state_province: "Origin State",
            postal_code: originZip,
            country_code: "US",
            address_residential_indicator: "no"
          },
          packages: [
            {
              weight: {
                value: totalWeightInOunces > 0 ? Math.ceil(totalWeightInOunces) : 16, 
                unit: "ounce"
              },
              dimensions: { unit: "inch", length: 10, width: 10, height: 10 }
            }
          ]
        },
        rate_options: {
          carrier_ids: [carrier.shipStationId]
        }
      };

      try {
        const response = await getRates(ratePayload);
        const ssRates = response?.rate_response?.rates || []; 
        
        if (!ssRates || ssRates.length === 0) return;

        const enabledServiceCodes = carrier.enabledServices.filter(s => s.isActive).map(s => s.serviceCode);

        ssRates.forEach(rate => {
          if (enabledServiceCodes.includes(rate.service_code)) {
            unifiedRates.push({
              code: rate.service_code,
              name: rate.service_type || rate.service_code, 
              carrierCode: carrier.carrierType,
              carrierId: carrier._id,
              cost: rate.shipping_amount?.amount || 0, 
              transitDays: rate.delivery_days || null
            });
          }
        });
      } catch (carrierErr) {
        console.error(`[Rate Fetching] Failed to fetch rates for ${carrier.carrierType}:`, carrierErr.message);
      }
    });

    await Promise.all(rateRequests);
    unifiedRates.sort((a, b) => a.cost - b.cost);

    res.status(200).json({ status: 'success', results: unifiedRates.length, data: { rates: unifiedRates } });

  } catch (error) {
    console.error("Checkout Rate Fetching Failure:", error.message);
    return next(new AppError('Fulfillment system was unable to calculate shipping rates.', 502));
  }
});


// @desc    Generate a shipping label for a specific order and update the DB
// @route   POST /api/v1/shipstation/label/:orderId
export const generateOrderLabel = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;
  
  // Extract the live state sent from the frontend drawer
  const { weightInOunces, dimensions, isResidential, shipFrom, carrierCode, serviceCode } = req.body; 

  const order = await Order.findById(orderId).populate('division customer');
  if (!order) return next(new AppError('Order not found', 404));

  // console.log(order)
  // Determine Carrier & Service: Use frontend live values first, fallback to DB
  const finalCarrierType = carrierCode || order.shippingDetails?.carrierType;
  const finalServiceCode = serviceCode || order.shippingDetails?.serviceCode;

  if (!finalCarrierType || !finalServiceCode) {
    return next(new AppError('Shipping carrier and service code must be selected before generating a label.', 400));
  }

  const carrier = await Carrier.findOne({ carrierType: finalCarrierType, division: order.division._id, isActive: true });
  if (!carrier) {
    return next(new AppError(`Carrier configuration not found or disabled for ${finalCarrierType}.`, 404));
  }

  // Handle Cross-Border Requirements
  const shipToCountry = normalizeCountry(order.shippingAddress.country);
  const shipFromCountry = normalizeCountry(shipFrom?.country_code || "US");
  const isInternational = shipToCountry !== shipFromCountry;

  // Construct EXACT ShipStation V2 Label Payload
  const labelPayload = {
    test_label: carrier.activeEnvironment === 'test',
    validate_address: "no_validation",
    label_format: "pdf",
    label_layout: "4x6",
    shipment: {
      carrier_id: carrier.shipStationId, 
      service_code: finalServiceCode,
      ship_date: new Date().toISOString().split('T')[0] + "T00:00:00.000Z", 
      ship_to: {
        name: order.shippingAddress.recipientName || "Customer",
        phone: order.shippingAddress.phone || "",
        email: order.shippingAddress.email || "",
        company_name: order.customer?.customerName || "",
        address_line1: order.shippingAddress.line1 || "123 Main St", 
        address_line2: order.shippingAddress.line2 || "",
        city_locality: order.shippingAddress.city,
        state_province: order.shippingAddress.state,
        postal_code: order.shippingAddress.zip,
        country_code: shipToCountry,
        address_residential_indicator: isResidential ? "yes" : "no"
      },
      ship_from: {
        name: shipFrom?.name || "Fulfillment Center",
        company_name: shipFrom?.company_name || "DSM Logistics",
        phone: shipFrom?.phone || "",
        email: shipFrom?.email || "",
        address_line1: shipFrom?.address_line1 || "123 Warehouse St",
        address_line2: shipFrom?.address_line2 || "",
        city_locality: shipFrom?.city_locality || "Origin City",
        state_province: shipFrom?.state_province || "NY",
        postal_code: shipFrom?.postal_code || originZip,
        country_code: shipFromCountry,
        address_residential_indicator: shipFrom?.address_residential_indicator || "no"
      },
      packages: [
        {
          weight: {
            value: weightInOunces > 0 ? Math.ceil(weightInOunces) : 16,
            unit: "ounce"
          },
          dimensions: {
            unit: "inch",
            length: dimensions?.length || 10,
            width: dimensions?.width || 10,
            height: dimensions?.height || 10
          }
        }
      ],
      // IF CROSSING BORDERS, SHIPSTATION REQUIRES CUSTOMS DECLARATIONS
      ...(isInternational && {
        customs: {
          contents: "merchandise",
          non_delivery: "return_to_sender",
          customs_items: order.items.map(item => ({
            description: item.name ? item.name.substring(0, 50) : "Merchandise",
            quantity: item.quantity || 1,
            value: {
              currency: "usd",
              amount: item.unitPrice || 1
            },
            country_of_origin: shipFromCountry
          }))
        }
      })
    }
  };
  console.log(carrier);

  try {
    const labelResponse = await createLabel(labelPayload);

    const trackingNumber = labelResponse.tracking_number || labelResponse.trackingNumber || "N/A";
    const shipmentCost = labelResponse.shipment_cost?.amount || labelResponse.shipmentCost || 0;
    
    const labelData = labelResponse.label_data || labelResponse.labelData;
    const labelUrl = labelResponse.label_download?.href || labelResponse.label_download?.pdf;

    // Save newly updated carrier data and tracking right back to MongoDB automatically
    order.status = 'Shipped';
    order.shippingDetails = order.shippingDetails || {}; 
    order.shippingDetails.carrierType = finalCarrierType;
    order.shippingDetails.serviceCode = finalServiceCode;
    order.shippingDetails.trackingNumber = trackingNumber;
    order.shippingDetails.shippingCost = shipmentCost; 
    await order.save();

    res.status(200).json({
      status: 'success',
      data: {
        order,
        labelData: labelData, 
        labelUrl: labelUrl,
        trackingNumber: trackingNumber
      }
    });
  } catch (error) {
    return next(new AppError(`ShipStation Label Error: ${error.message}`, 502));
  }
});