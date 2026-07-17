import axios from 'axios';

// 1. Extract and securely clean environment variables
// Strip any trailing slashes from the base URL to prevent double-slash route errors
const baseURL = (process.env.SHIPSTATION_API_URL || '').replace(/\/+$/, '');
const apiKey = process.env.SHIPSTATION_API_KEY;

if (!apiKey) {
  console.warn('⚠️ WARNING: SHIPSTATION_API_KEY is missing from environment variables.');
}

// 2. Initialize the ShipStation V2 Axios Instance
export const shipStationAPI = axios.create({
  baseURL, // Ensure your .env URL points to https://api.shipstation.com/v2
  headers: {
    // ShipStation V2 strictly uses the api-key header for authentication
    'api-key': apiKey,
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30-second timeout for external API reliability
});

// 3. Centralized Error Handler (Robust for V2 error arrays)
const handleApiError = (error, context) => {
  // ShipStation V2 usually places detailed validation messages inside an 'errors' array
  const detailedError = error.response?.data?.errors?.[0]?.message;
  
  // Fallbacks for generic or server-level errors
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
    const response = await shipStationAPI.post('/shipments', shipmentPayload);
    return response.data;
  } catch (error) { 
    handleApiError(error, 'createShipment'); 
  }
};