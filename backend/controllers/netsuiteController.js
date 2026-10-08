import axios from 'axios';
import crypto from 'crypto';
import OAuth from 'oauth-1.0a';

// Initialize OAuth 1.0a Authentication
const oauth = new OAuth({
    consumer: {
        key: process.env.NETSUITE_CONSUMER_KEY,
        secret: process.env.NETSUITE_CONSUMER_SECRET,
    },
    signature_method: 'HMAC-SHA256',
    hash_function(base_string, key) {
        return crypto
            .createHmac('sha256', key)
            .update(base_string)
            .digest('base64');
    },
    realm: process.env.NETSUITE_ACCOUNT_ID
});

const token = {
    key: process.env.NETSUITE_TOKEN_ID,
    secret: process.env.NETSUITE_TOKEN_SECRET,
};

// --- HELPER: Execute NetSuite Request ---
const netSuiteRequest = async (method, endpoint, data = null) => {
    const url = `${process.env.NETSUITE_URL}/${endpoint}`;
    const request_data = { url, method };
    
    // Generate Authorization Header
    const authHeader = oauth.toHeader(oauth.authorize(request_data, token));
    authHeader.Authorization += `, realm="${oauth.realm}"`;

    try {
        const response = await axios({
            url,
            method,
            headers: {
                ...authHeader,
                'Content-Type': 'application/json',
                'Prefer': 'transient' // Forces NetSuite to return the full object synchronously on POST/PATCH
            },
            data
        });
        return response.data;
    } catch (error) {
        console.error('NetSuite API Error:', error.response?.data || error.message);
        throw error.response?.data || new Error('NetSuite Request Failed');
    }
};

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