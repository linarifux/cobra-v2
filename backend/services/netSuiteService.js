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
export const netSuiteRequest = async (method, endpoint, data = null) => {
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
