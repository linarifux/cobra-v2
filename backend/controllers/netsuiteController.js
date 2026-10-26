import netSuiteService from '../services/netSuiteService.js';

const normalizeSuiteQLSalesOrder = (row) => {
    const normalized = {
        id: String(row.id),
        tranId: row.tranid || String(row.id),
        trandate: row.trandate || null,
        total: row.foreigntotal ?? row.total ?? 0,
        memo: row.memo || null,
        email: row.email || null,
        entity: {
            id: row.entity,
            refName: row.entity_name || String(row.entity || 'Unknown Customer')
        },
        status: {
            id: row.status,
            refName: row.status_name || String(row.status || 'Unknown')
        }
    };

    Object.entries(row).forEach(([key, val]) => {
        if (
            val !== null &&
            val !== undefined &&
            !['id', 'tranid', 'trandate', 'foreigntotal', 'total', 'entity', 'entity_name', 'status', 'status_name', 'links'].includes(key)
        ) {
            normalized[key] = val;
        }
    });

    return normalized;
};

// GET /api/netsuite/:recordType
export const getAllRecords = async (req, res) => {
    try {
        const recordType = req.params.recordType;
        const limit = req.query.limit ? Math.min(Number(req.query.limit), 1000) : 50;
        const offset = req.query.offset ? Number(req.query.offset) : 0;
        const search = req.query.q ? req.query.q.trim() : '';
        const forceRefresh = req.query.refresh === 'true';

        if (recordType === 'salesOrder') {
            let whereClause = `t.type = 'SalesOrd'`;

            if (search) {
                const safeSearch = search.replace(/'/g, "''").toLowerCase();
                whereClause += ` AND (LOWER(t.tranid) LIKE '%${safeSearch}%' OR LOWER(BUILTIN.DF(t.entity)) LIKE '%${safeSearch}%' OR LOWER(t.memo) LIKE '%${safeSearch}%')`;
            }

            const sql = `
                SELECT 
                    t.*,
                    BUILTIN.DF(t.entity) AS entity_name,
                    BUILTIN.DF(t.status) AS status_name
                FROM 
                    transaction t
                WHERE 
                    ${whereClause}
                ORDER BY 
                    t.id DESC
            `;

            const suiteQlData = await netSuiteService.querySuiteQL(sql, limit, offset, forceRefresh);
            const items = (suiteQlData.items || []).map(normalizeSuiteQLSalesOrder);

            return res.status(200).json({
                success: true,
                data: {
                    ...suiteQlData,
                    items
                }
            });
        }

        const queryParams = { limit, offset };
        if (search) queryParams.q = search;

        const data = await netSuiteService.request('GET', recordType, queryParams, null, {}, forceRefresh);
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message || error });
    }
};

// GET /api/netsuite/:recordType/:id
export const getRecordById = async (req, res) => {
    try {
        const queryParams = { ...req.query };
        const forceRefresh = queryParams.refresh === 'true';
        delete queryParams.refresh;

        if (queryParams.expandSubResources === undefined) {
            queryParams.expandSubResources = 'true';
        }

        const data = await netSuiteService.request(
            'GET',
            `${req.params.recordType}/${req.params.id}`,
            queryParams,
            null,
            {},
            forceRefresh
        );
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message || error });
    }
};

// POST /api/netsuite/:recordType
export const createRecord = async (req, res) => {
    try {
        const data = await netSuiteService.request('POST', req.params.recordType, {}, req.body);
        res.status(201).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message || error });
    }
};

// PATCH /api/netsuite/:recordType/:id
export const updateRecord = async (req, res) => {
    try {
        const data = await netSuiteService.request('PATCH', `${req.params.recordType}/${req.params.id}`, {}, req.body);
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message || error });
    }
};

// DELETE /api/netsuite/:recordType/:id
export const deleteRecord = async (req, res) => {
    try {
        await netSuiteService.request('DELETE', `${req.params.recordType}/${req.params.id}`);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ success: false, error: error.message || error });
    }
};