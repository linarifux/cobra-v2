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

        this.axiosInstance = axios.create({
            httpsAgent: new https.Agent({
                keepAlive: true,
                maxSockets: 10,
                keepAliveMsecs: 60000
            }),
            timeout: 60000
        });

        // INCREASED CONCURRENCY TO 5 FOR FASTER REST API BULK PROCESSING
        this.maxConcurrent = 5;
        this.activeRequests = 0;
        this.queue = [];

        this.cache = new Map();
        this.freshTTL = 5 * 60 * 1000;
        this.staleTTL = 30 * 60 * 1000;
        this.inFlight = new Map();
    }

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
                    ...customHeaders
                },
                data
            });

            // NetSuite returns 204 No Content with a Location header on POST / !transform writes
            if (response.status === 204 || response.data === '' || response.data === undefined) {
                const location = response.headers?.location || null;
                if (location) {
                    const idMatch = location.match(/\/(\d+)(?:\?|$)/);
                    return {
                        id: idMatch ? idMatch[1] : null,
                        location
                    };
                }
                return null;
            }

            return response.data;
        } catch (error) {
            const statusCode = error.response?.status;

            if (statusCode === 429 && retries > 0) {
                const jitterDelay = 800 + Math.floor(Math.random() * 700);
                await new Promise(res => setTimeout(res, jitterDelay));
                return this._executeAxios(method, fullUrl, data, customHeaders, retries - 1);
            }

            const nsData = error.response?.data;
            const detailedMessage =
                nsData?.['o:errorDetails']?.[0]?.detail ||
                nsData?.detail ||
                nsData?.title ||
                error.message ||
                'NetSuite Request Failed';

            console.error('NetSuite API Error:', nsData || error.message);

            // Preserve response/status on the Error object for controller status codes & retry logic
            const wrappedError = new Error(detailedMessage);
            wrappedError.status = statusCode || 500;
            wrappedError.response = error.response;
            wrappedError.details = nsData || null;
            throw wrappedError;
        }
    }

    // Used for cacheable reads (REST GET & SuiteQL)
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

    // Used for mutating REST calls (POST, PATCH, PUT, DELETE) — never cached or deduplicated
    _enqueueWrite(method, fullUrl, data, customHeaders) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                method,
                fullUrl,
                data,
                customHeaders,
                retries: 3,
                resolve: (resData) => {
                    this.clearCache();
                    resolve(resData);
                },
                reject
            });
            this._processQueue();
        });
    }

    async request(method, endpoint, params = {}, data = null, customHeaders = {}, forceRefresh = false) {
        const restApiUrl = process.env.NETSUITE_URL;
        const normalizedMethod = String(method || 'GET').toUpperCase();

        const baseUrl = `${restApiUrl.replace(/\/+$/, '')}/${(endpoint || '').replace(/^\/+/, '')}`;
        const urlObj = new URL(baseUrl);

        if (params && Object.keys(params).length > 0) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) urlObj.searchParams.append(key, value);
            });
        }

        // Keep strict URL encoding for NetSuite OAuth spaces
        const fullUrl = urlObj.toString().replace(/\+/g, '%20');

        if (normalizedMethod !== 'GET') {
            return this._enqueueWrite(normalizedMethod, fullUrl, data, customHeaders);
        }

        const cacheKey = `REST:GET:${fullUrl}`;

        if (!forceRefresh) {
            const { status, data: cachedData } = this._getCacheState(cacheKey);
            if (status === 'FRESH') return cachedData;
            if (status === 'STALE') {
                this._enqueueWithDeduplication(cacheKey, 'GET', fullUrl, null, customHeaders).catch(() => {});
                return cachedData;
            }
        }

        return this._enqueueWithDeduplication(cacheKey, 'GET', fullUrl, null, customHeaders);
    }

    async querySuiteQL(sqlQuery, limit = 1000, offset = 0, forceRefresh = false) {
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