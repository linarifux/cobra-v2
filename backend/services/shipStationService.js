import axios from 'axios';

// 1. Extract and securely clean environment variables
const baseURL = process.env.SHIPSTATION_API_URL;
const apiKey = process.env.SHIPSTATION_API_KEY;

if (!apiKey) {
  console.warn('⚠️ WARNING: SHIPSTATION_API_KEY is missing from environment variables.');
}

// 2. Initialize the ShipStation V2 Axios Instance
export const shipStationAPI = axios.create({
  baseURL,
  headers: {
    // Standardized to use the api-key header for V2 authentication
    'api-key': apiKey,
  },
  timeout: 30000 // 30-second timeout for external API reliability
});

// 3. Centralized Error Handler
const handleApiError = (error, context) => {
  const message = error.response?.data?.ExceptionMessage 
    || error.response?.data?.Message 
    || error.response?.data?.errors?.[0]?.message
    || error.message 
    || 'Unknown ShipStation API Error';
  
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

// Fetch all connected carriers from ShipStation
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



// Create a shipping label for a specific order
export const createLabel = async (labelPayload) => {
  try {
    const response = await shipStationAPI.post('/labels', labelPayload);
    return response.data;
  } catch (error) { 
    handleApiError(error, 'createLabel'); 
  }
};