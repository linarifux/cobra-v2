import { netSuiteRequest } from '../services/netSuiteService.js';

// ==========================================
// CONTROLLER FUNCTIONS
// ==========================================

// GET /api/netsuite/:recordType
export const getAllRecords = async (req, res) => {
    try {
        // Preserves query parameters like ?q=status IS 'Pending' or ?limit=100
        const queryParams = req.url.split('?')[1] ? `?${req.url.split('?')[1]}` : '';
        const data = await netSuiteRequest('GET', `${req.params.recordType}${queryParams}`);

        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error });
    }
};

// GET /api/netsuite/:recordType/:id
export const getRecordById = async (req, res) => {
    try {
        const data = await netSuiteRequest('GET', `${req.params.recordType}/${req.params.id}`);
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error });
    }
};

// POST /api/netsuite/:recordType
export const createRecord = async (req, res) => {
    try {
        const data = await netSuiteRequest('POST', req.params.recordType, req.body);
        res.status(201).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error });
    }
};

// PATCH /api/netsuite/:recordType/:id
export const updateRecord = async (req, res) => {
    try {
        const data = await netSuiteRequest('PATCH', `${req.params.recordType}/${req.params.id}`, req.body);
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error });
    }
};

// DELETE /api/netsuite/:recordType/:id
export const deleteRecord = async (req, res) => {
    try {
        await netSuiteRequest('DELETE', `${req.params.recordType}/${req.params.id}`);
        res.status(204).send(); // 204 No Content
    } catch (error) {
        res.status(500).json({ success: false, error });
    }
};
