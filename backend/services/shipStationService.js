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

export const createLabel = async (labelPayload) => {
  try {
    const response = await shipStationAPI.post('/labels', labelPayload);
    return response.data;
  } catch (error) { 
    handleApiError(error, 'createLabel'); 
  }
};

// --- FIX: Isolated Label Generator (Prevents generating split orders) ---
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

// --- FIX: Securely Proxy Authenticated ShipStation PDF Links ---
export const fetchLabelBufferAsBase64 = async (url) => {
  try {
    const response = await axios.get(url, {
      headers: { 'api-key': apiKey }, // Injects the custom API Key bypassing browser blocks
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