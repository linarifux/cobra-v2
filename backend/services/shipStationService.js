import axios from 'axios';
import {configDotenv} from 'dotenv'
configDotenv()

// 1. Extract and securely clean environment variables
const baseURL = (process.env.SHIPSTATION_API_URL || '').replace(/\/+$/, '');
const apiKey = process.env.SHIPSTATION_API_KEY;

if (!apiKey) {
  console.warn('⚠️ WARNING: SHIPSTATION_API_KEY is missing from environment variables.');
}

// 2. Initialize the ShipStation V2 Axios Instance
export const shipStationAPI = axios.create({
  baseURL,
  headers: {
    'api-key': apiKey,
    'Content-Type': 'application/json'
  },
  timeout: 30000 
});

// 3. Centralized Error Handler
const handleApiError = (error, context) => {
  const detailedError = error.response?.data?.errors?.[0]?.message;
  const genericMessage = error.response?.data?.Message || error.response?.data?.ExceptionMessage;
  const message = detailedError || genericMessage || error.message || 'Unknown ShipStation API Error';
  
  console.error(`[ShipStation] ${context} Error:`, message);
  throw new Error(message);
};

// --- API METHODS ---

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

export const createOrder = async (orderPayload) => {
  try {
    const response = await shipStationAPI.post('/orders/createorder', orderPayload);
    return response.data;
  } catch (error) { 
    handleApiError(error, 'createOrder'); 
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

export const createShipment = async (shipmentPayload) => {
  try {
    console.log('ship to', shipmentPayload?.ship_to)
    console.log('ship from', shipmentPayload?.ship_from)
    const response = await shipStationAPI.post('/shipments', shipmentPayload);
    return response.data;
  } catch (error) { 
    handleApiError(error, 'createShipment'); 
  }
};

// --- NEW METHOD: Fetch Label via External Shipment ID ---
export const getLabelByExternalId = async (externalShipmentId) => {
  try {
    const query = new URLSearchParams({ label_download_type: 'url' }).toString();
    const response = await shipStationAPI.get(`/labels/external_shipment_id/${externalShipmentId}?${query}`);
    return response.data;
  } catch (error) {
    handleApiError(error, 'getLabelByExternalId');
  }
};