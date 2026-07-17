import Order from '../models/Order.js';
import Inventory from '../models/Inventory.js';
import Carrier from '../models/Carrier.js'; 
import Shipment from '../models/Shipment.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { 
  getRates, getWarehouses, getCarriers, 
  createLabel, createShipment, getLabelByExternalId 
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

// --- HELPER: Map Frontend Packages ---
const mapPackages = (packages, totalWeightInOunces = 16) => {
  if (packages && packages.length > 0) {
    return packages.map(pkg => ({
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
            company_name: address.company || "",
            address_line1: address.street1 || address.street || "123 Main St",
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

export const generateOrderLabel = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;
  const { packages, weightInOunces, dimensions, isResidential, shipFrom, carrierCode, serviceCode, externalShipmentId, orderNumber } = req.body; 

  const order = await Order.findById(orderId).populate('division customer');
  if (!order) return next(new AppError('Order not found', 404));

  const displayId = externalShipmentId || orderNumber || order.orderNumber || order._id.toString();
  const finalCarrierType = carrierCode || order.shippingDetails?.carrierType;
  const finalServiceCode = serviceCode || order.shippingDetails?.serviceCode;

  if (!finalCarrierType || !finalServiceCode) return next(new AppError('Shipping carrier and service code must be selected.', 400));
  
  const carrier = await Carrier.findOne({ carrierType: finalCarrierType, division: order.division._id, isActive: true });
  if (!carrier) return next(new AppError(`Carrier configuration not found.`, 404));

  const shipToCountry = normalizeCountry(order.shippingAddress.country);
  const shipFromCountry = normalizeCountry(shipFrom?.country_code || "US");
  const isInternational = shipToCountry !== shipFromCountry;

  let formattedPackages = [];
  if (packages && packages.length > 0) {
    formattedPackages = mapPackages(packages);
  } else {
    formattedPackages = mapPackages([], weightInOunces);
    if (dimensions) {
      formattedPackages[0].dimensions = {
        unit: "inch",
        length: Number(dimensions.length) || 10,
        width: Number(dimensions.width) || 10,
        height: Number(dimensions.height) || 10
      };
    }
  }

  const labelPayload = {
    test_label: carrier.activeEnvironment === 'test',
    validate_address: "no_validation",
    label_format: "pdf",
    label_layout: "4x6",
    shipment: {
      carrier_id: carrier.shipStationId, 
      service_code: finalServiceCode,
      external_shipment_id: displayId,
      external_order_id: displayId,
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
      packages: formattedPackages,
      ...(isInternational && {
        customs: {
          contents: "merchandise",
          non_delivery: "return_to_sender",
          customs_items: order.items.map(item => ({
            description: item.name ? item.name.substring(0, 50) : "Merchandise",
            quantity: item.quantity || 1,
            value: { currency: "USD", amount: item.unitPrice || 1 },
            country_of_origin: shipFromCountry
          }))
        }
      })
    }
  };

  try {
    const labelResponse = await createLabel(labelPayload);

    if (labelResponse?.hasErrors) {
       const errorMsg = labelResponse.shipments?.[0]?.errorMessage || labelResponse.results?.[0]?.errorMessage || "Failed to generate label.";
       return next(new AppError(`ShipStation Error: ${errorMsg}`, 400));
    }

    order.status = 'Shipped';
    order.shippingDetails.trackingNumber = labelResponse.tracking_number || labelResponse.trackingNumber;
    order.shippingDetails.shippingCost = labelResponse.shipment_cost?.amount || labelResponse.shipmentCost; 
    
    order.shipstationDetails = {
        ...order.shipstationDetails,
        orderId: labelResponse.order_id || labelResponse.orderId || labelResponse.shipment_id || labelResponse.shipmentId || order.shipstationDetails?.orderId,
        labelId: labelResponse.label_id || labelResponse.labelId,
        externalShipmentId: displayId // SAVE EXTERNAL ID FOR DOWNLOADING 
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

    res.status(200).json({
      status: 'success',
      data: {
        order,
        labelData: labelResponse.label_data || labelResponse.labelData, 
        trackingNumber: labelResponse.tracking_number || labelResponse.trackingNumber
      }
    });
  } catch (error) { return next(new AppError(`ShipStation Label Error: ${error.message}`, 502)); }
});

export const createOrderShipment = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;
  const { packages, isResidential, shipFrom, carrierCode, serviceCode, externalShipmentId, orderNumber } = req.body;

  const order = await Order.findById(orderId).populate('division customer');
  if (!order) return next(new AppError('Order not found in database.', 404));

  const displayId = externalShipmentId || orderNumber || order.orderNumber || order._id.toString();
  const { recipientName, line1, city, state, zip, country } = order.shippingAddress || {};
  
  if (!recipientName || !line1 || !city || !state || !zip) return next(new AppError('Incomplete destination address.', 400));
  if (!shipFrom || !shipFrom.postal_code || !shipFrom.address_line1) return next(new AppError('A valid Ship-From (Origin) location is required.', 400));
  if (!packages || !Array.isArray(packages) || packages.length === 0) return next(new AppError('Packages array is required to construct shipment.', 400));

  const finalCarrierType = carrierCode || order.shippingDetails?.carrierType;
  const finalServiceCode = serviceCode || order.shippingDetails?.serviceCode;

  if (!finalCarrierType || !finalServiceCode) return next(new AppError('Carrier and service code are required.', 400));

  const carrier = await Carrier.findOne({ carrierType: finalCarrierType, division: order.division._id, isActive: true });
  if (!carrier) return next(new AppError(`Carrier not found for ${finalCarrierType}.`, 404));

  const shipToCountry = normalizeCountry(country);
  const shipFromCountry = normalizeCountry(shipFrom.country_code);
  const isInternational = shipToCountry !== shipFromCountry;

  const shipmentPayload = {
    shipments: [
      {
        validate_address: "no_validation",
        external_shipment_id: displayId, 
        external_order_id: displayId,
        create_sales_order: true, 
        shipment_number: displayId,    
        shipment_status: "pending",    
        carrier_id: carrier.shipStationId, 
        requested_shipment_service: finalServiceCode, 
        ship_date: new Date().toISOString().split('T')[0] + "T00:00:00.000Z", 
        ship_to: {
          name: recipientName,
          phone: order.shippingAddress.phone || "",
          email: order.shippingAddress.email || order.customer?.contactEmail || "",
          company_name: order.customer?.customerName || "",
          address_line1: line1,
          address_line2: order.shippingAddress.line2 || "",
          city_locality: city,
          state_province: state,
          postal_code: zip,
          country_code: shipToCountry,
          address_residential_indicator: isResidential ? "yes" : "no"
        },
        ship_from: {
          name: shipFrom.name || "Fulfillment Center",
          phone: shipFrom.phone || "",
          email: shipFrom.email || "",
          company_name: shipFrom.company_name || shipFrom.name,
          address_line1: shipFrom.address_line1,
          address_line2: shipFrom.address_line2 || "",
          city_locality: shipFrom.city_locality,
          state_province: shipFrom.state_province,
          postal_code: shipFrom.postal_code,
          country_code: shipFromCountry,
          address_residential_indicator: shipFrom.address_residential_indicator || "no"
        },
        packages: mapPackages(packages),
        items: order.items.map(item => ({
          name: item.name ? item.name.substring(0, 200) : "Merchandise",
          sku: item.sku || "UNKNOWN",
          quantity: item.quantity || 1,
          weight: { value: item.weight || 0, unit: "ounce" }
        })),
        ...(isInternational && {
          customs: {
            contents: "merchandise",
            non_delivery: "return_to_sender",
            customs_items: order.items.map(item => ({
              description: item.name ? item.name.substring(0, 50) : "Merchandise",
              quantity: item.quantity || 1,
              value: { currency: "USD", amount: item.unitPrice || 1 },
              country_of_origin: shipFromCountry
            }))
          }
        })
      }
    ]
  };

  try {
    const shipmentResponse = await createShipment(shipmentPayload);
    
    if (shipmentResponse?.hasErrors || shipmentResponse?.has_errors) {
      const failedItem = shipmentResponse.shipments?.[0] || shipmentResponse.results?.[0];
      const errorMessage = failedItem?.errors?.[0] || failedItem?.errorMessage || "ShipStation rejected the fulfillment criteria.";
      return next(new AppError(`ShipStation Rejected: ${errorMessage}`, 400));
    }

    const processedShipment = shipmentResponse?.shipments?.[0] || shipmentResponse?.results?.[0] || shipmentResponse;
    if (!processedShipment || (!processedShipment.shipment_id && !processedShipment.shipmentId)) {
        return next(new AppError('ShipStation failed to return a valid shipment ID.', 502));
    }

    order.status = 'Processing';
    order.shippingDetails.carrierType = finalCarrierType;
    order.shippingDetails.serviceCode = finalServiceCode;
    
    order.shipstationDetails = {
      orderId: processedShipment.shipment_id || processedShipment.shipmentId,
      orderKey: processedShipment.external_order_id || processedShipment.orderKey || '',
      orderStatus: processedShipment.shipment_status || processedShipment.shipmentStatus || 'pending',
      externalShipmentId: displayId // SAVE EXTERNAL ID FOR DOWNLOADING
    };
    await order.save();

    let shipmentTracker = await Shipment.findOne({ order: order._id });
    if (!shipmentTracker) {
      shipmentTracker = new Shipment({
        order: order._id,
        division: order.division._id,
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

    res.status(200).json({ status: 'success', message: 'Shipment pushed to ShipStation.', data: { shipment: processedShipment, order } });
  } catch (error) { return next(new AppError(`ShipStation API Error: ${error.message}`, 502)); }
});

// @desc    Download an existing label PDF for an order via external_shipment_id
export const downloadOrderLabel = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;

  const order = await Order.findById(orderId);
  if (!order) return next(new AppError('Order not found', 400));

  // Retrieve the externalShipmentId we safely recorded during creation, or fallback to standard logic
  const externalId = order.shipstationDetails?.externalShipmentId || order.orderNumber || order._id.toString();

  try {
    const labelResponse = await getLabelByExternalId(externalId);

    // Shipstation JSON mapping for download link
    const pdfUrl = labelResponse?.label_download?.pdf || labelResponse?.label_download?.href || labelResponse?.download_url;

    if (pdfUrl) {
      return res.status(200).json({
        status: 'success',
        data: { labelUrl: pdfUrl }
      });
    }

    if (labelResponse?.label_data) {
       return res.status(200).json({
          status: 'success',
          data: { labelData: labelResponse.label_data }
       })
    }

    return next(new AppError('Label data could not be retrieved from ShipStation.', 400));
  } catch (error) {
    return next(new AppError(`ShipStation API Error: ${error.message}`, 502));
  }
});