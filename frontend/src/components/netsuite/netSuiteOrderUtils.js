export const GATEWAY_CUSTOMER_ID = "6a85c4d6f9743a6adff9cac3";
export const GATEWAY_DIVISION_ID = "6a970ae2a05720738c1318ab";

export const generateLocalId = () =>
  `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const createInitialPackage = () => ({
  id: generateLocalId(),
  packageCode: "package",
  weightInOunces: 0,
  length: 10,
  width: 10,
  height: 10,
});

export const isTransferRecord = (record) =>
  record?.recordtype === "transferorder" ||
  record?.__recordType === "transferOrder";

export const isInternationalCountry = (country = "") =>
  !["US", "USA", "UNITED STATES", "UNITED STATES OF AMERICA"].includes(
    country.toUpperCase().trim(),
  );

export const determineShippingService = (
  netSuiteShipString,
  carriersData = [],
  freightProvidersData = [],
) => {
  if (!netSuiteShipString) {
    return { carrierId: "", carrierType: "N/A", serviceCode: "" };
  }

  const lowerStr = netSuiteShipString.toLowerCase().replace(/_/g, " ");

  // 1. Check LTL Freight Providers first
  if (lowerStr.includes("freight")) {
    const matchedFreight = freightProvidersData.find(
      (fp) =>
        lowerStr.includes(fp.providerCode.toLowerCase()) ||
        lowerStr.includes(fp.accountName.toLowerCase()),
    );

    if (matchedFreight) {
      return {
        carrierId: matchedFreight._id,
        carrierType: matchedFreight.providerCode,
        serviceCode: `LTL_${matchedFreight.providerCode}`,
      };
    }
  }

  // 2. Check standard parcel carriers
  const cleanNS = lowerStr.replace(/[^a-z0-9]/g, "");
  for (const carrier of carriersData) {
    if (!carrier.enabledServices) continue;

    const matchedService = carrier.enabledServices.find((s) => {
      const cleanService = s.serviceName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      return cleanNS.includes(cleanService) || cleanService.includes(cleanNS);
    });

    if (matchedService) {
      return {
        carrierId: carrier._id,
        carrierType: carrier.carrierType,
        serviceCode: matchedService.serviceCode,
      };
    }
  }

  return { carrierId: "", carrierType: netSuiteShipString, serviceCode: "" };
};

export const mapNetSuiteRecordToState = (
  record,
  inventoryData = [],
  carriersData = [],
  freightProvidersData = [],
) => {
  const isTransfer = isTransferRecord(record);

  const rawStatus = (
    record.status?.refName ||
    record.status_name ||
    ""
  ).toLowerCase();

  let orderStatus = "New";
  if (rawStatus.includes("pending")) orderStatus = "New";
  if (rawStatus.includes("picked")) orderStatus = "Picked";
  if (rawStatus.includes("shipped")) orderStatus = "Shipped";
  if (rawStatus.includes("billed") || rawStatus.includes("closed")) {
    orderStatus = "Billed";
  }

  let nsShopperName =
    record.entity?.refName ||
    record.entity_name ||
    record.email ||
    "NetSuite Shopper";
  if (String(record.employee || record.employee?.id) === "129856") {
    nsShopperName = "Leah Mockridge";
  } else if (String(record.employee || record.employee?.id) === "72236") {
    nsShopperName = "Ryan Smith";
  }

  const address = {
    name: isTransfer ? "Gateway Destination" : nsShopperName,
    companyName: isTransfer
      ? record.transferLocation?.refName || "Hainsport Whs"
      : "",
    email: record.email || record.custbody114 || "",
    phone: "N/A",
    street: isTransfer ? "" : record.shippingAddress?.addr1 || "",
    line2: isTransfer ? "" : record.shippingAddress?.addr2 || "",
    city: isTransfer ? "Import" : record.shippingAddress?.city || "",
    state: isTransfer ? "NJ" : record.shippingAddress?.state || "",
    zip: isTransfer ? "00000" : record.shippingAddress?.zip || "",
    country: isTransfer
      ? "US"
      : record.shippingAddress?.country?.refName || "US",
  };

  const rawShipMethod = record.shipMethod?.refName || "";
  const mappedCarrier = determineShippingService(
    rawShipMethod,
    carriersData,
    freightProvidersData,
  );

  const shipping = {
    carrierId: mappedCarrier.carrierId,
    carrierType: mappedCarrier.carrierType || rawShipMethod || "N/A",
    serviceCode: mappedCarrier.serviceCode,
    shippingCost: record.shippingCost ?? record.altShippingCost ?? 0,
    trackingNumber:
      record.linkedTrackingNumbers || record.linkedtrackingnumberlist || "",
  };

  const lineItems = record.item?.items || [];
  const items = lineItems.map((i) => {
    const skuStr = String(i.item?.refName || i.item?.id || "UNKNOWN");
    const rawName = i.description || i.name || "Unknown Item";

    const matchedStock = inventoryData.find(
      (inv) =>
        String(inv.division) === GATEWAY_DIVISION_ID &&
        String(inv.corporateSku || "").toLowerCase() === skuStr.toLowerCase(),
    );

    return {
      id: generateLocalId(),
      name: matchedStock
        ? `${matchedStock.itemName || matchedStock.name} (COBRA SKU: ${matchedStock.sku})`
        : rawName,
      sku: skuStr,
      qty: Number(i.quantity) || 1,
      price: isTransfer ? 0 : Number(i.rate) || 0,
      weight: matchedStock?.weight || 0,
    };
  });

  return {
    orderStatus,
    address,
    shipping,
    notes: record.memo || "",
    items,
  };
};

export const calculateProcessingFees = ({
  finalPayloadWeightOz,
  itemsCount,
  isRushOrder,
  isCurrentlyInternational,
  cartoonsCount,
  customerCharges = [],
}) => {
  const config = customerCharges.length > 0 ? customerCharges[0] : {};
  const weightLbs = finalPayloadWeightOz / 16;

  const baseFee =
    weightLbs <= 10
      ? Number(config.baseFeeUpTo10lbs) || 0
      : Number(config.baseFee11To20lbs) || 0;
  const weightSurcharge =
    weightLbs > 20
      ? (weightLbs - 20) * (Number(config.weightSurcharge) || 0)
      : 0;
  const lineItemSurcharge =
    itemsCount > 3
      ? (itemsCount - 3) * (Number(config.lineItemSurcharge) || 0)
      : 0;

  const totalProcessingFee =
    baseFee +
    weightSurcharge +
    lineItemSurcharge +
    (isRushOrder ? Number(config.rushSurcharge) || 0 : 0) +
    (isCurrentlyInternational
      ? Number(config.internationalSurcharge) || 0
      : 0) +
    (Number(cartoonsCount) || 0) * (Number(config.cartonSurcharge) || 0);

  return { totalProcessingFee, baseFee, weightSurcharge, lineItemSurcharge };
};

export const buildMockCurrentOrder = ({
  record,
  isTransfer,
  orderStatus,
  address,
  shipping,
  cartoonsCount,
  palletsCount,
  items,
  computedSubtotal,
  grandTotal,
  processingFeesPreview,
}) => ({
  orderNumber: "Pending Database ID",
  legacyNumber: record?.tranId || record?.tranid,
  orderSource: "NETSUITE",
  orderType: isTransfer ? "TRANSFER" : "WEBORD",
  status: orderStatus,
  createdAt:
    record?.tranDate || record?.createddate || new Date().toISOString(),
  customer: { customerName: "Gateway" },
  division: { divisionName: "Corporate" },
  user: { name: address.name },
  shippingAddress: {
    recipientName: address.name,
    companyName: address.companyName,
    line1: address.street,
    line2: address.line2,
    city: address.city,
    state: address.state,
    zip: address.zip,
    country: address.country,
  },
  shippingDetails: {
    carrierType: shipping.carrierType,
    serviceCode: shipping.serviceCode,
    trackingNumber: shipping.trackingNumber,
    shippingCost: shipping.shippingCost,
    cartoons: cartoonsCount,
    pallets: palletsCount,
  },
  items,
  subtotal: computedSubtotal,
  totalAmount: grandTotal,
  processingFees: processingFeesPreview,
});

export const buildCobraCreationPayload = ({
  record,
  isTransfer,
  orderStatus,
  isRushOrder,
  notes,
  address,
  shipping,
  cartoonsCount,
  palletsCount,
  packages,
  finalPayloadWeightOz,
  items,
  computedSubtotal,
  grandTotal,
  processingFeesPreview,
}) => ({
  legacyNumber: record?.tranId || record?.tranid,
  orderType: isTransfer ? "TRANSFER" : "WEBORD",
  orderSource: "NETSUITE",
  status: orderStatus,
  customer: GATEWAY_CUSTOMER_ID,
  division: GATEWAY_DIVISION_ID,
  isRushOrder,
  notes,
  shippingAddress: {
    recipientName: address.name,
    companyName: address.companyName,
    email: address.email,
    phone: address.phone,
    line1: address.street,
    line2: address.line2,
    city: address.city,
    state: address.state,
    zip: address.zip,
    country: address.country,
  },
  shippingDetails: {
    carrierId: shipping.carrierId || undefined,
    carrierType: shipping.carrierType,
    serviceCode: shipping.serviceCode,
    trackingNumber: shipping.trackingNumber,
    shippingCost: shipping.shippingCost,
    cartoons: cartoonsCount,
    pallets: palletsCount,
    totalBoxes: packages.length,
    totalWeightOunces: finalPayloadWeightOz,
    manuallyAdjustedWeightOunces: 0,
    packages,
  },
  items: items.map((i) => ({
    sku: i.sku,
    name: i.name,
    quantity: i.qty,
    unitPrice: i.price,
    totalPrice: i.qty * i.price,
    weight: i.weight,
  })),
  subtotal: computedSubtotal,
  totalAmount: grandTotal,
  processingFees: processingFeesPreview,
});