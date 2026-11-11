import netSuiteService from "../services/netSuiteService.js";
import NetSuiteOrder from "../models/NetSuiteOrder.js";

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

// --- NEW: SWAGGER METADATA ENDPOINT ---
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

// --- NEW: DYNAMIC LOCATION FETCHER (REST API) ---
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
      return res
        .status(400)
        .json({
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
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 1000) : 50;
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
          tl.location
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

// GET /api/netsuite/:recordType (Now strictly used for basic REST records like Customer, Vendor, etc.)
export const getAllRecords = async (req, res) => {
  try {
    const recordType = req.params.recordType;
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 1000) : 50;
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
