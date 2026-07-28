import Order from '../models/Order.js';
import Inventory from '../models/Inventory.js';
import Carrier from '../models/Carrier.js'; 
import Shipment from '../models/Shipment.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { 
  getRates, getWarehouses, getCarriers, 
  createLabel, createShipment, getLabelByExternalId,
  cancelShipment, voidLabel,
  createLabelForShipment, fetchLabelBufferAsBase64
} from '../services/shipStationService.js';

// Fallback to 08036 if not set in .env
const originZip = process.env.SHIPSTATION_ORIGIN_ZIP?.replace(/['"]/g, '').trim() || '08036';

// --- HELPER: Normalize Country to ISO-Alpha 2 ---
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

// --- HELPER: Strictly Pure Ship From Address (No Brand Names or c/o) ---
const getMIKROShipFrom = () => ({
  name: "MI-KRO Industries",
  company_name: "MI-KRO Industries",
  address_line1: "1509 RT 38",
  address_line2: "Unit 9",
  city_locality: "Hainesport",
  state_province: "NJ",
  postal_code: originZip,
  country_code: "US",
  phone: "6096940521",
  email: "mike@mi-krologistics.com",
  address_residential_indicator: "no"
});

// --- HELPER: Map Frontend Packages to ShipStation Format ---
const mapPackages = (packages, totalWeightInOunces = 16) => {
  if (packages && packages.length > 0) {
    return packages.map((pkg, index) => ({
      package_code: "package",
      weight: {
        value: pkg.weightInOunces > 0 ? Math.ceil(pkg.weightInOunces) : 16,
        unit: "ounce"
      },
      dimensions: {
        unit: "inch",
        length: Number(pkg.length) || 10,
        width: Number(pkg.width) || 10,
        height: Number(pkg.height) || 10
      }
    }));
  }
  return [{
    package_code: "package",
    weight: { value: totalWeightInOunces > 0 ? Math.ceil(totalWeightInOunces) : 16, unit: "ounce" },
    dimensions: { unit: "inch", length: 10, width: 10, height: 10 }
  }];
};

// =====================================================================
// CENTRALIZED CORE LOGIC FOR CREATING SHIPMENTS 
// =====================================================================
export const executeShipmentCreation = async (order, frontendPackages = [], isResidential = false, carrierCodeOverride = null, serviceCodeOverride = null) => {
  const displayId = order.orderNumber || order._id.toString();
  const { recipientName, line1, line2, city, state, zip, country, phone, email } = order.shippingAddress || {};
  
  if (!recipientName || !line1 || !city || !state || !zip) throw new Error('Incomplete destination address.');
  
  const finalCarrierType = carrierCodeOverride || order.shippingDetails?.carrierType;
  const finalServiceCode = serviceCodeOverride || order.shippingDetails?.serviceCode;

  if (!finalCarrierType || !finalServiceCode) throw new Error('Shipping carrier and service code must be selected.');

  const divisionId = order.division._id || order.division;
  const carrier = await Carrier.findOne({ carrierType: finalCarrierType, division: divisionId, isActive: true });
  if (!carrier) throw new Error(`Carrier configuration not found for ${finalCarrierType}.`);

  const shipToCountry = normalizeCountry(country);
  
  const totalWeight = order.items?.reduce((acc, item) => acc + (Number(item.weight || 0) * Number(item.quantity || 1)), 0) || 16;
  const finalPackages = (frontendPackages && frontendPackages.length > 0) ? mapPackages(frontendPackages) : mapPackages([], totalWeight);

  const subtotal = order.items?.reduce((acc, item) => acc + (Number(item.unitPrice || 0) * Number(item.quantity || 1)), 0) || 0;
  const shippingCost = Number(order.shippingDetails?.shippingCost || 0);
  const tax = subtotal * 0.08;

  // Exact Payload schema corresponding to ShipStation v2 shipments specification
  const shipmentPayload = {
    shipments: [
      {
        validate_address: "no_validation",
        external_shipment_id: displayId,
        carrier_id: carrier.shipStationId, 
        create_sales_order: true,
        is_gift: false,
        zone: 0,
        display_scheme: "paperless",
        requested_shipment_service: finalServiceCode,
        shipment_status: "pending",
        amount_paid: {
          currency: "usd",
          amount: Number((subtotal + shippingCost + tax).toFixed(2))
        },
        shipping_paid: {
          currency: "usd",
          amount: Number(shippingCost.toFixed(2))
        },
        tax_paid: {
          currency: "usd",
          amount: Number(tax.toFixed(2))
        },
        ship_to: {
          name: recipientName,
          phone: phone || "",
          email: email || order.customer?.contactEmail || "",
          company_name: "", 
          address_line1: line1,
          address_line2: line2 || "",
          city_locality: city,
          state_province: state,
          postal_code: zip,
          country_code: shipToCountry,
          address_residential_indicator: isResidential ? "yes" : "no"
        },
        ship_from: getMIKROShipFrom(),
        items: order.items?.map(item => ({
          name: item.name ? item.name.substring(0, 200) : "Merchandise",
          sku: item.sku || "UNKNOWN",
          quantity: item.quantity || 1,
          weight: { value: item.weight || 0, unit: "ounce" }
        })) || [],
        packages: finalPackages
      }
    ]
  };

  const shipmentResponse = await createShipment(shipmentPayload);
  
  if (shipmentResponse?.hasErrors || shipmentResponse?.has_errors) {
    const failedItem = shipmentResponse.shipments?.[0] || shipmentResponse.results?.[0];
    const errorMessage = failedItem?.errors?.[0] || failedItem?.errorMessage || "ShipStation rejected the fulfillment criteria.";
    throw new Error(errorMessage);
  }

  const processedShipment = shipmentResponse?.shipments?.[0] || shipmentResponse?.results?.[0] || shipmentResponse;
  if (!processedShipment || (!processedShipment.shipment_id && !processedShipment.shipmentId)) {
      throw new Error('ShipStation failed to return a valid shipment ID.');
  }

  // Update local Order model states 
  order.status = 'Pending';
  order.shippingDetails.carrierType = finalCarrierType;
  order.shippingDetails.serviceCode = finalServiceCode;
  
  order.shipstationDetails = {
    orderId: processedShipment.shipment_id || processedShipment.shipmentId,
    orderKey: processedShipment.external_shipment_id || processedShipment.shipmentId || '',
    orderStatus: processedShipment.shipment_status || processedShipment.shipmentStatus || 'pending',
    externalShipmentId: displayId 
  };
  await order.save();

  // Create or update the Shipment Tracker model
  let shipmentTracker = await Shipment.findOne({ order: order._id });
  if (!shipmentTracker) {
    shipmentTracker = new Shipment({
      order: order._id,
      division: divisionId,
      currentStatus: 'Shipment Created',
      isShipmentCreated: true,
      statusHistory: [{ status: 'Shipment Created', notes: 'Pushed to fulfillment dashboard.' }]
    });
  } else {
    shipmentTracker.isShipmentCreated = true;
    shipmentTracker.currentStatus = 'Shipment Created';
    shipmentTracker.statusHistory.push({ status: 'Shipment Created', notes: 'Pushed to fulfillment dashboard.' });
  }
  await shipmentTracker.save();

  return { shipment: processedShipment, order };
};

// =====================================================================
// API ROUTE HANDLERS
// =====================================================================

export const fetchWarehouses = catchAsync(async (req, res, next) => {
  try {
    const warehouses = await getWarehouses();
    res.status(200).json({ status: 'success', results: warehouses?.length || 0, data: { warehouses } });
  } catch (error) { return next(new AppError(`ShipStation Error: ${error.message}`, 502)); }
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
      })),
      test: {
        name: 'test'
      },
      packages: carrier?.packages?.map(p => ({
        packageId: p.package_id,
        packageCode: p.package_code,
        packageName: p.name,
        packageDimensios: p.dimensions
      }))
    }));
    res.status(200).json({ status: 'success', results: filteredCarriers?.length || 0, data: filteredCarriers });
  } catch (error) { return next(new AppError(`ShipStation Error: ${error.message}`, 502)); }
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
        company_name: "", // Explicitly blank
        address_line1: address.street1 || address.line1 || "123 Main St", 
        address_line2: address.street2 || address.line2 || "",
        city_locality: address.city || address.city_locality,
        state_province: address.state || address.state_province,
        postal_code: address.zipCode || address.zip || address.postal_code,
        country_code: normalizeCountry(address.country || address.country_code),
        address_residential_indicator: address.isResidential ? "yes" : "no"
      },
      ship_from: getMIKROShipFrom(),
      packages: mapPackages([], totalWeightInOunces)
    },
    rate_options: { carrier_ids: [carrier.shipStationId] }
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
  } catch (error) { return next(new AppError(`ShipStation Error: ${error.message}`, 502)); }
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
            company_name: "", // Explicitly blank
            address_line1: address.street1 || address.street || "123 Main St",
            address_line2: address.street2 || "",
            city_locality: address.city,
            state_province: address.state,
            postal_code: address.zipCode || address.zip,
            country_code: normalizeCountry(address.country),
            address_residential_indicator: "yes" 
          },
          ship_from: getMIKROShipFrom(),
          packages: mapPackages([], totalWeightInOunces)
        },
        rate_options: { carrier_ids: [carrier.shipStationId] }
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
    return next(new AppError('Fulfillment system was unable to calculate shipping rates.', 502));
  }
});

export const createOrderShipment = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;
  const { packages, isResidential, carrierCode, serviceCode } = req.body;

  const order = await Order.findById(orderId).populate('division customer');
  if (!order) return next(new AppError('Order not found in database.', 404));

  try {
    const result = await executeShipmentCreation(order, packages, isResidential, carrierCode, serviceCode);
    res.status(200).json({ status: 'success', message: 'Shipment successfully created in ShipStation.', data: result });
  } catch (error) {
    return next(new AppError(`ShipStation Rejected: ${error.message}`, 400));
  }
});

export const generateOrderLabel = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;
  const { packages, weightInOunces, carrierCode, serviceCode } = req.body; 

  const order = await Order.findById(orderId).populate('division customer');
  if (!order) return next(new AppError('Order not found', 404));

  const finalCarrierType = carrierCode || order.shippingDetails?.carrierType;
  const finalServiceCode = serviceCode || order.shippingDetails?.serviceCode;

  if (!finalCarrierType || !finalServiceCode) return next(new AppError('Shipping carrier and service code must be selected.', 400));
  
  // 1. EXTRACT EXISTING SHIPMENT ID (Prevents Duplication)
  const shipmentId = order.shipstationDetails?.orderId;
  if (!shipmentId) return next(new AppError('No active ShipStation shipment found for this order.', 400));

  let totalWeight = weightInOunces || 16;
  if (packages && packages.length > 0) {
    totalWeight = packages.reduce((acc, p) => acc + Number(p.weightInOunces || 0), 0);
  }

  // 2. USE THE EXACT SNIPPET PAYLOAD (With Carrier/Weight overrides included to ensure UI changes sync)
  const labelPayload = {
    carrierCode: finalCarrierType,
    serviceCode: finalServiceCode,
    weight: {
      value: totalWeight,
      units: "ounces"
    },
    validate_address: 'no_validation',
    label_layout: '4x6',
    label_format: 'pdf',
    label_download_type: 'url',
    display_scheme: 'label'
  };

  try {
    // Generates the label directly on the existing Shipment ID
    const labelResponse = await createLabelForShipment(shipmentId, labelPayload);

    if (labelResponse?.hasErrors) {
       const errorMsg = labelResponse.shipments?.[0]?.errorMessage || labelResponse.results?.[0]?.errorMessage || "Failed to generate label.";
       return next(new AppError(`ShipStation Error: ${errorMsg}`, 400));
    }

    order.status = 'Shipped';
    order.shippingDetails.trackingNumber = labelResponse.tracking_number || labelResponse.trackingNumber;
    order.shippingDetails.shippingCost = labelResponse.shipment_cost?.amount || labelResponse.shipmentCost || order.shippingDetails.shippingCost; 
    
    order.shipstationDetails = {
        ...order.shipstationDetails,
        labelId: labelResponse.label_id || labelResponse.labelId,
    };
    await order.save();

    let shipmentTracker = await Shipment.findOne({ order: order._id });
    if (!shipmentTracker) {
      shipmentTracker = new Shipment({
        order: order._id,
        division: order.division._id,
        shipStationLabelId: labelResponse.label_id || labelResponse.labelId || '',
        currentStatus: 'Label Purchased',
        isLabelPurchased: true,
        isShipmentCreated: true, 
        statusHistory: [{ status: 'Label Purchased', notes: `Label generated via ${finalCarrierType}.` }]
      });
    } else {
      shipmentTracker.isLabelPurchased = true;
      shipmentTracker.currentStatus = 'Label Purchased';
      shipmentTracker.shipStationLabelId = labelResponse.label_id || labelResponse.labelId || '';
      shipmentTracker.statusHistory.push({ status: 'Label Purchased', notes: `Label generated via ${finalCarrierType}.` });
    }
    await shipmentTracker.save();

    let labelData = labelResponse.label_data || labelResponse.labelData;
    let labelUrl = labelResponse.label_download?.pdf || labelResponse.label_download?.href || labelResponse.download_url || labelResponse.label_url;

    // 3. SECURE PROXY: Intercept authenticated API links to bypass frontend 404s
    if (!labelData && labelUrl && labelUrl.includes('api.shipstation.com')) {
       const proxyBase64 = await fetchLabelBufferAsBase64(labelUrl);
       if (proxyBase64) {
           labelData = proxyBase64;
           labelUrl = null; 
       }
    }

    res.status(200).json({
      status: 'success',
      data: {
        order,
        labelData: labelData, 
        labelUrl: labelUrl,
        trackingNumber: labelResponse.tracking_number || labelResponse.trackingNumber
      }
    });
  } catch (error) { return next(new AppError(`ShipStation Label Error: ${error.message}`, 502)); }
});

export const downloadOrderLabel = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;

  const order = await Order.findById(orderId);
  if (!order) return next(new AppError('Order not found', 400));

  const externalId = order.shipstationDetails?.externalShipmentId || order.orderNumber || order._id.toString();

  try {
    const labelResponse = await getLabelByExternalId(externalId);

    let pdfUrl = labelResponse?.label_download?.pdf || labelResponse?.label_download?.href || labelResponse?.download_url;
    let labelData = labelResponse?.label_data || labelResponse?.labelData;

    // SECURE PROXY: Intercept authenticated API links to bypass frontend 404s
    if (!labelData && pdfUrl && pdfUrl.includes('api.shipstation.com')) {
        const proxyBase64 = await fetchLabelBufferAsBase64(pdfUrl);
        if (proxyBase64) {
            labelData = proxyBase64;
            pdfUrl = null;
        }
    }

    if (labelData) {
       return res.status(200).json({ status: 'success', data: { labelData } });
    }

    if (pdfUrl) {
      return res.status(200).json({ status: 'success', data: { labelUrl: pdfUrl } });
    }

    return next(new AppError('Label data could not be retrieved from ShipStation.', 400));
  } catch (error) {
    return next(new AppError(`ShipStation API Error: ${error.message}`, 502));
  }
});

export const voidOrderLabel = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;
  const order = await Order.findById(orderId);
  if (!order) return next(new AppError('Order not found', 404));

  const labelId = order.shipstationDetails?.labelId;
  if (!labelId) return next(new AppError('No active label found for this order to void.', 400));

  try {
    await voidLabel(labelId);
    
    order.status = 'Pending'; 
    order.shippingDetails.trackingNumber = '';
    order.shippingDetails.shippingCost = 0;
    
    order.shipstationDetails.labelId = null;
    await order.save();

    let shipmentTracker = await Shipment.findOne({ order: order._id });
    if (shipmentTracker) {
      shipmentTracker.isLabelPurchased = false;
      shipmentTracker.currentStatus = 'Label Voided';
      shipmentTracker.shipStationLabelId = '';
      shipmentTracker.statusHistory.push({ status: 'Label Voided', notes: 'Label was manually voided.' });
      await shipmentTracker.save();
    }

    res.status(200).json({ status: 'success', message: 'Label successfully voided.', data: { order } });
  } catch (error) {
    return next(new AppError(`ShipStation Void Label Error: ${error.message}`, 502));
  }
});

export const cancelOrderShipment = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;
  const order = await Order.findById(orderId);
  if (!order) return next(new AppError('Order not found', 404));

  const shipmentId = order.shipstationDetails?.orderId; 
  if (!shipmentId) return next(new AppError('No shipment found for this order to cancel.', 400));

  try {
    await cancelShipment(shipmentId);
    
    order.status = 'New';
    order.shipstationDetails.orderId = null;
    order.shipstationDetails.orderStatus = 'cancelled';
    await order.save();

    let shipmentTracker = await Shipment.findOne({ order: order._id });
    if (shipmentTracker) {
      shipmentTracker.isShipmentCreated = false;
      shipmentTracker.currentStatus = 'Shipment Cancelled';
      shipmentTracker.statusHistory.push({ status: 'Shipment Cancelled', notes: 'Shipment was manually cancelled.' });
      await shipmentTracker.save();
    }

    res.status(200).json({ status: 'success', message: 'Shipment successfully cancelled.', data: { order } });
  } catch (error) {
    return next(new AppError(`ShipStation Cancel Shipment Error: ${error.message}`, 502));
  }
});