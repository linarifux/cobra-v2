import netSuiteService from "../services/netSuiteService.js";
import NetSuiteOrder from "../models/NetSuiteOrder.js";

// --- HELPERS: NetSuite Item Fulfillment Package Sublists ---
const buildPackageSublist = (normalizedPackages, carrierSublist = "package") => {
  if (carrierSublist === "packageFedEx") {
    return {
      packageFedEx: {
        items: normalizedPackages.map((pkg, idx) => ({
          packageTrackingNumberFedEx: pkg.trackingNumber,
          packageWeightFedEx: pkg.weightLbs,
          reference1FedEx: pkg.description || `Box ${idx + 1}`,
        })),
      },
    };
  }

  if (carrierSublist === "packageUps") {
    return {
      packageUps: {
        items: normalizedPackages.map((pkg, idx) => ({
          packageTrackingNumberUps: pkg.trackingNumber,
          packageWeightUps: pkg.weightLbs,
          packageDescrUps: pkg.description || `Box ${idx + 1}`,
        })),
      },
    };
  }

  if (carrierSublist === "packageUsps") {
    return {
      packageUsps: {
        items: normalizedPackages.map((pkg, idx) => ({
          packageTrackingNumberUsps: pkg.trackingNumber,
          packageWeightUsps: pkg.weightLbs,
          packageDescrUsps: pkg.description || `Box ${idx + 1}`,
        })),
      },
    };
  }

  // Standard / non-integrated shipping method (default)
  return {
    package: {
      items: normalizedPackages.map((pkg, idx) => ({
        packageTrackingNumber: pkg.trackingNumber,
        packageWeight: pkg.weightLbs,
        packageDescr: pkg.description || `Box ${idx + 1}`,
      })),
    },
  };
};

const detectCarrierSublist = (carrierHint = "") => {
  const hint = String(carrierHint).toLowerCase();
  if (hint.includes("fedex")) return "packageFedEx";
  if (hint.includes("ups")) return "packageUps";
  if (hint.includes("usps") || hint.includes("stamps")) return "packageUsps";
  return null;
};

// GET /api/netsuite/sync/sales-orders
export const syncAllOrdersBackground = async (req, res) => {
  try {
    const locationId = 415;
    const limit = 50;

    res.status(202).json({
      success: true,
      message:
        "NetSuite SuiteQL synchronization started in the background. You can safely navigate away.",
    });

    runBackgroundSync(locationId, limit).catch((err) => {
      console.error("Background Sync Failed:", err);
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// --- BACKGROUND WORKER ---
const runBackgroundSync = async (locationId, limit) => {
  let offset = 0;
  let hasMore = true;
  let totalSynced = 0;

  console.log(
    `[BACKGROUND] Starting SuiteQL sync for location ${locationId}...`,
  );

  const sql = `
      SELECT 
          t.id, 
          t.tranid, 
          t.trandate, 
          t.foreigntotal, 
          t.custbody16, 
          BUILTIN.DF(t.status) AS status_name, 
          t.salesrep,
          BUILTIN.DF(t.salesrep) AS salesrep_name
      FROM transaction t
      WHERE t.type = 'SalesOrd' AND t.custbody16 = ${locationId}
      ORDER BY t.id DESC 
  `;

  while (hasMore) {
    const response = await netSuiteService.querySuiteQL(
      sql,
      limit,
      offset,
      true,
    );
    const items = response.items || [];

    if (items.length === 0) {
      hasMore = false;
      break;
    }

    const bulkOps = items.map((nsOrder) => ({
      updateOne: {
        filter: { netSuiteId: String(nsOrder.id) },
        update: {
          $set: {
            orderNumber: nsOrder.tranid || nsOrder.id,
            netSuiteId: String(nsOrder.id),
            totalAmount: Number(nsOrder.foreigntotal) || 0,
            status: nsOrder.status_name || "New",
            salesRepName: nsOrder.salesrep_name || null,
            salesRepId: nsOrder.salesrep || null,
          },
        },
        upsert: true,
      },
    }));

    if (bulkOps.length > 0) {
      const result = await NetSuiteOrder.bulkWrite(bulkOps);
      totalSynced += result.upsertedCount + result.modifiedCount;
      console.log(
        `[BACKGROUND] Saved batch. Total synced so far: ${totalSynced}`,
      );
    }

    offset += limit;
    if (!response.hasMore || items.length < limit) {
      hasMore = false;
    }
  }

  console.log(
    `[BACKGROUND] SYNC COMPLETE. Total records safely stored: ${totalSynced}`,
  );
};

// --- SWAGGER METADATA ENDPOINT ---
// GET /api/netsuite/metadata/:recordType
export const getRecordMetadata = async (req, res) => {
  try {
    const recordType = req.params.recordType; // e.g., "salesOrder"
    const forceRefresh = req.query.refresh === "true";

    const schema = await netSuiteService.fetchMetadataCatalog(
      recordType,
      forceRefresh,
    );

    res.status(200).json({
      success: true,
      data: schema,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || error });
  }
};

// --- DYNAMIC LOCATION FETCHER (REST API) ---
// GET /api/netsuite/salesOrder/location/:locationId
export const getSalesOrdersByLocation = async (req, res) => {
  try {
    const locationId = parseInt(req.params.locationId, 10);
    if (isNaN(locationId))
      return res
        .status(400)
        .json({ success: false, error: "Invalid Location ID." });

    const limit = req.query.limit
      ? Math.min(Number(req.query.limit), 1000)
      : 50;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    const search = req.query.q ? req.query.q.trim() : "";
    const forceRefresh = req.query.refresh === "true";

    const locationAddresses = {
      586: "Brandywine Green LLC\r\nHainsport Whs - NJ\r\n1509 Rt 38\r\nUnit 4\r\nHainesport NJ 08036\r\nUnited States",
      415: "BW - CORP Address String Here",
    };

    const targetAddress = locationAddresses[locationId];
    if (!targetAddress)
      return res.status(400).json({
        success: false,
        error: `No address mapped for ID ${locationId}.`,
      });

    let q = `custbody_loc_header_address IS "${targetAddress}"`;

    if (search) {
      const safeSearch = search.replace(/"/g, '\\"');
      q += ` AND (tranId CONTAINING "${safeSearch}" OR memo CONTAINING "${safeSearch}")`;
    }

    const fields = [
      "tranId",
      "tranDate",
      "total",
      "memo",
      "email",
      "actualShipDate",
      "linkedTrackingNumbers",
      "custbody_pet_salesorder_type",
      "entity",
      "status",
      "shippingAddress",
      "salesRep",
      "custbody_loc_header_address",
    ].join(",");
    const queryParams = { limit, offset, q, fields };

    const data = await netSuiteService.request(
      "GET",
      "salesOrder",
      queryParams,
      null,
      {},
      forceRefresh,
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || error });
  }
};

// GET /api/netsuite/orders
export const getAllOrders = async (req, res) => {
  try {
    const limit = req.query.limit
      ? Math.min(Number(req.query.limit), 1000)
      : 50;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    const search = req.query.q ? req.query.q.trim() : "";
    const forceRefresh = req.query.refresh === "true";

    const locationId = 586;

    // Fetch BOTH Sales Orders and Transfer Orders
    let whereClause = `t.recordtype IN ('salesorder', 'transferorder') AND tl.mainline = 'T' AND tl.location = ${locationId}`;

    if (search) {
      const safeSearch = search.replace(/'/g, "''").toLowerCase();
      whereClause += ` AND (LOWER(t.tranid) LIKE '%${safeSearch}%' OR LOWER(BUILTIN.DF(t.entity)) LIKE '%${safeSearch}%')`;
    }

    const sql = `
      SELECT 
          t.id, 
          t.tranid, 
          t.createddate,
          t.recordtype,
          t.type,
          t.email,
          t.actualshipdate,
          t.linkedtrackingnumberlist,
          t.entity,
          BUILTIN.DF(t.entity) AS entity_name,
          t.status,
          BUILTIN.DF(t.status) AS status_name,
          t.externalid,
          tl.location,
          t.employee,
          BUILTIN.DF(t.employee) AS ref_name
      FROM 
          transaction t
      INNER JOIN 
          transactionLine tl ON tl.transaction = t.id
      WHERE 
          ${whereClause}
      ORDER BY 
          t.id DESC
    `;

    const suiteQlData = await netSuiteService.querySuiteQL(
      sql,
      limit,
      offset,
      forceRefresh,
    );

    const items = suiteQlData.items;

    return res.status(200).json({
      success: true,
      data: {
        ...suiteQlData,
        items,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || error });
  }
};

// GET /api/netsuite/orders/:id
export const getOrderById = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid Order ID." });
    }

    const queryParams = { ...req.query };
    const forceRefresh = queryParams.refresh === "true";
    delete queryParams.refresh;
    if (queryParams.expandSubResources === undefined) {
      queryParams.expandSubResources = "true";
    }

    // STEP 1: Determine the exact record type using a lightning-fast SuiteQL query
    const sql = `SELECT recordtype FROM transaction WHERE id = ${orderId}`;
    const suiteQlData = await netSuiteService.querySuiteQL(
      sql,
      1,
      0,
      forceRefresh,
    );

    if (!suiteQlData.items || suiteQlData.items.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Order not found in NetSuite." });
    }

    let rawRecordType = suiteQlData.items[0].recordtype;

    let restEndpointType;
    if (rawRecordType === "salesorder") restEndpointType = "salesOrder";
    else if (rawRecordType === "transferorder")
      restEndpointType = "transferOrder";
    else restEndpointType = rawRecordType;

    // STEP 2: Fetch the full, expanded record using the standard REST API
    const data = await netSuiteService.request(
      "GET",
      `${restEndpointType}/${orderId}`,
      queryParams,
      null,
      {},
      forceRefresh,
    );

    res.status(200).json({ success: true, data, __recordType: restEndpointType });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || error });
  }
};

// PATCH /api/netsuite/orders/:id
export const updateOrderById = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid Order ID." });
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Update payload cannot be empty." });
    }

    // Forward optional NetSuite PATCH query params (e.g., ?replace=item)
    const queryParams = { ...req.query };
    delete queryParams.refresh;

    // STEP 1: Resolve whether this ID is a Sales Order or Transfer Order
    const sql = `SELECT recordtype FROM transaction WHERE id = ${orderId}`;
    const suiteQlData = await netSuiteService.querySuiteQL(sql, 1, 0, false);

    if (!suiteQlData.items || suiteQlData.items.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Order not found in NetSuite." });
    }

    const rawRecordType = suiteQlData.items[0].recordtype;

    let restEndpointType;
    if (rawRecordType === "salesorder") restEndpointType = "salesOrder";
    else if (rawRecordType === "transferorder")
      restEndpointType = "transferOrder";
    else {
      return res.status(400).json({
        success: false,
        error: `Record ${orderId} is of type '${rawRecordType}', not a Sales Order or Transfer Order.`,
      });
    }

    // STEP 2: PATCH the resolved record in NetSuite
    const data = await netSuiteService.request(
      "PATCH",
      `${restEndpointType}/${orderId}`,
      queryParams,
      req.body,
    );

    return res.status(200).json({
      success: true,
      message: `${restEndpointType} ${orderId} updated successfully.`,
      data: data || null,
      __recordType: restEndpointType,
    });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    return res.status(statusCode).json({
      success: false,
      error: error.response?.data || error.message || error,
    });
  }
};

// Reusable core service used by both POST /api/netsuite/orders/:id/fulfill
// and shipStationController.js (generateOrderLabel)
export const executeNetSuiteOrderFulfillment = async (
  rawIdentifier,
  {
    trackingNumber,
    trackingNumbers,
    packages = [],
    totalWeightOunces = 0,
    shippingCost,
    shipDate, // Optional YYYY-MM-DD
    memo,
    carrierType = "",
    locationId = 586, // Defaults to Hainsport Whs
    items, // Optional: omit to fulfill all open lines
  } = {},
) => {
  const identifier = String(rawIdentifier || "").trim();
  if (!identifier) {
    const err = new Error("Order ID or Legacy Number is required.");
    err.status = 400;
    throw err;
  }

  // STEP 1: Normalize tracking numbers into package entries (NetSuite requires weight > 0 in lbs)
  const totalWeightLbs = Math.max(Number(totalWeightOunces || 0) / 16, 0.1);
  let normalizedPackages = [];

  if (Array.isArray(packages) && packages.some((p) => p.trackingNumber)) {
    normalizedPackages = packages
      .filter((p) => p.trackingNumber && String(p.trackingNumber).trim())
      .map((p, idx) => ({
        trackingNumber: String(p.trackingNumber).trim(),
        weightLbs: Number(
          Math.max(
            p.weightLbs || Number(p.weightInOunces || 0) / 16 || 0.1,
            0.1,
          ).toFixed(2),
        ),
        description: p.description || `Box ${idx + 1}`,
      }));
  } else {
    const rawTrackingList = Array.isArray(trackingNumbers)
      ? trackingNumbers
      : String(trackingNumber || "")
          .split(",")
          .map((t) => t.trim());

    const validTrackings = rawTrackingList.filter(Boolean);
    const perBoxWeight = Number(
      Math.max(totalWeightLbs / (validTrackings.length || 1), 0.1).toFixed(2),
    );

    normalizedPackages = validTrackings.map((tn, idx) => ({
      trackingNumber: String(tn).trim(),
      weightLbs: perBoxWeight,
      description: `Box ${idx + 1}`,
    }));
  }

  if (normalizedPackages.length === 0) {
    const err = new Error(
      "At least one tracking number is required to fulfill the order.",
    );
    err.status = 400;
    throw err;
  }

  // STEP 2: Resolve NetSuite internal ID, recordType, and shipMethod via SuiteQL
  const isNumericId = /^\d+$/.test(identifier);
  const safeTranId = identifier.replace(/'/g, "''").toLowerCase();

  const lookupSql = isNumericId
    ? `SELECT id, tranid, recordtype, BUILTIN.DF(shipmethod) AS shipmethod_name FROM transaction WHERE id = ${parseInt(identifier, 10)}`
    : `SELECT id, tranid, recordtype, BUILTIN.DF(shipmethod) AS shipmethod_name FROM transaction WHERE recordtype IN ('salesorder', 'transferorder') AND LOWER(tranid) = '${safeTranId}'`;

  const suiteQlData = await netSuiteService.querySuiteQL(lookupSql, 1, 0, true);

  if (!suiteQlData.items || suiteQlData.items.length === 0) {
    const err = new Error(`Order '${identifier}' not found in NetSuite.`);
    err.status = 404;
    throw err;
  }

  const nsTxn = suiteQlData.items[0];
  const netSuiteOrderId = nsTxn.id;
  const rawRecordType = nsTxn.recordtype;

  let restEndpointType;
  if (rawRecordType === "salesorder") restEndpointType = "salesOrder";
  else if (rawRecordType === "transferorder") restEndpointType = "transferOrder";
  else {
    const err = new Error(
      `Record ${netSuiteOrderId} is '${rawRecordType}', not a Sales Order or Transfer Order.`,
    );
    err.status = 400;
    throw err;
  }

  // STEP 3: Build base Item Fulfillment transform payload
  const basePayload = {
    shipStatus: { id: "C" }, // A = Picked, B = Packed, C = Shipped
    ...(shipDate ? { tranDate: shipDate } : {}),
    ...(memo ? { memo } : {}),
    ...(shippingCost !== undefined && shippingCost !== null && !isNaN(Number(shippingCost))
      ? { shippingCost: Number(shippingCost) }
      : {}),
  };

  if (Array.isArray(items) && items.length > 0) {
    basePayload.item = {
      items: items.map((line) => ({
        orderLine: Number(line.orderLine),
        itemReceive: line.itemReceive !== false,
        ...(line.itemReceive !== false
          ? {
              quantity: Number(line.quantity),
              ...(restEndpointType === "salesOrder" && locationId
                ? { location: { id: String(locationId) } }
                : {}),
            }
          : {}),
      })),
    };
  }

  const transformQueryParams =
    restEndpointType === "salesOrder" && locationId
      ? { init: `inventorylocation:${locationId}` }
      : {};

  const transformEndpoint = `${restEndpointType}/${netSuiteOrderId}/!transform/itemFulfillment`;

  // STEP 4: Transform into Item Fulfillment (auto-fallback for FedEx/UPS/USPS sublists)
  let fulfillmentResponse;
  try {
    const payload = {
      ...basePayload,
      ...buildPackageSublist(normalizedPackages, "package"),
    };

    fulfillmentResponse = await netSuiteService.request(
      "POST",
      transformEndpoint,
      transformQueryParams,
      payload,
    );
  } catch (firstError) {
    const errDetail = JSON.stringify(
      firstError.response?.data || firstError.message || "",
    );
    const fallbackSublist = detectCarrierSublist(
      carrierType || nsTxn.shipmethod_name,
    );

    if (
      fallbackSublist &&
      (errDetail.includes("Unknown field name 'package'") ||
        errDetail.includes("NONEXISTENT_FIELD"))
    ) {
      const retryPayload = {
        ...basePayload,
        ...buildPackageSublist(normalizedPackages, fallbackSublist),
      };

      fulfillmentResponse = await netSuiteService.request(
        "POST",
        transformEndpoint,
        transformQueryParams,
        retryPayload,
      );
    } else {
      throw firstError;
    }
  }

  return {
    netSuiteOrderId,
    tranId: nsTxn.tranid,
    recordType: restEndpointType,
    trackingNumbers: normalizedPackages.map((p) => p.trackingNumber),
    fulfillment: fulfillmentResponse || null,
  };
};

// POST /api/netsuite/orders/:id/fulfill
export const fulfillOrderById = async (req, res) => {
  try {
    const result = await executeNetSuiteOrderFulfillment(
      req.params.id,
      req.body || {},
    );

    return res.status(200).json({
      success: true,
      message: `${result.recordType} ${result.tranId} marked as Shipped in NetSuite with ${result.trackingNumbers.length} tracking number(s).`,
      data: result,
    });
  } catch (error) {
    const statusCode = error.status || error.response?.status || 500;
    return res.status(statusCode).json({
      success: false,
      error: error.response?.data || error.message || error,
    });
  }
};

// GET /api/netsuite/:recordType (Strictly used for basic REST records like Customer, Vendor, etc.)
export const getAllRecords = async (req, res) => {
  try {
    const recordType = req.params.recordType;
    const limit = req.query.limit
      ? Math.min(Number(req.query.limit), 1000)
      : 50;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    const search = req.query.q ? req.query.q.trim() : "";
    const forceRefresh = req.query.refresh === "true";

    const queryParams = { limit, offset };
    if (search) queryParams.q = search;

    const data = await netSuiteService.request(
      "GET",
      recordType,
      queryParams,
      null,
      {},
      forceRefresh,
    );

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || error });
  }
};

// GET /api/netsuite/:recordType/:id
export const getRecordById = async (req, res) => {
  try {
    const queryParams = { ...req.query };
    const forceRefresh = queryParams.refresh === "true";
    delete queryParams.refresh;

    if (queryParams.expandSubResources === undefined) {
      queryParams.expandSubResources = "true";
    }

    const data = await netSuiteService.request(
      "GET",
      `${req.params.recordType}/${req.params.id}`,
      queryParams,
      null,
      {},
      forceRefresh,
    );
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || error });
  }
};

// POST /api/netsuite/:recordType
export const createRecord = async (req, res) => {
  try {
    const data = await netSuiteService.request(
      "POST",
      req.params.recordType,
      {},
      req.body,
    );
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || error });
  }
};

// PATCH /api/netsuite/:recordType/:id
export const updateRecord = async (req, res) => {
  try {
    const data = await netSuiteService.request(
      "PATCH",
      `${req.params.recordType}/${req.params.id}`,
      {},
      req.body,
    );
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || error });
  }
};

// DELETE /api/netsuite/:recordType/:id
export const deleteRecord = async (req, res) => {
  try {
    await netSuiteService.request(
      "DELETE",
      `${req.params.recordType}/${req.params.id}`,
    );
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || error });
  }
};