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

const stripLeadingNumericId = (val = "") =>
  String(val || "").replace(/^\d+\s+/, "").trim();

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

  const originalStatus = record.status?.refName || record.status_name || "";
  const rawStatus = originalStatus.toLowerCase().trim();

  const isPendingStatus =
    rawStatus === "pending" ||
    rawStatus.includes("pending fulfillment") ||
    rawStatus.includes("pending approval");

  // Only map to "New" if NetSuite status is Pending; otherwise keep original status
  const orderStatus = isPendingStatus ? "New" : originalStatus || "New";

  let fallbackName =
    stripLeadingNumericId(record.entity?.refName || record.entity_name) ||
    record.email ||
    "NetSuite Shopper";

  const employeeId = String(record.employee?.id || record.employee || "");
  if (employeeId === "129856") {
    fallbackName = "Leah Mockridge";
  } else if (employeeId === "72236") {
    fallbackName = "Ryan Smith";
  }

  const addresseeName = record.shippingAddress?.addressee?.trim() || "";

  const address = {
    name: addresseeName || (isTransfer ? "Gateway Destination" : fallbackName),
    companyName: isTransfer
      ? record.transferLocation?.refName || "Hainsport Whs"
      : "",
    email: record.email || record.custbody114 || "",
    phone: record.shippingAddress?.addrPhone?.trim() || "N/A",
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

  // Do not import NetSuite's shipping rate — stays 0 until ShipStation generates the label
  const shipping = {
    carrierId: mappedCarrier.carrierId,
    carrierType: mappedCarrier.carrierType || rawShipMethod || "N/A",
    serviceCode: mappedCarrier.serviceCode,
    shippingCost: 0,
    trackingNumber:
      record.linkedTrackingNumbers || record.linkedtrackingnumberlist || "",
  };

  const lineItems = record.item?.items || [];
  const items = lineItems.map((i) => {
    const netSuiteSku = String(i.item?.refName || i.item?.id || "UNKNOWN").trim();
    const rawName = i.description || i.name || "Unknown Item";

    const matchedStock = inventoryData.find((inv) => {
      const invDivisionId = String(inv.division?._id || inv.division || "");
      const corpSku = String(inv.corporateSku || "").trim().toLowerCase();
      return (
        invDivisionId === GATEWAY_DIVISION_ID &&
        corpSku !== "" &&
        corpSku === netSuiteSku.toLowerCase()
      );
    });

    const cobraUnitCost =
      matchedStock?.unitCost !== undefined && matchedStock?.unitCost !== null
        ? Number(matchedStock.unitCost)
        : Number(i.rate) || 0;

    return {
      id: generateLocalId(),
      name: matchedStock
        ? matchedStock.itemName || matchedStock.name || rawName
        : rawName,
      sku: matchedStock?.sku || netSuiteSku,
      corporateSku: netSuiteSku,
      qty: Number(i.quantity) || 1,
      price: isTransfer ? 0 : cobraUnitCost,
      weight: matchedStock?.weight || 0,
      mappedViaApi: Boolean(matchedStock?.sku),
    };
  });

  return {
    orderStatus,
    originalStatus,
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
  finalPayloadWeightOz = 0,
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
    shippingCost: 0,
    cartoons: cartoonsCount,
    pallets: palletsCount,
    totalWeightOunces: finalPayloadWeightOz,
    manuallyAdjustedWeightOunces: 0,
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
    shippingCost: 0, // Always 0 on initial COBRA import; populated by ShipStation on label purchase
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

export const buildNetSuiteFulfillmentPayload = ({
  order,
  labelResponse = {},
  shipping = {},
  packages = [],
  totalWeightOunces = 0,
  locationId = 586,
}) => {
  // Support single tracking number, comma-separated list, or multi-box packages from ShipStation
  const labelPackages = Array.isArray(labelResponse.packages)
    ? labelResponse.packages
    : [];

  const mergedPackages =
    labelPackages.length > 0
      ? labelPackages
          .filter((p) => p.trackingNumber || p.tracking_number)
          .map((p, idx) => ({
            trackingNumber: String(
              p.trackingNumber || p.tracking_number,
            ).trim(),
            weightInOunces:
              Number(p.weightInOunces || p.weight?.value || 0) ||
              Number(packages[idx]?.weightInOunces || 0),
            description: p.description || `Box ${idx + 1}`,
          }))
      : packages
          .filter((p) => p.trackingNumber)
          .map((p, idx) => ({
            trackingNumber: String(p.trackingNumber).trim(),
            weightInOunces: Number(p.weightInOunces || 0),
            description: p.description || `Box ${idx + 1}`,
          }));

  const primaryTracking =
    labelResponse.trackingNumber ||
    labelResponse.tracking_number ||
    shipping.trackingNumber ||
    order?.shippingDetails?.trackingNumber ||
    "";

  const trackingList = Array.isArray(labelResponse.trackingNumbers)
    ? labelResponse.trackingNumbers
    : undefined;

  const resolvedShippingCost =
    labelResponse.shipmentCost ??
    labelResponse.shippingCost ??
    labelResponse.cost ??
    shipping.shippingCost ??
    order?.shippingDetails?.shippingCost;

  const rawShipDate = labelResponse.shipDate || new Date().toISOString();
  const shipDate = String(rawShipDate).split("T")[0]; // YYYY-MM-DD

  return {
    trackingNumber: primaryTracking,
    ...(trackingList ? { trackingNumbers: trackingList } : {}),
    ...(mergedPackages.length > 0 ? { packages: mergedPackages } : {}),
    totalWeightOunces:
      Number(totalWeightOunces) ||
      Number(order?.shippingDetails?.totalWeightOunces || 0),
    shippingCost:
      resolvedShippingCost !== undefined && resolvedShippingCost !== ""
        ? Number(resolvedShippingCost)
        : undefined,
    shipDate,
    carrierType:
      labelResponse.carrierCode ||
      shipping.carrierType ||
      order?.shippingDetails?.carrierType ||
      "",
    memo: `Shipped via COBRA (${order?.orderNumber || "N/A"})`,
    locationId,
  };
};
