import axios from 'axios';
import crypto from 'crypto';
import https from 'https';
import OAuth from 'oauth-1.0a';

class NetSuiteClient {
    constructor() {
        this.oauth = new OAuth({
            consumer: {
                key: process.env.NETSUITE_CONSUMER_KEY,
                secret: process.env.NETSUITE_CONSUMER_SECRET,
            },
            signature_method: 'HMAC-SHA256',
            hash_function(base_string, key) {
                return crypto.createHmac('sha256', key).update(base_string).digest('base64');
            },
            realm: process.env.NETSUITE_ACCOUNT_ID
        });

        this.token = {
            key: process.env.NETSUITE_TOKEN_ID,
            secret: process.env.NETSUITE_TOKEN_SECRET,
        };

        // Persistent TCP/TLS connections to eliminate ~300ms SSL handshake overhead
        this.axiosInstance = axios.create({
            httpsAgent: new https.Agent({
                keepAlive: true,
                maxSockets: 10,
                keepAliveMsecs: 30000
            }),
            timeout: 30000
        });

        // Concurrency Queue State
        this.maxConcurrent = 2;
        this.activeRequests = 0;
        this.queue = [];

        // Multi-Tier SWR Cache State
        this.cache = new Map();
        this.freshTTL = 5 * 60 * 1000;  // 5 Minutes (Served immediately)
        this.staleTTL = 30 * 60 * 1000; // 30 Minutes (Served immediately + triggers silent background refresh)

        // In-Flight Request Deduplication (Prevents duplicate concurrent calls)
        this.inFlight = new Map();
    }

    // --- SWR CACHE ENGINE ---
    _getCacheState(key) {
        const entry = this.cache.get(key);
        if (!entry) return { status: 'MISS', data: null };

        const age = Date.now() - entry.timestamp;
        if (age <= this.freshTTL) {
            return { status: 'FRESH', data: entry.data };
        }
        if (age <= this.staleTTL) {
            return { status: 'STALE', data: entry.data };
        }

        this.cache.delete(key);
        return { status: 'MISS', data: null };
    }

    _setCache(key, data) {
        if (this.cache.size >= 500) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
    }

    // --- CONCURRENCY QUEUE ENGINE ---
    async _processQueue() {
        if (this.queue.length === 0 || this.activeRequests >= this.maxConcurrent) return;

        this.activeRequests++;
        const { method, fullUrl, data, customHeaders, retries, resolve, reject } = this.queue.shift();

        try {
            const response = await this._executeAxios(method, fullUrl, data, customHeaders, retries);
            resolve(response);
        } catch (error) {
            reject(error);
        } finally {
            this.activeRequests--;
            this._processQueue();
        }
    }

    async _executeAxios(method, fullUrl, data, customHeaders, retries) {
        const requestData = { url: fullUrl, method };
        const authHeader = this.oauth.toHeader(this.oauth.authorize(requestData, this.token));
        authHeader.Authorization += `, realm="${this.oauth.realm}"`;

        try {
            const response = await this.axiosInstance({
                url: fullUrl,
                method,
                headers: {
                    ...authHeader,
                    'Content-Type': 'application/json',
                    'Prefer': 'transient',
                    ...customHeaders
                },
                data
            });
            return response.data;
        } catch (error) {
            const statusCode = error.response?.status;

            if (statusCode === 429 && retries > 0) {
                const jitterDelay = 800 + Math.floor(Math.random() * 700);
                await new Promise(res => setTimeout(res, jitterDelay));
                return this._executeAxios(method, fullUrl, data, customHeaders, retries - 1);
            }

            console.error('NetSuite API Error:', error.response?.data || error.message);
            throw error.response?.data || new Error('NetSuite Request Failed');
        }
    }

    _enqueueWithDeduplication(cacheKey, method, fullUrl, data, customHeaders) {
        if (this.inFlight.has(cacheKey)) {
            return this.inFlight.get(cacheKey);
        }

        const promise = new Promise((resolve, reject) => {
            this.queue.push({
                method,
                fullUrl,
                data,
                customHeaders,
                retries: 3,
                resolve: (resData) => {
                    this._setCache(cacheKey, resData);
                    this.inFlight.delete(cacheKey);
                    resolve(resData);
                },
                reject: (err) => {
                    this.inFlight.delete(cacheKey);
                    reject(err);
                }
            });
            this._processQueue();
        });

        this.inFlight.set(cacheKey, promise);
        return promise;
    }

    // --- CORE REST RECORD REQUEST ---
    async request(method, endpoint, params = {}, data = null, customHeaders = {}, forceRefresh = false) {
        // ERROR GUARD: Verify environment variables before running .replace()
        if (!process.env.NETSUITE_URL) {
            throw new Error("CRITICAL SERVER ERROR: NETSUITE_URL is missing from environment variables.");
        }

        const baseUrl = `${process.env.NETSUITE_URL.replace(/\/+$/, '')}/${(endpoint || '').replace(/^\/+/, '')}`;
        const urlObj = new URL(baseUrl);

        if (params && Object.keys(params).length > 0) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) urlObj.searchParams.append(key, value);
            });
        }

        const fullUrl = urlObj.toString();
        const cacheKey = `REST:${method}:${fullUrl}`;

        if (method === 'GET' && !forceRefresh) {
            const { status, data: cachedData } = this._getCacheState(cacheKey);
            if (status === 'FRESH') return cachedData;
            if (status === 'STALE') {
                this._enqueueWithDeduplication(cacheKey, method, fullUrl, data, customHeaders).catch(() => {});
                return cachedData;
            }
        } else if (method !== 'GET') {
            this.clearCache();
        }

        return this._enqueueWithDeduplication(cacheKey, method, fullUrl, data, customHeaders);
    }

    // --- FAST SUITEQL ENGINE ---
    async querySuiteQL(sqlQuery, limit = 50, offset = 0, forceRefresh = false) {
        // ERROR GUARD & TYPO FIX
        if (!process.env.NETSUITE_SUITEQL_URL) {
            throw new Error("CRITICAL SERVER ERROR: NETSUITE_SUITEQL_URL is missing from environment variables.");
        }
        
        const suiteQlBase = process.env.NETSUITE_SUITEQL_URL;
        const urlObj = new URL(suiteQlBase);
        urlObj.searchParams.append('limit', limit);
        urlObj.searchParams.append('offset', offset);

        const fullUrl = urlObj.toString();
        const normalizedSql = sqlQuery ? sqlQuery.replace(/\s+/g, ' ').trim() : '';
        const cacheKey = `SUITEQL:${fullUrl}:${normalizedSql}`;

        if (!forceRefresh) {
            const { status, data: cachedData } = this._getCacheState(cacheKey);
            if (status === 'FRESH') return cachedData;
            if (status === 'STALE') {
                this._enqueueWithDeduplication(cacheKey, 'POST', fullUrl, { q: normalizedSql }, { Prefer: 'transient' }).catch(() => {});
                return cachedData;
            }
        }

        return this._enqueueWithDeduplication(cacheKey, 'POST', fullUrl, { q: normalizedSql }, { Prefer: 'transient' });
    }
}

const netSuiteService = new NetSuiteClient();
export default netSuiteService;