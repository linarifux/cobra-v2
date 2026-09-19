import axios from 'axios';
import {configDotenv} from 'dotenv'
configDotenv()

const baseURL = (process.env.SHIPSTATION_API_URL || '').replace(/\/+$/, '');
const apiKey = process.env.SHIPSTATION_API_KEY;

if (!apiKey) {
  console.warn('⚠️ WARNING: SHIPSTATION_API_KEY is missing from environment variables.');
}

export const shipStationAPI = axios.create({
  baseURL,
  headers: {
    'api-key': apiKey,
    'Content-Type': 'application/json'
  },
  timeout: 30000 
});

const handleApiError = (error, context) => {
  const detailedError = error.response?.data?.errors?.[0]?.message;
  const genericMessage = error.response?.data?.Message || error.response?.data?.ExceptionMessage;
  const message = detailedError || genericMessage || error.message || 'Unknown ShipStation API Error';
  
  console.error(`[ShipStation] ${context} Error:`, message);
  throw new Error(message);
};

export const getWarehouses = async () => {
  try {
    const response = await shipStationAPI.get('/warehouses');
    return response.data;
  } catch (error) { 
    handleApiError(error, 'getWarehouses'); 
  }
};

export const getCarriers = async () => {
  try {
    const response = await shipStationAPI.get('/carriers');
    return response.data;
  } catch (error) { 
    handleApiError(error, 'getCarriers'); 
  }
};

export const getCarrierPackages = async (carrierId) => {
  try {
    const response = await shipStationAPI.get(`/carriers/${carrierId}/packages`);
    return response.data;
  } catch (error) {
    handleApiError(error, 'getCarrierPackages');
  }
};

export const getOrders = async (params = {}) => {
  try {
    const response = await shipStationAPI.get('/orders', { params });
    return response.data;
  } catch (error) { 
    handleApiError(error, 'getOrders'); 
  }
};

export const getRates = async (ratePayload) => {
  try {
    const response = await shipStationAPI.post('/rates', ratePayload);
    return response.data;
  } catch (error) { 
    handleApiError(error, 'getRates'); 
  }
};




// --- FIX: Strictly structured payload for querying rates on an existing Shipment ID (v2 endpoint) ---
export const getRatesWithShipmentId = async (shipmentId, rateOptions = {}) => {
  try {
    const payload = {
      shipment_id: String(shipmentId),
      rate_options: rateOptions
    };
    
    // Explicitly targeting the /v2/rates endpoint as specified by the ShipStation example
    const response = await shipStationAPI.post('/rates', payload);
    return response.data;
  } catch (error) {
    handleApiError(error, 'getRatesWithShipmentId');
  }
};

// --- FIX: Fetch Rate Shoppers explicitly using v2 endpoint ---
export const getRateShoppers = async (params = {}) => {
  try {
    const queryParams = {
      sort_by: 'name',
      sort_dir: 'asc',
      ...params
    };
    
    // Updated to use the /v2 endpoint based on your curl example
    const response = await shipStationAPI.get('rate_shoppers', { params: queryParams });

    return response.data;
  } catch (error) {
    handleApiError(error, 'getRateShoppers');
  }
};

export const createLabel = async (labelPayload) => {
  try {
    const response = await shipStationAPI.post('/labels', labelPayload);
    return response.data;
  } catch (error) { 
    handleApiError(error, 'createLabel'); 
  }
};

export const createLabelForShipment = async (shipmentId, labelPayload) => {
  try {
    const response = await shipStationAPI.post(`/labels/shipment/${shipmentId}`, labelPayload);
    return response.data;
  } catch (error) { 
    handleApiError(error, 'createLabelForShipment'); 
  }
};

export const createShipment = async (shipmentPayload) => {
  try {
    const response = await shipStationAPI.post('/shipments', shipmentPayload);
    return response.data;
  } catch (error) { 
    handleApiError(error, 'createShipment'); 
  }
};

export const getLabelByExternalId = async (externalShipmentId) => {
  try {
    const query = new URLSearchParams({ label_download_type: 'url' }).toString();
    const response = await shipStationAPI.get(`/labels/external_shipment_id/${externalShipmentId}?${query}`);
    return response.data;
  } catch (error) {
    handleApiError(error, 'getLabelByExternalId');
  }
};

export const fetchLabelBufferAsBase64 = async (url) => {
  try {
    const response = await axios.get(url, {
      headers: { 'api-key': apiKey },
      responseType: 'arraybuffer'
    });
    return Buffer.from(response.data, 'binary').toString('base64');
  } catch (error) {
    console.error(`[ShipStation Proxy Error]: Failed to download authenticated label buffer`, error.message);
    return null;
  }
};

export const cancelShipment = async (shipmentId) => {
  try {
    const response = await shipStationAPI.put(`/shipments/${shipmentId}/cancel`, {});
    return response.data;
  } catch (error) {
    handleApiError(error, 'cancelShipment');
  }
};

export const voidLabel = async (labelId) => {
  try {
    const response = await shipStationAPI.put(`/labels/${labelId}/void`, {});
    return response.data;
  } catch (error) {
    handleApiError(error, 'voidLabel');
  }
};

export const connectUpsCarrier = async (payload) => {
  try {
    const response = await shipStationAPI.post('/connections/carriers/ups', payload);
    return response.data;
  } catch (error) {
    handleApiError(error, 'connectUpsCarrier');
  }
};

export const createTag = async (tagPayload) => {
  try {
    const response = await shipStationAPI.post('/tags', tagPayload);
    return response.data;
  } catch (error) {
    handleApiError(error, 'createTag');
  }
};

export const addTagToShipment = async (shipmentId, tagName) => {
  try {
    const response = await shipStationAPI.post(`/shipments/${shipmentId}/tags/${encodeURIComponent(tagName)}`, {});
    return response.data;
  } catch (error) {
    handleApiError(error, 'addTagToShipment');
  }
};