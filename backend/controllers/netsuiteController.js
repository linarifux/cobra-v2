import netSuiteService from "../services/netSuiteService.js";
import NetSuiteOrder from "../models/NetSuiteOrder.js";

// GET /api/netsuite/sync/sales-orders
export const syncAllOrdersBackground = async (req, res) => {
  try {
    const locationId = 415;
    const limit = 50; 

    res.status(202).json({
      success: true,
      message: "NetSuite SuiteQL synchronization started in the background. You can safely navigate away.",
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

  console.log(`[BACKGROUND] Starting SuiteQL sync for location ${locationId}...`);

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
    const response = await netSuiteService.querySuiteQL(sql, limit, offset, true);
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
      console.log(`[BACKGROUND] Saved batch. Total synced so far: ${totalSynced}`);
    }

    offset += limit;
    if (!response.hasMore || items.length < limit) {
      hasMore = false;
    }
  }

  console.log(`[BACKGROUND] SYNC COMPLETE. Total records safely stored: ${totalSynced}`);
};


// GET /api/netsuite/:recordType
export const getAllRecords = async (req, res) => {
  try {
    const recordType = req.params.recordType;
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 1000) : 50;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    const search = req.query.q ? req.query.q.trim() : "";
    const forceRefresh = req.query.refresh === "true";
    const locationId = 415;

    if (recordType === "salesOrder") {
      let whereClause = `t.type = 'SalesOrd' AND t.custbody16 = ${locationId}`;

      if (search) {
        const safeSearch = search.replace(/'/g, "''").toLowerCase();
        whereClause += ` AND (LOWER(t.tranid) LIKE '%${safeSearch}%' OR LOWER(BUILTIN.DF(t.entity)) LIKE '%${safeSearch}%' OR LOWER(t.memo) LIKE '%${safeSearch}%')`;
      }

      // FIX: Changed t.shipAddress to t.shipaddress
      const sql = `
        SELECT 
            t.id, 
            t.tranid, 
            t.createddate,
            t.email,
            t.actualshipdate,
            t.linkedtrackingnumberlist,
            t.entity,
            BUILTIN.DF(t.entity) AS entity_name,
            t.status,
            BUILTIN.DF(t.status) AS status_name,
            t.externalid,
        FROM 
            transaction t
        WHERE 
            ${whereClause}
        ORDER BY 
            t.id DESC
      `;

      const suiteQlData = await netSuiteService.querySuiteQL(
        sql,
        limit,
        offset,
        forceRefresh
      );

      const items = (suiteQlData.items);


      return res.status(200).json({
        success: true,
        data: {
          ...suiteQlData,
          items,
        },
      });
    }

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

